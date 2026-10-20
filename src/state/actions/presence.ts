import { update, get } from '../store';
import type { ManualPresence } from '@/types/models';
import { expiryAt, type StatusExpiry } from '@/domain/presence';
import { startOfKarachiDay, DAY } from '@/domain/time';
import { toast } from './ui';

export function setPresence(p: ManualPresence) {
  update(s => { s.manualPresence = p; s.lastInputAt = Date.now(); });
}
export function setCustomStatus(text: string, emoji: string | undefined, expiry: StatusExpiry) {
  const now = Date.now();
  const clean = text.trim().slice(0, 80);
  update(s => { s.customStatus = clean ? { text: clean, ...(emoji ? { emoji } : {}), ...(expiryAt(expiry, now, startOfKarachiDay(now) + DAY) ? { expiresAt: expiryAt(expiry, now, startOfKarachiDay(now) + DAY) } : {}) } : undefined; });
  toast(clean ? 'Status saved' : 'Status cleared');
}
export function clearCustomStatus() {
  const prev = get().customStatus;
  update(s => { s.customStatus = undefined; });
  toast('Status cleared', { undo: () => update(s => { s.customStatus = prev; }) });
}
/** Any user input resets the AFK timer (cheap: only writes when it changed meaningfully). */
export function touchInput() {
  const s = get();
  if (Date.now() - s.lastInputAt > 15_000) update(d => { d.lastInputAt = Date.now(); });
}
export function tick() { update(s => { s.now = Date.now(); }); }
