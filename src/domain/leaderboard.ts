import type { ActivityRecord, BoardMetric, BoardPeriod, BoardScope, PopularityEvent, ServerId, User, UserId } from '@/types/models';
import { karachiDay, startOfKarachiDay, startOfKarachiWeek } from './time';

export interface BoardQuery {
  metric: BoardMetric;
  scope: BoardScope;
  period: BoardPeriod;
  city?: string;
  serverId?: ServerId;
  friends?: UserId[];
  me: UserId;
  now: number;
}

export interface BoardRow {
  userId: UserId;
  score: number;
  boosted: number;
  rank: number; // competition ranking: 1, 2, 2, 4
  tied: boolean;
}

export interface Board {
  rows: BoardRow[];
  me: BoardRow | null; // null = not ranked (no qualifying activity in scope/period)
  since: number; // -Infinity for all-time
  until: number;
}

export function periodBounds(period: BoardPeriod, now: number): { since: number; until: number } {
  if (period === 'daily') return { since: startOfKarachiDay(now), until: now + 1 };
  if (period === 'weekly') return { since: startOfKarachiWeek(now), until: now + 1 };
  return { since: -Infinity, until: now + 1 };
}

function eligible(users: readonly User[], q: BoardQuery, memberIds?: ReadonlySet<UserId>): User[] {
  return users.filter(u => {
    if (u.bot) return false;
    if (q.scope === 'city') return u.city === q.city;
    if (q.scope === 'friends') return u.id === q.me || (q.friends ?? []).includes(u.id);
    if (q.scope === 'server') return memberIds ? memberIds.has(u.id) : true;
    return true;
  });
}

/** Filter first, then score, then sort with deterministic ties, then rank. */
export function buildBoard(
  users: readonly User[],
  events: readonly PopularityEvent[],
  activity: readonly ActivityRecord[],
  q: BoardQuery,
  serverMembers?: ReadonlySet<UserId>,
): Board {
  const { since, until } = periodBounds(q.period, q.now);
  const pool = eligible(users, q, serverMembers);
  const ids = new Set(pool.map(u => u.id));
  const score = new Map<UserId, number>();
  const boosted = new Map<UserId, number>();

  if (q.metric === 'popularity') {
    for (const e of events) {
      if (!ids.has(e.recipient) || e.at < since || e.at >= until) continue;
      if (q.scope === 'server' && e.serverId !== q.serverId) continue;
      score.set(e.recipient, (score.get(e.recipient) ?? 0) + e.points);
      if (e.paid) boosted.set(e.recipient, (boosted.get(e.recipient) ?? 0) + e.points);
    }
  } else {
    const sinceDay = Number.isFinite(since) ? karachiDay(since) : '';
    const untilDay = karachiDay(until - 1);
    for (const r of activity) {
      if (!ids.has(r.userId)) continue;
      if (q.scope === 'server' && r.serverId !== q.serverId) continue;
      if (r.day < sinceDay || r.day > untilDay) continue;
      const v = q.metric === 'messages' ? r.messages : q.metric === 'voice' ? r.voiceMinutes : r.studyMinutes;
      score.set(r.userId, (score.get(r.userId) ?? 0) + v);
    }
  }

  const name = new Map(pool.map(u => [u.id, u.name] as const));
  const scored = [...score.entries()].filter(([, s]) => s > 0);
  scored.sort((a, b) => b[1] - a[1] || (name.get(a[0]) ?? '').localeCompare(name.get(b[0]) ?? '') || a[0].localeCompare(b[0]));

  const rows: BoardRow[] = [];
  scored.forEach(([userId, s], i) => {
    const prev = rows[i - 1];
    const rank = prev && prev.score === s ? prev.rank : i + 1;
    rows.push({ userId, score: s, boosted: boosted.get(userId) ?? 0, rank, tied: false });
  });
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    r.tied = (rows[i - 1]?.rank === r.rank) || (rows[i + 1]?.rank === r.rank);
  }
  return { rows, me: rows.find(r => r.userId === q.me) ?? null, since, until };
}

/** Voice/study minutes shown as hours with one decimal. */
export const asHours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;
