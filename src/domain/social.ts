/** Social profile linking (demo). No OAuth happens: a link stores a public handle and is shown as unverified. */
export type SocialPlatform = 'instagram' | 'x' | 'youtube' | 'tiktok' | 'twitch' | 'linkedin' | 'spotify' | 'website';
export interface SocialLink { platform: SocialPlatform; handle: string; linkedAt: number; showOnProfile: boolean }

export interface PlatformDef { id: SocialPlatform; name: string; placeholder: string; pattern: RegExp; url: (h: string) => string }
const handle = (min: number, max: number, extra = '') => new RegExp(`^[A-Za-z0-9_${extra}]{${min},${max}}$`);
export const PLATFORMS: PlatformDef[] = [
  { id: 'instagram', name: 'Instagram', placeholder: 'yourname', pattern: handle(1, 30, '.'), url: h => `https://instagram.com/${h}` },
  { id: 'x', name: 'X', placeholder: 'yourname', pattern: handle(1, 15), url: h => `https://x.com/${h}` },
  { id: 'youtube', name: 'YouTube', placeholder: 'yourchannel', pattern: handle(3, 30, '.\\-'), url: h => `https://youtube.com/@${h}` },
  { id: 'tiktok', name: 'TikTok', placeholder: 'yourname', pattern: handle(2, 24, '.'), url: h => `https://tiktok.com/@${h}` },
  { id: 'twitch', name: 'Twitch', placeholder: 'yourname', pattern: handle(4, 25), url: h => `https://twitch.tv/${h}` },
  { id: 'linkedin', name: 'LinkedIn', placeholder: 'your-name', pattern: handle(3, 100, '\\-'), url: h => `https://linkedin.com/in/${h}` },
  { id: 'spotify', name: 'Spotify', placeholder: 'username', pattern: handle(1, 30, '.\\-'), url: h => `https://open.spotify.com/user/${h}` },
  { id: 'website', name: 'Website', placeholder: 'example.com', pattern: /^(?!-)[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})+(\/[\w\-./]*)?$/, url: h => `https://${h}` },
];
export const platform = (id: SocialPlatform) => PLATFORMS.find(p => p.id === id)!;

/** Normalises what people paste: full profile URLs, leading @, whitespace. */
export function normaliseHandle(id: SocialPlatform, raw: string): string {
  let v = raw.trim();
  if (id === 'website') return v.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  v = v.replace(/^https?:\/\/(www\.)?[^/]+\/(in\/|user\/)?@?/i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  return v;
}
export type HandleCheck = { ok: true; handle: string } | { ok: false; reason: 'empty' | 'format' };
export function checkHandle(id: SocialPlatform, raw: string): HandleCheck {
  const h = normaliseHandle(id, raw);
  if (!h) return { ok: false, reason: 'empty' };
  return platform(id).pattern.test(h) ? { ok: true, handle: h } : { ok: false, reason: 'format' };
}
