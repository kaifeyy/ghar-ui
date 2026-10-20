import { useState } from 'react';
import { Camera, AtSign, SquarePlay, Clapperboard, Tv, Briefcase, Music2, Globe, ExternalLink, Link2, Unlink, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useApp } from '@/state/store';
import { EMPTY } from '@/state/store';
import { openModal, closeModal } from '@/state/actions/ui';
import { linkSocial, unlinkSocial, setSocialVisible } from '@/state/actions/social';
import { PLATFORMS, platform, checkHandle, type SocialPlatform } from '@/domain/social';
import { useT } from '@/i18n';
import { Button } from '@/ui/Button';
import { TextField, Toggle } from '@/ui/Form';
import { Dialog } from '@/ui/Overlay';
import { Note, Tag } from '@/ui/Misc';

/** One generic icon per platform (the app uses a single icon family and no brand logos). */
export const PLATFORM_ICON: Record<SocialPlatform, LucideIcon> = { instagram: Camera, x: AtSign, youtube: SquarePlay, tiktok: Clapperboard, twitch: Tv, linkedin: Briefcase, spotify: Music2, website: Globe };

/** Manage linked profiles for a user (owner = user id) or a community (owner = `server:<id>`). */
export function SocialLinksManager({ owner, subject }: { owner: string; subject: 'you' | 'community' }) {
  const t = useT();
  const links = useApp(s => s.socialLinks[owner] ?? EMPTY);
  return (
    <div className="col g12">
      <Note tone="info" title={t('Demo connections')}>
        {subject === 'you'
          ? t('Nothing signs in to these services here. A linked profile shows the public handle you enter and is marked Unverified. Real connections need sign-in with each service, which this frontend doesn’t have.')
          : t('Nothing signs in to these services here. Linked community profiles show the handle you enter and are marked Unverified.')}
      </Note>
      <ul className="social-list">
        {PLATFORMS.map(p => {
          const l = links.find(x => x.platform === p.id);
          const I = PLATFORM_ICON[p.id];
          return (
            <li key={p.id} className={`social-row ${l ? 'is-linked' : ''}`}>
              <span className="social-ic"><I size={20} aria-hidden="true" /></span>
              <span className="grow social-main">
                <b>{p.name}</b>
                {l ? <span className="row g8 wrap"><span className="meta ltr ellip">{p.id === 'website' ? l.handle : '@' + l.handle}</span><Tag tone="outline" icon={ShieldAlert}>{t('Unverified · demo')}</Tag></span>
                  : <span className="meta">{t('Not connected')}</span>}
              </span>
              {l ? (
                <span className="social-actions">
                  <Toggle label={<span className="sr">{t('Show {platform} on profile', { platform: p.name })}</span>} checked={l.showOnProfile} onChange={v => setSocialVisible(owner, p.id, v)} />
                  <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => openModal({ kind: 'externalLink', href: p.url(l.handle) })}>{t('Open')}</Button>
                  <Button size="sm" variant="danger-ghost" icon={Unlink} onClick={() => unlinkSocial(owner, p.id)}>{t('Disconnect')}</Button>
                </span>
              ) : <Button size="sm" icon={Link2} onClick={() => openModal({ kind: 'connectSocial', owner, platform: p.id })}>{t('Connect')}</Button>}
            </li>
          );
        })}
      </ul>
      {links.length > 0 && <p className="meta">{t('The switch controls whether a linked profile appears on the public profile.')}</p>}
    </div>
  );
}

export function ConnectSocialModal({ owner, platform: id }: { owner: string; platform: SocialPlatform }) {
  const t = useT();
  const p = platform(id);
  const [v, setV] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(true);
  const c = checkHandle(id, v);
  const err = touched && !c.ok ? (c.reason === 'empty' ? t('Enter your {platform} handle or profile link.', { platform: p.name }) : t('That doesn’t look like a valid {platform} handle.', { platform: p.name })) : null;
  const I = PLATFORM_ICON[id];
  const submit = async () => {
    setTouched(true);
    if (!c.ok || busy) return;
    setBusy(true);
    await linkSocial(owner, { platform: id, handle: c.handle, showOnProfile: show });
    setBusy(false);
    closeModal();
  };
  return (
    <Dialog title={t('Connect {platform}', { platform: p.name })} onClose={closeModal} size="sm" busy={busy} onSubmit={submit}
      footer={<><Button onClick={closeModal} disabled={busy}>{t('Cancel')}</Button><Button type="submit" variant="primary" loading={busy} icon={Link2}>{busy ? t('Connecting…') : t('Connect')}</Button></>}>
      <div className="row g12"><span className="social-ic lg"><I size={24} aria-hidden="true" /></span><p className="small muted grow">{t('In the real app you’d sign in with {platform} to prove the account is yours. This demo can’t do that, so the link is shown as Unverified and nothing is sent to {platform}.', { platform: p.name })}</p></div>
      <TextField label={id === 'website' ? t('Website address') : t('{platform} handle', { platform: p.name })} prefix={id === 'website' ? 'https://' : '@'} placeholder={p.placeholder} value={v} dir="ltr" autoFocus
        onChange={e => setV(e.target.value)} onBlur={() => setTouched(true)} error={err} ok={c.ok ? p.url(c.handle) : null} hint={t('You can paste a full profile link.')} spellCheck={false} autoComplete="off" />
      <Toggle label={t('Show on profile')} checked={show} onChange={setShow} />
    </Dialog>
  );
}

/** Read-only chips for profiles and community pages. Only links set to show on profile. */
export function SocialChips({ owner }: { owner: string }) {
  const t = useT();
  const links = useApp(s => s.socialLinks[owner] ?? EMPTY);
  const shown = links.filter(l => l.showOnProfile);
  if (!shown.length) return null;
  return (
    <ul className="social-chips" aria-label={t('Linked profiles')}>
      {shown.map(l => { const p = platform(l.platform); const I = PLATFORM_ICON[l.platform]; return (
        <li key={l.platform}><button type="button" className="chip-link social-chip" onClick={() => openModal({ kind: 'externalLink', href: p.url(l.handle) })} data-tip={t('{platform} · unverified demo link', { platform: p.name })}>
          <I size={16} aria-hidden="true" /><span className="ltr ellip">{l.platform === 'website' ? l.handle : '@' + l.handle}</span><span className="sr">{t('{platform} · unverified demo link', { platform: p.name })}</span>
        </button></li>
      ); })}
    </ul>
  );
}
