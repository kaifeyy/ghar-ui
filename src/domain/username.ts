import type { ReservedName, UserId, UsernameChange, UsernameHold } from '@/types/models';
import { DAY } from './time';
import { hash } from './rng';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const CHANGE_LIMIT = 2;
export const CHANGE_WINDOW_MS = 14 * DAY;
export const HOLD_MS = 30 * DAY;

export type UsernameError = 'too-short' | 'too-long' | 'charset' | 'dot-edge' | 'double-dot';

export const normalize = (raw: string) => raw.trim().replace(/^@/, '').toLowerCase();

export function validateUsername(raw: string): UsernameError | null {
  const n = normalize(raw);
  if (n.length < USERNAME_MIN) return 'too-short';
  if (n.length > USERNAME_MAX) return 'too-long';
  if (!/^[a-z0-9_.]+$/.test(n)) return 'charset';
  if (n.startsWith('.') || n.endsWith('.')) return 'dot-edge';
  if (n.includes('..')) return 'double-dot';
  return null;
}

/**
 * A small Bloom filter, mirroring the documented "definitely free / maybe taken" fast path.
 * Here it runs over local fixture names only; it is a demonstration of the UI states.
 */
export class BloomFilter {
  private bits: Uint8Array;
  constructor(private size = 4096, private k = 4) { this.bits = new Uint8Array(size); }
  private idx(s: string, i: number) { return hash(i + ':' + s) % this.size; }
  add(s: string) { for (let i = 0; i < this.k; i++) this.bits[this.idx(s, i)] = 1; }
  mightContain(s: string) { for (let i = 0; i < this.k; i++) if (!this.bits[this.idx(s, i)]) return false; return true; }
}

export type Availability =
  | { state: 'invalid'; error: UsernameError }
  | { state: 'yours' }
  | { state: 'available'; via: 'bloom' | 'confirmed' }
  | { state: 'taken' }
  | { state: 'held'; until: number }
  | { state: 'held-by-you'; until: number }
  | { state: 'reserved'; category: ReservedName['category'] };

export interface NameRegistry {
  active: ReadonlyMap<string, UserId>; // name -> owner
  holds: readonly UsernameHold[];
  reserved: readonly ReservedName[];
}

export function buildBloom(reg: NameRegistry): BloomFilter {
  const b = new BloomFilter();
  reg.active.forEach((_, n) => b.add(n));
  reg.holds.forEach(h => b.add(h.name));
  reg.reserved.forEach(r => b.add(r.name));
  return b;
}

export function checkAvailability(raw: string, me: UserId, reg: NameRegistry, now: number, bloom?: BloomFilter): Availability {
  const n = normalize(raw);
  const err = validateUsername(n);
  if (err) return { state: 'invalid', error: err };
  if (reg.active.get(n) === me) return { state: 'yours' };
  if (bloom && !bloom.mightContain(n)) return { state: 'available', via: 'bloom' };
  const res = reg.reserved.find(r => r.name === n);
  if (res) return { state: 'reserved', category: res.category };
  const hold = reg.holds.find(h => h.name === n && h.heldUntil > now);
  if (hold) return hold.previousOwner === me ? { state: 'held-by-you', until: hold.heldUntil } : { state: 'held', until: hold.heldUntil };
  if (reg.active.has(n)) return { state: 'taken' };
  return { state: 'available', via: 'confirmed' };
}

export interface ChangeAllowance { allowed: boolean; usedInWindow: number; nextAllowedAt: number | null }

/** Rolling 14-day window: a third change inside any 14 days is rejected with the next allowed date. */
export function changeAllowance(history: readonly UsernameChange[], now: number): ChangeAllowance {
  const inWindow = history.filter(h => h.changedAt > now - CHANGE_WINDOW_MS).sort((a, b) => a.changedAt - b.changedAt);
  if (inWindow.length < CHANGE_LIMIT) return { allowed: true, usedInWindow: inWindow.length, nextAllowedAt: null };
  const oldestCounting = inWindow[inWindow.length - CHANGE_LIMIT]!;
  return { allowed: false, usedInWindow: inWindow.length, nextAllowedAt: oldestCounting.changedAt + CHANGE_WINDOW_MS };
}

export interface ChangeResult {
  ok: boolean;
  reason?: 'limit' | 'unavailable' | 'same';
  history: UsernameChange[];
  holds: UsernameHold[];
}

/** Apply a username change locally: old name goes into a 30-day hold reclaimable only by its owner. */
export function applyChange(
  current: string, next: string, me: UserId, reg: NameRegistry, history: readonly UsernameChange[], now: number,
): ChangeResult {
  const n = normalize(next);
  const base = { history: [...history], holds: reg.holds.filter(h => h.heldUntil > now) };
  if (n === current) return { ok: false, reason: 'same', ...base };
  const allow = changeAllowance(history, now);
  if (!allow.allowed) return { ok: false, reason: 'limit', ...base };
  const a = checkAvailability(n, me, reg, now);
  if (!(a.state === 'available' || a.state === 'held-by-you')) return { ok: false, reason: 'unavailable', ...base };
  const holds = base.holds.filter(h => h.name !== n);
  holds.push({ name: current, previousOwner: me, heldUntil: now + HOLD_MS });
  return { ok: true, history: [...history, { oldName: current, newName: n, changedAt: now }], holds };
}
