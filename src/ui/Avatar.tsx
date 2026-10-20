import type { ShownPresence, ManualPresence } from '@/types/models';
import { useApp } from '@/state/store';
import { shownPresenceFor } from '@/state/selectors';
import { initials } from '@/domain/format';
import { useT, msg, type Key } from '@/i18n';
import { ME } from '@/fixtures/users';

export type PresenceKind = ShownPresence | ManualPresence;

export const PRESENCE_LABEL: Record<PresenceKind, Key> = {
  online: msg('Online'), idle: msg('Idle'), dnd: msg('Do Not Disturb'), invisible: msg('Invisible'), offline: msg('Offline'),
};

/** Shape + colour, never colour alone: solid circle, crescent, minus, hollow ring. */
export function PresenceIcon({ kind, size = 12, ring = true }: { kind: PresenceKind; size?: number; ring?: boolean }) {
  const s = size;
  const c = s / 2;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={`pres pres-${kind} ${ring ? 'has-ring' : ''}`} aria-hidden="true" focusable="false">
      {kind === 'online' && <circle cx={c} cy={c} r={c} fill="var(--green)" />}
      {kind === 'idle' && (
        <>
          <mask id={`moon-${s}`}><rect width={s} height={s} fill="white" /><circle cx={c * 0.55} cy={c * 0.6} r={c * 0.62} fill="black" /></mask>
          <circle cx={c} cy={c} r={c} fill="var(--idle)" mask={`url(#moon-${s})`} />
        </>
      )}
      {kind === 'dnd' && (<><circle cx={c} cy={c} r={c} fill="var(--dnd)" /><rect x={s * 0.24} y={c - s * 0.09} width={s * 0.52} height={s * 0.18} rx={s * 0.09} fill="var(--main)" /></>)}
      {(kind === 'offline' || kind === 'invisible') && <circle cx={c} cy={c} r={c - s * 0.14} fill="none" stroke="var(--offline)" strokeWidth={s * 0.26} />}
    </svg>
  );
}

export function PresenceLabel({ kind, className = '' }: { kind: PresenceKind; className?: string }) {
  const t = useT();
  return <span className={`pres-label ${className}`}><PresenceIcon kind={kind} size={10} ring={false} />{t(PRESENCE_LABEL[kind])}</span>;
}

export interface AvatarProps { userId: string; size?: 20 | 24 | 28 | 32 | 36 | 40 | 48 | 56 | 72 | 88 | 112; showPresence?: boolean; className?: string; decorative?: boolean }

export function Avatar({ userId, size = 40, showPresence = false, className = '', decorative = true }: AvatarProps) {
  const u = useApp(s => s.users[userId]);
  const presence = useApp(s => shownPresenceFor(s, userId));
  const img = useApp(s => (userId === ME ? s.media.avatar : undefined));
  const t = useT();
  const name = u?.name ?? '?';
  const color = u?.color ?? '#949BA8';
  const dot = size >= 72 ? 18 : size >= 48 ? 14 : size >= 36 ? 12 : 10;
  return (
    <span className={`av ${className}`} data-ctx="user" data-id={userId} style={{ width: size, height: size, ['--c' as string]: color }} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `${name}, ${t(PRESENCE_LABEL[presence])}`} aria-hidden={decorative ? true : undefined}>
      {img ? <img src={img} alt="" /> : <span className="av-in" style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}>{u?.bot ? 'B' : initials(name)}</span>}
      {showPresence && !u?.bot && <span className="av-pres"><PresenceIcon kind={presence} size={dot} /></span>}
    </span>
  );
}
