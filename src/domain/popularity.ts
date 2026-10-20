import type { Gift, PopularityEvent, PopularitySource, UserId } from '@/types/models';
import { startOfKarachiDay } from './time';

/**
 * Popularity accounting (frontend adaptation, not a verified external formula).
 *
 *   activity  = message + voice + reaction + event + legacy (earlier lifetime activity)
 *   gifts     = points received from gifts (free or paid)
 *   purchased = points bought directly
 *   total     = activity + gifts + purchased
 *   boosted   = points whose origin is a payment (purchased + paid gifts) — a SUBSET of total,
 *               displayed for transparency and never added to the total a second time.
 */
export interface PopularityBreakdown {
  activity: number;
  gifts: number;
  purchased: number;
  total: number;
  boosted: number;
}

export const ACTIVITY_SOURCES: readonly PopularitySource[] = ['message', 'voice', 'reaction', 'event', 'legacy'];

/** Sample policy; the PRD requires daily caps but does not fix a number. */
export interface PopularityPolicy {
  dailyActivityCap: number;
  perSource: Record<'message' | 'voice' | 'reaction' | 'event', number>;
}
export const DEFAULT_POLICY: PopularityPolicy = {
  dailyActivityCap: 300,
  perSource: { message: 2, voice: 1, reaction: 3, event: 25 }, // points per message / voice minute / reaction / event attended
};

export function breakdown(events: readonly PopularityEvent[], user: UserId, since = -Infinity, until = Infinity): PopularityBreakdown {
  const b: PopularityBreakdown = { activity: 0, gifts: 0, purchased: 0, total: 0, boosted: 0 };
  for (const e of events) {
    if (e.recipient !== user || e.at < since || e.at >= until) continue;
    if (e.source === 'gift') b.gifts += e.points;
    else if (e.source === 'purchase') b.purchased += e.points;
    else b.activity += e.points;
    if (e.paid) b.boosted += e.points;
  }
  b.total = b.activity + b.gifts + b.purchased;
  return b;
}

/** Activity points already earned by `user` on the Karachi day containing `now`. */
export function activityToday(events: readonly PopularityEvent[], user: UserId, now: number): number {
  const start = startOfKarachiDay(now);
  let sum = 0;
  for (const e of events) {
    if (e.recipient === user && e.at >= start && e.at <= now && ACTIVITY_SOURCES.includes(e.source) && e.source !== 'legacy') sum += e.points;
  }
  return sum;
}

/**
 * How many of `raw` activity points may still be awarded today under the cap.
 * Returns the awarded amount (0..raw).
 */
export function capActivity(events: readonly PopularityEvent[], user: UserId, raw: number, now: number, policy = DEFAULT_POLICY): number {
  const left = Math.max(0, policy.dailyActivityCap - activityToday(events, user, now));
  return Math.max(0, Math.min(raw, left));
}

export interface Supporter { userId: UserId; points: number; gifts: number; lastAt: number }

/** Top supporters of `user` ranked by gift points, ties broken by most recent then id. */
export function supporters(events: readonly PopularityEvent[], user: UserId, since = -Infinity): Supporter[] {
  const map = new Map<UserId, Supporter>();
  for (const e of events) {
    if (e.recipient !== user || e.source !== 'gift' || !e.sender || e.at < since) continue;
    const s = map.get(e.sender) ?? { userId: e.sender, points: 0, gifts: 0, lastAt: 0 };
    s.points += e.points;
    s.gifts += e.quantity ?? 1;
    s.lastAt = Math.max(s.lastAt, e.at);
    map.set(e.sender, s);
  }
  return [...map.values()].sort((a, b) => b.points - a.points || b.lastAt - a.lastAt || a.userId.localeCompare(b.userId));
}

export function history(events: readonly PopularityEvent[], user: UserId, limit = 20): PopularityEvent[] {
  return events.filter(e => e.recipient === user && e.source !== 'legacy').sort((a, b) => b.at - a.at).slice(0, limit);
}

export interface GiftQuote { unitPricePkr: number; totalPricePkr: number; points: number; paid: boolean; freeLeft: number }

export function quoteGift(gift: Gift, quantity: number, freeUsedToday: number): GiftQuote {
  const q = Math.max(1, Math.floor(quantity));
  if (gift.pricePkr === 0) {
    const freeLeft = Math.max(0, (gift.dailyFree ?? 1) - freeUsedToday);
    return { unitPricePkr: 0, totalPricePkr: 0, points: gift.points * Math.min(q, freeLeft), paid: false, freeLeft };
  }
  return { unitPricePkr: gift.pricePkr, totalPricePkr: gift.pricePkr * q, points: gift.points * q, paid: true, freeLeft: 0 };
}

export function freeGiftsUsedToday(events: readonly PopularityEvent[], sender: UserId, giftId: string, now: number): number {
  const start = startOfKarachiDay(now);
  return events.filter(e => e.sender === sender && e.giftId === giftId && e.at >= start).reduce((n, e) => n + (e.quantity ?? 1), 0);
}
