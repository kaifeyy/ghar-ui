import type { CustomStatus, IdleReason, ManualPresence, ShownPresence } from '@/types/models';
import { MIN } from './time';

export const AFK_AFTER_MS = 10 * MIN;

export interface EffectivePresence { shown: ManualPresence; reason?: IdleReason }

/**
 * AFK is derived: only an "online" manual choice decays to idle after inactivity.
 * Manual idle / DND / invisible are overrides and never change automatically.
 */
export function effectivePresence(manual: ManualPresence, lastInputAt: number, now: number, afkAfter = AFK_AFTER_MS): EffectivePresence {
  if (manual === 'online' && now - lastInputAt >= afkAfter) return { shown: 'idle', reason: 'afk' };
  if (manual === 'idle') return { shown: 'idle', reason: 'manual' };
  return { shown: manual };
}

/** How others see me. Invisible reads as offline; that is not a network disconnection. */
export function presenceForOthers(p: EffectivePresence): ShownPresence {
  return p.shown === 'invisible' ? 'offline' : p.shown;
}

export function activeCustomStatus(s: CustomStatus | undefined, now: number): CustomStatus | undefined {
  if (!s || !s.text.trim()) return undefined;
  if (s.expiresAt !== undefined && s.expiresAt <= now) return undefined;
  return s;
}

export type StatusExpiry = 'never' | '30m' | '1h' | '4h' | 'today';
export function expiryAt(choice: StatusExpiry, now: number, endOfDay: number): number | undefined {
  switch (choice) {
    case '30m': return now + 30 * MIN;
    case '1h': return now + 60 * MIN;
    case '4h': return now + 240 * MIN;
    case 'today': return endOfDay;
    default: return undefined;
  }
}

/** DND suppresses notification sounds and banners; mentions still collect in the Inbox. */
export const notificationsSuppressed = (shown: ManualPresence) => shown === 'dnd';
