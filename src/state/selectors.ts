import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { AppState } from './types';
import type { Channel, Server, ShownPresence, User } from '@/types/models';
import { useApp } from './store';
import { effectivePresence, presenceForOthers, activeCustomStatus } from '@/domain/presence';
import { balancePaisa, spentTodayPkr } from '@/domain/payments';
import { restrictionsFor } from '@/domain/age';
import { breakdown } from '@/domain/popularity';
import { ME } from '@/fixtures/users';

export const myPresence = (s: AppState) => effectivePresence(s.manualPresence, s.lastInputAt, s.now);

/** Presence as displayed for any user. For me, "invisible" is shown to me as Invisible (others see offline). */
export function shownPresenceFor(s: AppState, userId: string): ShownPresence | 'invisible' {
  if (userId === ME) return myPresence(s).shown;
  const u = s.users[userId];
  return u?.presence ?? 'offline';
}
export const usePresence = (userId: string) => useApp(s => shownPresenceFor(s, userId));
export const presenceOthersSee = (s: AppState) => presenceForOthers(myPresence(s));
export function useMyStatus() {
  const [shown, reason, custom] = useApp(useShallow(s => { const p = myPresence(s); return [p.shown, p.reason, activeCustomStatus(s.customStatus, s.now)] as const; }));
  return useMemo(() => ({ p: { shown, reason }, custom }), [shown, reason, custom]);
}

export const useUser = (id: string): User | undefined => useApp(s => s.users[id]);
export const useMe = (): User => useApp(s => s.users[ME]!);
export const balance = (s: AppState) => balancePaisa(s.transactions);
export const useBalancePkr = () => useApp(s => Math.round(balance(s) / 100));
export const useRestrictions = () => { const g = useApp(s => s.ageGroup); return useMemo(() => restrictionsFor(g), [g]); };
export const useSpentToday = () => useApp(s => spentTodayPkr(s.transactions, s.now));

export function usePopularity(userId: string) {
  const events = useApp(s => s.popularity);
  return useMemo(() => breakdown(events, userId), [events, userId]);
}

export const serverChannels = (s: AppState, serverId: string): Channel[] =>
  (s.servers[serverId]?.categories ?? []).flatMap(c => c.channelIds.map(id => s.channels[id]).filter((x): x is Channel => !!x));

export function canManage(s: AppState, serverId: string, perm: 'manageServer' | 'manageRoles' | 'manageChannels' | 'manageDeveloperPortal' | 'kick' | 'ban' | 'timeout' | 'manageMessages' | 'viewAudit' = 'manageServer'): boolean {
  const sv = s.servers[serverId];
  if (!sv) return false;
  if (sv.owner === ME) return true;
  const mem = sv.memberList.find(m => m.userId === ME);
  if (!mem) return false;
  return sv.roles.some(r => mem.roleIds.includes(r.id) && r.permissions.includes(perm));
}
/** Highest role position (lower = higher) the current user holds, for hierarchy checks. */
export function myTopPosition(s: AppState, serverId: string): number {
  const sv = s.servers[serverId];
  if (!sv) return 999;
  if (sv.owner === ME) return 0;
  const mem = sv.memberList.find(m => m.userId === ME);
  const positions = sv.roles.filter(r => mem?.roleIds.includes(r.id)).map(r => r.position);
  return positions.length ? Math.min(...positions) : 99;
}

export function channelLocked(s: AppState, c: Channel): false | 'role' | 'password' | 'payment' {
  if (!c.lock || s.unlocked[c.id]) return false;
  if (c.lock.kind === 'role') {
    const sv = s.servers[c.serverId];
    const mem = sv?.memberList.find(m => m.userId === ME);
    const role = c.lock.roleId;
    const myRoles = sv?.roles.filter(r => mem?.roleIds.includes(r.id)) ?? [];
    const target = sv?.roles.find(r => r.id === role);
    if (sv?.owner === ME || mem?.roleIds.includes(role) || (target && myRoles.some(r => r.position < target.position))) return false;
    return 'role';
  }
  return c.lock.kind;
}

export function unreadForChannel(s: AppState, channelId: string): { count: number; mention: boolean } {
  const list = s.messages[channelId] ?? [];
  const read = s.readAt[channelId] ?? 0;
  const me = s.users[ME]!;
  let count = 0, mention = false;
  for (const m of list) if (m.at > read && m.author !== ME && !m.system) { count++; if (m.text.includes('@' + me.handle) || m.text.includes('@everyone')) mention = true; }
  return { count, mention };
}

export const serverOf = (s: AppState, channelId: string): Server | undefined => { const c = s.channels[channelId]; return c ? s.servers[c.serverId] : undefined; };
export const displayName = (s: AppState, id: string) => s.users[id]?.name ?? id;
