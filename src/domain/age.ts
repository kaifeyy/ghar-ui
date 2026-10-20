import type { AgeGroup, RelationshipType } from '@/types/models';

export type AgeCheck = { ok: true; group: AgeGroup; age: number } | { ok: false; reason: 'under-13' | 'invalid' };

export function ageOn(dobIso: string, now: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobIso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const today = new Date(now);
  if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d)) age -= 1;
  return age;
}

export function checkAge(dobIso: string, now: number): AgeCheck {
  const age = ageOn(dobIso, now);
  if (age === null || age > 120) return { ok: false, reason: 'invalid' };
  if (age < 13) return { ok: false, reason: 'under-13' };
  return { ok: true, group: age < 18 ? 'minor' : 'adult', age };
}

/** Frontend restrictions for under-18 accounts (ACC-15, SOC-09, PRD §5). Spending cap is a configurable sample value. */
export interface Restrictions {
  partnerRelationship: boolean;
  payouts: boolean;
  dailySpendCapPkr: number | null;
  dmsFromNonFriendsDefault: boolean;
  lastSeenVisibleDefault: boolean;
  storyAudienceDefault: 'everyone' | 'friends';
  sponsorship: boolean;
}

export const MINOR_DAILY_SPEND_CAP_PKR = 2000;

export function restrictionsFor(group: AgeGroup): Restrictions {
  if (group === 'minor') {
    return {
      partnerRelationship: false, payouts: false, dailySpendCapPkr: MINOR_DAILY_SPEND_CAP_PKR,
      dmsFromNonFriendsDefault: false, lastSeenVisibleDefault: false, storyAudienceDefault: 'friends', sponsorship: false,
    };
  }
  return {
    partnerRelationship: true, payouts: true, dailySpendCapPkr: null,
    dmsFromNonFriendsDefault: true, lastSeenVisibleDefault: true, storyAudienceDefault: 'everyone', sponsorship: true,
  };
}

export type SpendCheck = { ok: true } | { ok: false; reason: 'minor-cap'; remainingPkr: number } | { ok: false; reason: 'balance' };

export function checkSpend(group: AgeGroup, spentTodayPkr: number, amountPkr: number, balancePkr: number): SpendCheck {
  if (amountPkr > balancePkr) return { ok: false, reason: 'balance' };
  const cap = restrictionsFor(group).dailySpendCapPkr;
  if (cap !== null && spentTodayPkr + amountPkr > cap) return { ok: false, reason: 'minor-cap', remainingPkr: Math.max(0, cap - spentTodayPkr) };
  return { ok: true };
}

export function relationshipAllowed(group: AgeGroup, type: RelationshipType): boolean {
  return !(type === 'partner' && !restrictionsFor(group).partnerRelationship);
}
