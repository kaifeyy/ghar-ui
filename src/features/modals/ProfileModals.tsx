import { useShallow } from 'zustand/react/shallow';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload, Check, ShieldCheck, Smartphone } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { closeModal, replaceModal, toast } from '@/state/actions/ui';
import { postStory, updateAudience, addToHighlight } from '@/state/actions/stories';
import { setMedia, verifyPhone } from '@/state/actions/profile';
import { deleteAccountDemo } from '@/state/actions/auth';
import { useT, msg, type Key } from '@/i18n';
import type { StoryAudience } from '@/types/models';
import { audiencePreview } from '@/domain/stories';
import { Dialog } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { Checkbox, RadioList, Select, TextField } from '@/ui/Form';
import { Art } from '@/ui/Art';
import { Avatar } from '@/ui/Avatar';
import { DemoTag, Note } from '@/ui/Misc';
import { useRestrictions } from '@/state/selectors';

const IMG_TYPES = /^image\/(png|jpe?g|webp)$/;
export type ImgCheck = { ok: true; url: string; w: number; h: number } | { ok: false; error: Key };

/** Validates a local image (type, size, dimensions) and returns an in-memory object URL. Never uploaded or persisted. */
export function readImage(f: File, opts: { maxBytes: number; minW: number; minH: number }): Promise<ImgCheck> {
  return new Promise(resolve => {
    if (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)) return resolve({ ok: false, error: msg('SVG files can’t be uploaded.') });
    if (!IMG_TYPES.test(f.type)) return resolve({ ok: false, error: msg('Use a PNG, JPEG or WebP image.') });
    if (f.size > opts.maxBytes) return resolve({ ok: false, error: msg('That image is too large.') });
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < opts.minW || img.naturalHeight < opts.minH) { URL.revokeObjectURL(url); resolve({ ok: false, error: msg('That image is too small.') }); }
      else resolve({ ok: true, url, w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, error: msg('That file couldn’t be read as an image.') }); };
    img.src = url;
  });
}

const AUD: Record<StoryAudience, Key> = { everyone: msg('Everyone'), friends: msg('Friends'), close: msg('Close friends'), custom: msg('Custom') };

function AudienceFields({ audience, setAudience, custom, setCustom, hidden, setHidden }: { audience: StoryAudience; setAudience: (a: StoryAudience) => void; custom: string[]; setCustom: (x: string[]) => void; hidden: string[]; setHidden: (x: string[]) => void }) {
  const t = useT();
  const friends = useApp(s => s.friends);
  const close = useApp(s => s.closeFriends);
  const users = useApp(s => s.users);
  const preview = useMemo(() => audiencePreview({ audience, customIds: custom, hiddenFrom: hidden }, friends, friends, close), [audience, custom, hidden, friends, close]);
  const toggle = (list: string[], set: (x: string[]) => void, id: string, on: boolean) => set(on ? [...list, id] : list.filter(x => x !== id));
  return (
    <>
      <RadioList name="aud" legend={t('Who can see it')} variant="segmented" value={audience} onChange={setAudience} options={(Object.keys(AUD) as StoryAudience[]).map(a => ({ value: a, label: t(AUD[a]) }))} />
      {audience === 'close' && <p className="meta">{t('Close friends: {names}', { names: close.map(c => users[c]?.name).join(', ') || t('none yet') })}</p>}
      {audience === 'custom' && (
        <fieldset className="col g4 pick-box"><legend className="flabel">{t('Only these people')}</legend>
          {friends.map(f => <Checkbox key={f} label={users[f]?.name ?? f} checked={custom.includes(f)} onChange={v => toggle(custom, setCustom, f, v)} />)}
        </fieldset>
      )}
      <details className="disclose">
        <summary>{t('Hide from specific people ({n})', { n: hidden.length })}</summary>
        <div className="col g4 pick-box">{friends.map(f => <Checkbox key={f} label={users[f]?.name ?? f} checked={hidden.includes(f)} onChange={v => toggle(hidden, setHidden, f, v)} />)}</div>
      </details>
      <p className="meta" aria-live="polite">{t('{n} friends can see this story.', { n: preview.length })}</p>
    </>
  );
}

export function PostStoryModal() {
  const t = useT();
  const def = useApp(s => s.prefs.storyAudienceDefault);
  const r = useRestrictions();
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<StoryAudience>(def === 'everyone' && r.storyAudienceDefault === 'friends' ? 'friends' : def);
  const [custom, setCustom] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const file = useRef<HTMLInputElement>(null);
  const onFile = async (f?: File) => { if (!f) return; const res = await readImage(f, { maxBytes: 8 * 1024 * 1024, minW: 200, minH: 200 }); if (res.ok) { if (url) URL.revokeObjectURL(url); setUrl(res.url); setErr(null); } else setErr(t(res.error)); };
  const submit = () => {
    if (!url) { setErr(t('Choose a photo. Stories are images only.')); return; }
    if (audience === 'custom' && !custom.length) { setErr(t('Pick at least one person for a custom audience.')); return; }
    postStory({ url, caption: caption.trim(), audience, customIds: custom, hiddenFrom: hidden });
    closeModal();
  };
  return (
    <Dialog title={t('Post a story')} description={t('Images only. It disappears after 24 hours unless you add it to a highlight.')} onClose={closeModal} onSubmit={submit} size="lg" className="story-post-dlg"
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary" disabled={!url}>{t('Share story')}</Button></>}>
      <div className="story-compose">
        <div className="story-frame">
          {url ? <img src={url} alt={t('Your chosen photo')} /> : <div className="story-empty-prompt"><ImagePlus size={26} aria-hidden="true" /><span>{t('Choose photo')}</span></div>}
          {caption && <span className="story-cap">{caption}</span>}
        </div>
        <div className="col g12 grow">
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="row g8 wrap">
            <Button icon={url ? Upload : ImagePlus} onClick={() => file.current?.click()}>{url ? t('Replace photo') : t('Choose photo')}</Button>
            {url && <Button variant="ghost" icon={Trash2} onClick={() => { URL.revokeObjectURL(url); setUrl(null); }}>{t('Remove')}</Button>}
          </div>
          <p className="meta">{t('PNG, JPEG or WebP up to 8 MB. Your photo stays in this browser tab and is never uploaded.')}</p>
          {err && <p className="ferr" role="alert">{err}</p>}
          <TextField label={t('Caption (optional)')} value={caption} onChange={e => setCaption(e.target.value)} maxLength={80} />
          <section className="story-privacy"><h3>{t('Privacy')}</h3><AudienceFields {...{ audience, setAudience, custom, setCustom, hidden, setHidden }} /></section>
        </div>
      </div>
    </Dialog>
  );
}

export function StoryAudienceModal({ storyId }: { storyId: string }) {
  const t = useT();
  const st = useApp(s => s.stories.find(x => x.id === storyId));
  const [audience, setAudience] = useState<StoryAudience>(st?.audience ?? 'friends');
  const [custom, setCustom] = useState<string[]>(st?.customIds ?? []);
  const [hidden, setHidden] = useState<string[]>(st?.hiddenFrom ?? []);
  if (!st) return null;
  return (
    <Dialog title={t('Story audience')} onClose={closeModal} onSubmit={() => { updateAudience(storyId, audience, custom, hidden); closeModal(); }} size="md" footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{t('Save')}</Button></>}>
      <AudienceFields {...{ audience, setAudience, custom, setCustom, hidden, setHidden }} />
    </Dialog>
  );
}

export function HighlightModal({ storyId }: { storyId: string }) {
  const t = useT();
  const highlights = useApp(useShallow(s => s.highlights.filter(h => h.owner === 'me')));
  const [mode, setMode] = useState<'existing' | 'new'>(highlights.length ? 'existing' : 'new');
  const [hid, setHid] = useState(highlights[0]?.id ?? '');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog title={t('Add to highlight')} description={t('Highlights stay on your profile after the story expires.')} onClose={closeModal} size="sm"
      onSubmit={() => { if (mode === 'new' && name.trim().length < 1) { setErr(t('Name the highlight.')); return; } addToHighlight(storyId, mode === 'new' ? { name } : { id: hid }); closeModal(); }}
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{t('Save')}</Button></>}>
      {highlights.length > 0 && <RadioList name="hmode" legend={t('Highlight')} variant="segmented" value={mode} onChange={setMode} options={[{ value: 'existing', label: t('Existing') }, { value: 'new', label: t('New') }]} />}
      {mode === 'existing' ? <Select label={t('Choose')} value={hid} onValue={setHid} options={highlights.map(h => [h.id, `${h.name} (${h.storyIds.length})`] as const)} />
        : <TextField label={t('Highlight name')} value={name} onChange={e => { setName(e.target.value); setErr(null); }} error={err} maxLength={24} autoFocus />}
    </Dialog>
  );
}

export function ProfileMediaModal({ which }: { which: 'avatar' | 'banner' }) {
  const t = useT();
  const current = useApp(s => s.media[which]);
  const color = useApp(s => s.users.me!.color);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const spec = which === 'avatar' ? { maxBytes: 5 * 1024 * 1024, minW: 128, minH: 128 } : { maxBytes: 8 * 1024 * 1024, minW: 600, minH: 200 };
  const onFile = async (f?: File) => { if (!f) return; const r = await readImage(f, spec); if (r.ok) { setUrl(r.url); setErr(null); } else setErr(t(r.error)); };
  const shown = url ?? current;
  return (
    <Dialog title={which === 'avatar' ? t('Profile picture') : t('Profile banner')} onClose={closeModal} size="md"
      onSubmit={() => { if (url) { setMedia(which, url); closeModal(); } }}
      footer={<>{current && <Button variant="danger-ghost" icon={Trash2} onClick={() => { setMedia(which, undefined); closeModal(); }}>{t('Remove current')}</Button>}<span className="grow" /><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary" disabled={!url}>{t('Use this image')}</Button></>}>
      <div className={`media-preview is-${which}`}>
        {which === 'banner' ? (shown ? <img src={shown} alt={t('Banner preview')} /> : <Art seed="me-banner" color={color} w={600} h={200} />) : (shown ? <img src={shown} alt={t('Picture preview')} className="round" /> : <Avatar userId="me" size={112} />)}
      </div>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <Button icon={Upload} onClick={() => file.current?.click()}>{shown ? t('Choose a different image') : t('Choose image')}</Button>
      <p className="meta">{which === 'avatar' ? t('PNG, JPEG or WebP, at least 128 × 128, up to 5 MB. Shown as a circle.') : t('PNG, JPEG or WebP, at least 600 × 200, up to 8 MB.')} {t('The real app compresses images to WebP. Here the image stays in this tab only.')}</p>
      {err && <p className="ferr" role="alert">{err}</p>}
    </Dialog>
  );
}

export function DeleteAccountModal() {
  const t = useT();
  const handle = useApp(s => s.users.me!.handle);
  const [v, setV] = useState('');
  return (
    <Dialog title={t('Delete account')} role="alertdialog" onClose={closeModal} size="sm" onSubmit={() => { if (v === handle) { closeModal(); deleteAccountDemo(); } }}
      footer={<><Button onClick={closeModal} data-autofocus>{t('Cancel')}</Button><Button type="submit" variant="danger" disabled={v !== handle}>{t('Delete account')}</Button></>}>
      <p>{t('This removes your profile, messages and wallet history. Withdraw any wallet balance first.')}</p>
      <TextField label={t('Type your username to confirm')} prefix="@" value={v} onChange={e => setV(e.target.value)} autoComplete="off" />
      <DemoTag>{t('Demo: clears this browser session only')}</DemoTag>
    </Dialog>
  );
}

export function PasswordModal() {
  const t = useT();
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [conf, setConf] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const strength = next.length >= 12 && /\d/.test(next) && /[A-Za-z]/.test(next) ? 2 : next.length >= 8 ? 1 : 0;
  const submit = () => {
    const e: Record<string, string> = {};
    if (!cur) e.cur = t('Enter your current password.');
    if (next.length < 8) e.next = t('Use at least 8 characters.');
    if (conf !== next) e.conf = t('Passwords don’t match.');
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    setCur(''); setNext(''); setConf(''); closeModal();
    toast('No account service is connected, so your password wasn’t changed. Nothing was stored.', { tone: 'info' });
  };
  return (
    <Dialog title={t('Change password')} description={t('Passwords are checked here and never stored or sent in this prototype.')} onClose={closeModal} onSubmit={submit} size="sm" footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{t('Change password')}</Button></>}>
      <TextField label={t('Current password')} type="password" autoComplete="current-password" value={cur} onChange={e => setCur(e.target.value)} error={errs.cur} />
      <TextField label={t('New password')} type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} error={errs.next} hint={[t('Weak'), t('OK'), t('Strong')][strength]} />
      <TextField label={t('Confirm new password')} type="password" autoComplete="new-password" value={conf} onChange={e => setConf(e.target.value)} error={errs.conf} />
    </Dialog>
  );
}

/** Phone OTP demo (ACC-03): countdown, wrong code, expiry, resend. Codes are never stored. */
export function VerifyPhoneModal() {
  const t = useT();
  const [step, setStep] = useState<'number' | 'code'>('number');
  const [num, setNum] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [expires, setExpires] = useState(0);
  const [attempts, setAttempts] = useState(0);
  useEffect(() => { if (step !== 'code') return; const i = setInterval(() => { setResendIn(x => Math.max(0, x - 1)); setExpires(x => Math.max(0, x - 1)); }, 1000); return () => clearInterval(i); }, [step]);
  const sendCode = () => {
    const d = num.replace(/\D/g, '');
    if (!/^3\d{9}$/.test(d)) { setErr(t('Enter 10 digits starting with 3, like 300 1234567.')); return; }
    setErr(null); setStep('code'); setResendIn(42); setExpires(300); setAttempts(0); setCode('');
  };
  const verify = () => {
    if (expires === 0) { setErr(t('That code expired. Send a new one.')); return; }
    if (!/^\d{6}$/.test(code)) { setErr(t('Enter all 6 digits.')); return; }
    if (code === '000000') { const a = attempts + 1; setAttempts(a); setErr(a >= 3 ? t('Too many wrong codes. Send a new one.') : t('That code isn’t right. {n} tries left.', { n: 3 - a })); if (a >= 3) setExpires(0); return; }
    verifyPhone(num); setCode(''); closeModal();
  };
  return (
    <Dialog title={t('Verify your phone')} description={t('Needed to own a server or receive payouts. Your number is never shown to anyone.')} onClose={closeModal} size="sm" onSubmit={step === 'number' ? sendCode : verify}
      footer={<><Button onClick={step === 'code' ? () => setStep('number') : closeModal}>{step === 'code' ? t('Back') : t('Cancel')}</Button><Button type="submit" variant="primary">{step === 'number' ? t('Send code') : t('Verify')}</Button></>}>
      {step === 'number' ? (
        <TextField label={t('Mobile number')} prefix="+92" inputMode="numeric" autoComplete="tel-national" value={num} onChange={e => { setNum(e.target.value); setErr(null); }} error={err} icon={Smartphone} autoFocus />
      ) : (
        <>
          <p className="small">{t('We would send a code to +92 {n}.', { n: num })} <DemoTag>{t('No SMS is sent · any 6 digits except 000000 work')}</DemoTag></p>
          <TextField label={t('6-digit code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setErr(null); }} error={err} autoFocus className="otp-field" />
          <p className="meta" aria-live="polite">{expires > 0 ? t('Code expires in {m}:{s}', { m: Math.floor(expires / 60), s: String(expires % 60).padStart(2, '0') }) : t('Code expired')}</p>
          <Button variant="ghost" size="sm" disabled={resendIn > 0} onClick={() => { setResendIn(42); setExpires(300); setAttempts(0); setErr(null); toast('No SMS service is connected, so nothing was sent.', { tone: 'info' }); }}>{resendIn > 0 ? t('Resend in {n}s', { n: resendIn }) : t('Resend code')}</Button>
        </>
      )}
    </Dialog>
  );
}

/** Creator verification: the CNIC number is validated locally, never stored; only the outcome is kept. */
export function PayoutKycModal() {
  const t = useT();
  const phone = useApp(s => s.phoneVerified);
  const r = useRestrictions();
  const [cnic, setCnic] = useState('');
  const [err, setErr] = useState<string | null>(null);
  if (!r.payouts) return <Dialog title={t('Creator verification')} onClose={closeModal} size="sm"><Note tone="info">{t('Payouts aren’t available on under-18 accounts.')}</Note></Dialog>;
  if (!phone) return <Dialog title={t('Creator verification')} onClose={closeModal} size="sm" footer={<Button variant="primary" onClick={() => replaceModal({ kind: 'verifyPhone' })}>{t('Verify phone')}</Button>}><Note tone="info">{t('Verify your phone first.')}</Note></Dialog>;
  return (
    <Dialog title={t('Creator verification')} description={t('Required before payouts: verified phone plus a CNIC check.')} onClose={closeModal} size="sm"
      onSubmit={() => { const d = cnic.replace(/\D/g, ''); if (d.length !== 13) { setErr(t('A CNIC has 13 digits, like 35202-1234567-1.')); return; } setCnic(''); update(s => { s.kyc = 'pending'; }); closeModal(); toast('Sent for review. Only the result is kept; the number was not stored.'); }}
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary" icon={ShieldCheck}>{t('Submit for review')}</Button></>}>
      <TextField label={t('CNIC number')} inputMode="numeric" autoComplete="off" value={cnic} onChange={e => { setCnic(e.target.value); setErr(null); }} error={err} placeholder="35202-1234567-1" />
      <Note>{t('No verification provider is connected. In this demo the request goes to the staff console review queue, and only “approved” or “rejected” is kept.')}</Note>
      <p className="meta row g8"><Check size={14} aria-hidden="true" className="ok" />{t('Phone verified')}</p>
    </Dialog>
  );
}
