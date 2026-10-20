import { update, get } from '../store';
import type { BannerStyle } from '@/types/models';
import { applyChange, normalize } from '@/domain/username';
import { ME } from '@/fixtures/users';
import { toast } from './ui';
import { msg } from '@/i18n';

export interface ProfilePatch { name: string; bio: string; city: string; song: string; flag: string; bannerStyle: BannerStyle; color: string; titleId: string | undefined }

/** Saves after a short simulated round-trip; fails visibly when offline or when a failure is forced in dev tools. */
export function saveProfile(p: ProfilePatch): Promise<boolean> {
  return new Promise(resolve => {
    setTimeout(() => {
      const s = get();
      if (s.net !== 'online' || s.failNextSave) {
        update(d => { d.failNextSave = false; });
        toast(s.net !== 'online' ? msg('You’re offline. Your edits are still here; save again when you reconnect.') : msg('Couldn’t save. Your edits are still here. Try again.'), { tone: 'error' });
        resolve(false); return;
      }
      update(d => {
        const u = d.users[ME]!;
        u.name = p.name.trim(); u.bio = p.bio.trim(); u.city = p.city.trim(); u.song = p.song; u.flag = p.flag || undefined; u.bannerStyle = p.bannerStyle; u.color = p.color; u.titleId = p.titleId;
      });
      toast('Profile saved');
      resolve(true);
    }, 500);
  });
}

export type UsernameResult = { ok: true } | { ok: false; reason: 'limit' | 'unavailable' | 'same' };
export function changeUsername(next: string): UsernameResult {
  const s = get();
  const me = s.users[ME]!;
  const active = new Map(Object.values(s.users).map(u => [u.handle, u.id] as const));
  const r = applyChange(me.handle, next, ME, { active, holds: s.usernameHolds, reserved: s.reserved }, s.usernameHistory, Date.now());
  if (!r.ok) return { ok: false, reason: r.reason ?? 'unavailable' };
  update(d => { d.users[ME]!.handle = normalize(next); d.usernameHistory = r.history; d.usernameHolds = r.holds; });
  toast('Username changed. Your old name is held for you for 30 days.');
  return { ok: true };
}

export function setMedia(which: 'avatar' | 'banner', url: string | undefined) {
  const prev = get().media[which];
  if (prev && prev !== url) URL.revokeObjectURL(prev);
  update(d => { if (url) d.media[which] = url; else delete d.media[which]; });
  toast(url ? (which === 'avatar' ? msg('Profile picture updated for this session') : msg('Banner updated for this session')) : (which === 'avatar' ? msg('Profile picture removed') : msg('Banner removed')));
}

export function equip(slot: string, itemId: string | null) {
  update(d => { if (itemId) d.equipped[slot] = itemId; else delete d.equipped[slot]; if (slot === 'theme') d.prefs.skin = itemId ?? 'th-graphite'; });
  toast(itemId ? msg('Equipped') : msg('Removed'));
}
export function setTitle(id: string | undefined) { update(d => { d.users[ME]!.titleId = id; }); toast(id ? msg('Title updated') : msg('Title removed')); }

export function verifyPhone(number: string) { update(d => { d.phoneVerified = true; }); toast('Phone verified (demo). The number isn’t stored.', { vars: { n: number.length } }); }
