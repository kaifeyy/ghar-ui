import { useState } from 'react';
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

const DEMO_AVATARS: Record<string, string> = {
  me: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F8f9dcc2d32b74f398260b74ec12171a1?format=webp&width=800&height=1200',
  ayesha: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F9a92acfbf684440e9a927008c2683116?format=webp&width=800&height=1200',
  hamza: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2Fcd524d1dd5244b09a7127a9379f4828c?format=webp&width=800&height=1200',
  zainab: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F83c85d6ae2924480aae3bd1b94ceebc7?format=webp&width=800&height=1200',
  bilal: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F4fc987d5c2c64a1b895f6a7da1d30db4?format=webp&width=800&height=1200',
  usman: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2Ff848e3faa143441c864b367aacac3ba9?format=webp&width=800&height=1200',
  fatima: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F1a503e226a474bc590966cf97cc9c485?format=webp&width=800&height=1200',
  ali: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F10c9da4fca0b478fa438dffea0537b0c?format=webp&width=800&height=1200',
  sana: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F9f272e060aa94ce8988117d76050a5ab?format=webp&width=800&height=1200',
  omar: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F573067b285924199906ceb91f7505f86?format=webp&width=800&height=1200',
  danish: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F179458c6b31e4af1a5d3c1d84d6ae525?format=webp&width=800&height=1200',
  hira: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2Fbe9a531c4d6047babce3431bf43fd878?format=webp&width=800&height=1200',
  sara: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F62be4db3ea654911b483a96b2444f0a2?format=webp&width=800&height=1200',
  mahnoor: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F6df18c61341b4b8ea7dcb23eaef7965b?format=webp&width=800&height=1200',
  saad: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F8f9dcc2d32b74f398260b74ec12171a1?format=webp&width=800&height=1200',
  areeba: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2F9a92acfbf684440e9a927008c2683116?format=webp&width=800&height=1200',
  yusuf: 'https://cdn.builder.io/api/v1/image/assets%2F7fa41e79184d4deb97b5ed88958c7cfc%2Fcd524d1dd5244b09a7127a9379f4828c?format=webp&width=800&height=1200',
};

export function Avatar({ userId, size = 40, showPresence = false, className = '', decorative = true }: AvatarProps) {
  const u = useApp(s => s.users[userId]);
  const presence = useApp(s => shownPresenceFor(s, userId));
  const uploaded = useApp(s => (userId === ME ? s.media.avatar : undefined));
  const img = uploaded ?? DEMO_AVATARS[userId];
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const t = useT();
  const name = u?.name ?? '?';
  const color = u?.color ?? '#949BA8';
  const dot = size >= 72 ? 18 : size >= 48 ? 14 : size >= 36 ? 12 : 10;
  return (
    <span className={`av ${className}`} data-ctx="user" data-id={userId} style={{ width: size, height: size, ['--c' as string]: color }} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `${name}, ${t(PRESENCE_LABEL[presence])}`} aria-hidden={decorative ? true : undefined}>
      {img && img !== failedSrc ? <img src={img} alt="" onError={() => setFailedSrc(img)} /> : <span className="av-in" style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}>{u?.bot ? 'B' : initials(name)}</span>}
      {showPresence && !u?.bot && <span className="av-pres"><PresenceIcon kind={presence} size={dot} /></span>}
    </span>
  );
}
