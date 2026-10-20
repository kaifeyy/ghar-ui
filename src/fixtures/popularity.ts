import type { ActivityRecord, Gift, PopularityEvent } from '@/types/models';
import { DAY, HOUR, karachiDay, startOfKarachiDay } from '@/domain/time';
import { rng } from '@/domain/rng';
import { DEFAULT_POLICY } from '@/domain/popularity';
import { BOOT, ME } from './users';

export const GIFTS: Gift[] = [
  { id: 'chai', name: 'Chai', points: 5, pricePkr: 0, art: 'chai', dailyFree: 1 },
  { id: 'heart', name: 'Heart', points: 50, pricePkr: 90, art: 'heart' },
  { id: 'rose', name: 'Rose', points: 120, pricePkr: 200, art: 'rose' },
  { id: 'star', name: 'Star', points: 300, pricePkr: 480, art: 'star' },
  { id: 'rocket', name: 'Rocket', points: 800, pricePkr: 1200, art: 'rocket' },
  { id: 'crown', name: 'Crown', points: 2000, pricePkr: 2900, art: 'crown' },
];

export const POINT_PACKS = [
  { id: 'p500', points: 500, pricePkr: 450 },
  { id: 'p1500', points: 1500, pricePkr: 1250 },
  { id: 'p5000', points: 5000, pricePkr: 3900 },
];

/** Per-user activity profile: [lifetime baseline points, msgs/day, voice min/day, study min/day, home servers] */
const PROFILES: Record<string, [number, number, number, number, string[]]> = {
  me: [7600, 40, 55, 20, ['tc', 'kd', 'sp']],
  ayesha: [19000, 70, 120, 150, ['tc', 'fp', 'cc']],
  hamza: [9000, 55, 80, 60, ['tc', 'kd']],
  zainab: [15000, 35, 60, 90, ['tc', 'fp']],
  bilal: [25000, 45, 140, 0, ['tc']],
  usman: [2500, 20, 30, 15, ['tc', 'fp']],
  fatima: [5500, 50, 20, 70, ['tc']],
  ali: [17000, 60, 40, 10, ['kd', 'sp', 'tc']],
  sana: [600, 25, 15, 5, ['kd', 'sp']],
  omar: [2600, 10, 5, 0, ['kd']],
  danish: [1500, 8, 10, 0, ['sp']],
  hira: [30000, 30, 160, 200, ['fp', 'cc']],
  sara: [12000, 15, 70, 0, ['cc', 'tc']],
  mahnoor: [40000, 20, 90, 0, ['tc']],
  saad: [36000, 12, 40, 0, ['tc']],
  areeba: [900, 5, 0, 0, ['tc']],
  yusuf: [1200, 12, 20, 10, ['tc']],
};

const DAYS = 30;

function generate(): { events: PopularityEvent[]; activity: ActivityRecord[] } {
  const events: PopularityEvent[] = [];
  const activity: ActivityRecord[] = [];
  const today = startOfKarachiDay(BOOT);
  let id = 0;
  for (const [user, [base, msgs, voice, study, servers]] of Object.entries(PROFILES)) {
    events.push({ id: `pe${++id}`, recipient: user, at: today - (DAYS + 5) * DAY, source: 'legacy', points: base, paid: false, note: 'Activity before this demo’s 30-day window' });
    for (let d = DAYS - 1; d >= 0; d--) {
      const dayStart = today - d * DAY;
      const r = rng(`${user}:${d}`);
      const active = r() > 0.18 || d === 0;
      if (!active) continue;
      // hours elapsed today limit today's activity so "today" stays plausible
      const frac = d === 0 ? Math.min(1, (BOOT - dayStart) / DAY) : 1;
      let capLeft = DEFAULT_POLICY.dailyActivityCap;
      for (const sv of servers) {
        const share = 1 / servers.length;
        const m = Math.round(msgs * share * (0.4 + r() * 1.2) * frac);
        const v = Math.round(voice * share * (0.2 + r() * 1.6) * frac);
        const s = Math.round(study * share * (0.2 + r() * 1.6) * frac);
        if (m + v + s > 0) activity.push({ userId: user, serverId: sv, day: karachiDay(dayStart + HOUR), messages: m, voiceMinutes: v, studyMinutes: s });
        const at = Math.min(BOOT - 60_000, dayStart + Math.floor((0.3 + r() * 0.65) * DAY * frac));
        const award = (source: PopularityEvent['source'], raw: number) => {
          const pts = Math.min(raw, capLeft);
          if (pts <= 0) return;
          capLeft -= pts;
          events.push({ id: `pe${++id}`, recipient: user, at, source, points: pts, paid: false, serverId: sv });
        };
        award('message', m * DEFAULT_POLICY.perSource.message);
        award('voice', v * DEFAULT_POLICY.perSource.voice);
        award('reaction', Math.round(r() * 8) * DEFAULT_POLICY.perSource.reaction);
      }
    }
  }
  // gifts between users (sender, recipient, giftId, qty, hours ago)
  const gifts: [string, string, string, number, number][] = [
    ['hamza', ME, 'heart', 3, 28], ['ayesha', ME, 'rose', 2, 50], ['zainab', ME, 'chai', 1, 3], ['bilal', ME, 'star', 1, 120], ['ali', ME, 'heart', 1, 200],
    ['me', 'ayesha', 'heart', 3, 70], ['hamza', 'ayesha', 'rocket', 1, 30], ['zainab', 'ayesha', 'rose', 1, 10],
    ['saad', 'mahnoor', 'crown', 1, 40], ['bilal', 'mahnoor', 'star', 2, 20], ['usman', 'hira', 'chai', 1, 5], ['ayesha', 'hira', 'rose', 2, 60],
    ['fatima', 'zainab', 'heart', 2, 15], ['ali', 'sana', 'heart', 1, 4],
  ];
  for (const [sender, recipient, giftId, qty, hAgo] of gifts) {
    const g = GIFTS.find(x => x.id === giftId)!;
    events.push({ id: `pe${++id}`, recipient, sender, at: BOOT - hAgo * HOUR, source: 'gift', giftId, quantity: qty, points: g.points * qty, paid: g.pricePkr > 0 });
  }
  // directly purchased points (Boosted)
  events.push({ id: `pe${++id}`, recipient: ME, at: BOOT - 9 * DAY, source: 'purchase', points: 500, paid: true });
  events.push({ id: `pe${++id}`, recipient: 'saad', at: BOOT - 2 * DAY, source: 'purchase', points: 5000, paid: true });
  // an attended event
  events.push({ id: `pe${++id}`, recipient: ME, at: BOOT - 6 * DAY, source: 'event', points: 25, paid: false, serverId: 'tc', note: 'Friday Open Mic' });
  return { events, activity };
}

const gen = generate();
export const POPULARITY_EVENTS = gen.events;
export const ACTIVITY_RECORDS = gen.activity;
