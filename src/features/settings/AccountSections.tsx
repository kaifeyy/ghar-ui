import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Flag, MapPin, Check, AlertCircle, Loader, Download, Trash2, KeyRound, Smartphone, Laptop, LogOut, Image as ImageIcon, Zap, Heart, UserX } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { openModal, go, toast } from '@/state/actions/ui';
import { changeUsername, saveProfile, type ProfilePatch } from '@/state/actions/profile';
import { exportData, signOutSession, signOutOthers, applyAgeGroup } from '@/state/actions/auth';
import { unblock } from '@/state/actions/social';
import { useT, useLocale, msg, type Key } from '@/i18n';
import type { BannerStyle, StoryAudience } from '@/types/models';
import { checkAvailability, changeAllowance, buildBloom, CHANGE_LIMIT, type Availability } from '@/domain/username';
import { formatKarachi, relTime } from '@/domain/time';
import { useRestrictions } from '@/state/selectors';
import { Button } from '@/ui/Button';
import { Note, Section, Tag, DemoTag } from '@/ui/Misc';
import { RadioList, Select, TextArea, TextField, Toggle } from '@/ui/Form';
import { Avatar } from '@/ui/Avatar';
import { Art } from '@/ui/Art';
import { SettingsBody } from './SettingsPage';
import { SHOP } from '@/fixtures/commerce';
import { TITLES, ME } from '@/fixtures/users';
import { Badges } from '@/features/profile/Badges';
import { DatePicker } from '@/ui/Pickers';

const RULE_TEXT: Record<string, Key> = { 'too-short': msg('At least 3 characters.'), 'too-long': msg('32 characters at most.'), charset: msg('Use only a–z, 0–9, underscore and dot.'), 'dot-edge': msg('Can’t start or end with a dot.'), 'double-dot': msg('No two dots in a row.') };

function UsernameCard() {
  const t = useT();
  const locale = useLocale();
  const users = useApp(s => s.users);
  const holds = useApp(s => s.usernameHolds);
  const reserved = useApp(s => s.reserved);
  const history = useApp(s => s.usernameHistory);
  const me = users[ME]!;
  const [v, setV] = useState('');
  const [checking, setChecking] = useState(false);
  const [avail, setAvail] = useState<Availability | null>(null);
  const reg = useMemo(() => ({ active: new Map(Object.values(users).map(u => [u.handle, u.id] as const)), holds, reserved }), [users, holds, reserved]);
  const bloom = useMemo(() => buildBloom(reg), [reg]);
  const allow = changeAllowance(history, Date.now());
  useEffect(() => {
    if (!v.trim()) { setAvail(null); return; }
    setChecking(true);
    const id = setTimeout(() => { setAvail(checkAvailability(v, ME, reg, Date.now(), bloom)); setChecking(false); }, 250);
    return () => clearTimeout(id);
  }, [v, reg, bloom]);
  const status = (() => {
    if (!avail || checking) return checking ? { tone: 'mut', icon: Loader, text: t('Checking…') } : null;
    switch (avail.state) {
      case 'invalid': return { tone: 'bad', icon: AlertCircle, text: t(RULE_TEXT[avail.error]!) };
      case 'yours': return { tone: 'mut', icon: Check, text: t('That’s your current username.') };
      case 'available': return { tone: 'ok', icon: Check, text: avail.via === 'bloom' ? t('Available (fast check: definitely free)') : t('Available (confirmed)') };
      case 'taken': return { tone: 'bad', icon: AlertCircle, text: t('Taken.') };
      case 'held': return { tone: 'bad', icon: AlertCircle, text: t('Held for its previous owner until {date}.', { date: formatKarachi(avail.until, { dateStyle: 'medium' }, locale) }) };
      case 'held-by-you': return { tone: 'ok', icon: Check, text: t('This was your name. You can reclaim it until {date}.', { date: formatKarachi(avail.until, { dateStyle: 'medium' }, locale) }) };
      case 'reserved': return { tone: 'bad', icon: AlertCircle, text: t('Reserved by the Ghar team ({cat}). Verified owners can ask the team to release it.', { cat: avail.category }) };
    }
  })();
  const canChange = allow.allowed && (avail?.state === 'available' || avail?.state === 'held-by-you') && !checking;
  const submit = () => { const r = changeUsername(v); if (r.ok) setV(''); else toast(r.reason === 'limit' ? msg('You’ve used both changes for this 14-day window.') : msg('That username isn’t available.'), { tone: 'warn' }); };
  const myHolds = holds.filter(h => h.previousOwner === ME && h.heldUntil > Date.now());
  return (
    <Section title={t('Username')} description={t('3–32 characters: a–z, 0–9, underscore and dot. Not case-sensitive. People find and @mention you with it.')}>
      <p>{t('Current:')} <b className="ltr">@{me.handle}</b></p>
      <form className="row g8 wrap end-row" onSubmit={e => { e.preventDefault(); if (canChange) submit(); }}>
        <TextField label={t('New username')} prefix="@" value={v} onChange={e => setV(e.target.value.toLowerCase())} autoComplete="off" spellCheck={false} className="grow" dir="ltr" />
        <Button type="submit" variant="primary" disabled={!canChange}>{t('Change username')}</Button>
      </form>
      {status && <p className={`row g8 small ${status.tone}`} role="status" aria-live="polite"><status.icon size={16} aria-hidden="true" className={status.icon === Loader ? 'spin' : ''} />{status.text}</p>}
      <div className="panel panel-pad col g8">
        <p className="small">{t('Changes used in the last 14 days: {n} of {max}', { n: allow.usedInWindow, max: CHANGE_LIMIT })}</p>
        {!allow.allowed && allow.nextAllowedAt && <Note tone="warn">{t('Your next change is allowed on {date}.', { date: formatKarachi(allow.nextAllowedAt, { dateStyle: 'medium', timeStyle: 'short' }, locale) })}</Note>}
        {history.length > 0 && <ul className="meta col g4">{[...history].reverse().map(h => <li key={h.changedAt}>@{h.oldName} → @{h.newName} · {formatKarachi(h.changedAt, { dateStyle: 'medium' }, locale)}</li>)}</ul>}
        {myHolds.length > 0 && <>
          <h4 className="label mt8">{t('Names held for you')}</h4>
          <ul className="col g8">{myHolds.map(h => <li key={h.name} className="row g8"><span className="grow"><b className="ltr">@{h.name}</b> <span className="meta">{t('until {date}', { date: formatKarachi(h.heldUntil, { dateStyle: 'medium' }, locale) })}</span></span><Button size="sm" onClick={() => setV(h.name)} disabled={!allow.allowed}>{t('Reclaim')}</Button></li>)}</ul>
          <p className="meta">{t('After 30 days a released name becomes free for anyone.')}</p>
        </>}
      </div>
    </Section>
  );
}

export function AccountSection() {
  const t = useT();
  const s = useApp(useShallow(x => ({ emailVerified: x.emailVerified, phone: x.phoneVerified, dob: x.dob, age: x.ageGroup })));
  const r = useRestrictions();
  return (
    <SettingsBody>
      <UsernameCard />
      <Section title={t('Email')}>
        <div className="row g8 wrap"><span className="grow">kaif@example.com</span>{s.emailVerified ? <Tag tone="green" icon={Check}>{t('Verified')}</Tag> : <Tag tone="amber">{t('Not verified')}</Tag>}<DemoTag>{t('Sample address')}</DemoTag></div>
        {!s.emailVerified && <Note tone="warn">{t('Verify your email before posting.')}</Note>}
      </Section>
      <Section title={t('Phone')} description={t('Optional. Needed to own a server or receive payouts. Never shown to anyone.')}>
        {s.phone ? <Tag tone="green" icon={Check}>{t('Verified')}</Tag> : <Button icon={Smartphone} onClick={() => openModal({ kind: 'verifyPhone' })}>{t('Verify phone')}</Button>}
      </Section>
      <Section title={t('Age')} description={t('From the date of birth you gave at sign-up.')}>
        <p>{s.age === 'minor' ? t('Under-18 account') : t('18 or older')}</p>
        {s.age === 'minor' && <Note tone="info" title={t('Safer defaults are on')}>{t('DMs from non-friends off, last seen hidden, story audience Friends, partner relationships unavailable, daily spending limit Rs {cap}, no payouts.', { cap: r.dailySpendCapPkr ?? 0 })}</Note>}
        <DatePicker label={t('Date of birth (demo)')} value={s.dob} required max={new Date().toISOString().slice(0, 10)} min="1900-01-01" onChange={v => { if (v) applyAgeGroup(v); }} hint={t('Changing it here only re-runs the demo age rules.')} />
      </Section>
      <Section title={t('Password')}><Button icon={KeyRound} onClick={() => openModal({ kind: 'password' })}>{t('Change password')}</Button></Section>
      <Section title={t('Your data')} description={t('Download what this demo holds about you, or delete the account.')}>
        <div className="row g8 wrap"><Button icon={Download} onClick={exportData}>{t('Download demo data')}</Button><Button variant="danger-ghost" icon={Trash2} onClick={() => openModal({ kind: 'deleteAccount' })}>{t('Delete account')}</Button></div>
      </Section>
    </SettingsBody>
  );
}

const BANNERS: BannerStyle[] = ['auto', 'study', 'gaming', 'jobs', 'fun', 'islamic', 'cities'];
const SONGS = ['Shehar ki Raat', 'Pasoori', 'Dil Dil Pakistan', 'Tu Jhoom', 'Kana Yaari'];
const COLORS = ['#3CCB91', '#5AA9F5', '#F2667A', '#F5B544', '#A78BFA', '#2DD4BF', '#FB923C'];

export function ProfileSection() {
  const t = useT();
  const me = useApp(s => s.users[ME]!);
  const media = useApp(s => s.media);
  const owned = useApp(s => s.owned);
  const titles = useApp(s => s.titles);
  const reduce = useApp(s => s.prefs.reduceMotion) ?? false;
  const effects = useApp(s => s.prefs.privacy.effects);
  const initial: ProfilePatch = { name: me.name, bio: me.bio ?? '', city: me.city, song: me.song ?? SONGS[0]!, flag: me.flag ?? '', bannerStyle: me.bannerStyle ?? 'auto', color: me.color, titleId: me.titleId };
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [effect, setEffect] = useState(useApp.getState().equipped.effect ?? '');
  const [playing, setPlaying] = useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);
  const nameErr = !f.name.trim() ? t('Enter a display name.') : [...f.name.trim()].length > 32 ? t('32 characters at most.') : null;
  const save = async () => { if (nameErr) return; setSaving(true); const ok = await saveProfile(f); setSaving(false); if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); } };
  const set = <K extends keyof ProfilePatch>(k: K, v: ProfilePatch[K]) => { setF(x => ({ ...x, [k]: v })); setSaved(false); };
  const ownedEffects = SHOP.filter(i => i.kind === 'effect' && owned.includes(i.id));
  return (
    <SettingsBody>
      <div className="settings-split">
        <div className="col g24">
          <Section title={t('Pictures')}>
            <div className="row g12 wrap">
              <Button icon={ImageIcon} onClick={() => openModal({ kind: 'profileMedia', which: 'avatar' })}>{media.avatar ? t('Change picture') : t('Upload picture')}</Button>
              <Button icon={ImageIcon} onClick={() => openModal({ kind: 'profileMedia', which: 'banner' })}>{media.banner ? t('Change banner') : t('Upload banner')}</Button>
            </div>
            <fieldset><legend className="flabel">{t('Avatar colour (used without a picture)')}</legend>
              <div className="row g8 wrap mt8">{COLORS.map(c => <button key={c} type="button" className={`swatch swatch-lg2 ${f.color === c ? 'is-on' : ''}`} style={{ background: c }} aria-label={c} aria-pressed={f.color === c} onClick={() => set('color', c)} />)}</div>
            </fieldset>
            <RadioList name="banner" legend={t('Generated banner style (used without a banner image)')} variant="segmented" value={f.bannerStyle} onChange={v => set('bannerStyle', v)} options={BANNERS.map(b => ({ value: b, label: t(({ auto: msg('Auto'), study: msg('Study'), gaming: msg('Gaming'), jobs: msg('Jobs'), fun: msg('Fun'), islamic: msg('Islamic'), cities: msg('Cities') } as const)[b]) }))} />
          </Section>
          <Section title={t('About you')}>
            <TextField label={t('Display name')} value={f.name} onChange={e => set('name', e.target.value)} error={nameErr} hint={t('Any language or script, 1–32 characters.')} />
            <TextArea label={t('Bio')} value={f.bio} onChange={e => set('bio', e.target.value)} maxLength={190} count={f.bio.length} />
            <TextField label={t('City')} value={f.city} onChange={e => set('city', e.target.value)} />
            <Select label={t('Flag next to your name')} value={f.flag} onValue={v => set('flag', v)} options={[['', t('None')], ['PK', t('Pakistan')], [f.city || 'Lahore', t('My city ({c})', { c: f.city || 'Lahore' })]]} />
            <Select label={t('Song of the day')} value={f.song} onValue={v => set('song', v)} options={SONGS.map(s => [s, s] as const)} hint={t('From a licensed catalogue in the real app; resets after 24 hours.')} />
            <Select label={t('Title (one at a time)')} value={f.titleId ?? ''} onValue={v => set('titleId', v || undefined)} options={[['', t('No title')], ...titles.map(id => [id, TITLES.find(x => x.id === id)?.name ?? id] as const)]} />
          </Section>
          <Section title={t('Entrance effect')} description={t('Plays when you join a chat or voice room. Communities can turn effects off.')}>
            <Select label={t('Effect')} value={effect} onValue={v => { setEffect(v); update(s => { if (v) s.equipped.effect = v; else delete s.equipped.effect; }); }} options={[['', t('None')], ...ownedEffects.map(e => [e.id, e.name] as const)]} />
            {!ownedEffects.length && <p className="meta">{t('You don’t own any effects yet.')} <Button size="sm" variant="ghost" onClick={() => go({ name: 'settings', section: 'shop' })}>{t('Open shop')}</Button></p>}
            {effect && <Button size="sm" icon={Zap} onClick={() => { setPlaying(true); setTimeout(() => setPlaying(false), 1600); }}>{t('Preview')}</Button>}
            {(reduce || !effects) && <p className="meta">{t('Reduced motion or effects-off shows a static badge instead of the animation.')}</p>}
          </Section>
          <Section title={t('Relationships')}><Button icon={Heart} onClick={() => go({ name: 'relationships' })}>{t('Manage relationships')}</Button></Section>
        </div>
        <aside className="preview-card" aria-label={t('Preview')}>
          <h3 className="label">{t('Preview')}</h3>
          <div className="mini-profile">
            <div className="mini-banner">{media.banner ? <img src={media.banner} alt="" /> : <Art seed="u-me" color={f.color} style={f.bannerStyle} w={300} h={100} />}</div>
            <div className={`mini-av ${playing ? (reduce || !effects ? 'fx-static' : 'fx-play') : ''}`}><Avatar userId="me" size={72} showPresence /></div>
            <b className="mini-name" dir="auto">{f.name || '—'}{f.flag ? (f.flag === 'PK' ? <Flag size={16} aria-hidden="true" className="flag" /> : <MapPin size={16} aria-hidden="true" className="flag" />) : null}</b>
            <span className="meta ltr">@{me.handle}</span>
            {f.titleId && <Tag>{TITLES.find(x => x.id === f.titleId)?.name}</Tag>}
            <Badges ids={me.badges} size="compact" />
            <p className="small muted plain" dir="auto">{f.bio}</p>
          </div>
        </aside>
      </div>
      <div className={`savebar ${dirty ? 'is-dirty' : ''}`} role="region" aria-label={t('Unsaved changes')}>
        {dirty ? <span className="row g8"><span className="dirty-dot" aria-hidden="true" />{t('You have unsaved changes')}</span> : saved ? <span className="row g8 ok" role="status"><Check size={16} aria-hidden="true" />{t('Saved')}</span> : <span className="meta">{t('All changes saved')}</span>}
        <span className="grow" />
        <Button variant="ghost" onClick={() => setF(initial)} disabled={!dirty || saving}>{t('Discard')}</Button>
        <Button variant="primary" onClick={save} disabled={!dirty || !!nameErr} loading={saving}>{t('Save changes')}</Button>
      </div>
    </SettingsBody>
  );
}

const AUDIENCES: StoryAudience[] = ['everyone', 'friends', 'close'];
export function PrivacySection() {
  const t = useT();
  const p = useApp(s => s.prefs.privacy);
  const blocked = useApp(s => s.blocked);
  const users = useApp(s => s.users);
  const aud = useApp(s => s.prefs.storyAudienceDefault);
  const minor = useApp(s => s.ageGroup === 'minor');
  const setP = (k: keyof typeof p, v: boolean) => update(s => { s.prefs.privacy[k] = v; });
  return (
    <SettingsBody>
      {minor && <Note tone="info">{t('Under-18 accounts start with safer defaults. You can still change most of them.')}</Note>}
      <Section title={t('Messages and visibility')}>
        <div className="list-rows">
          <Toggle label={t('Allow DMs from people who aren’t friends')} checked={p.dmsFromNonFriends} onChange={v => setP('dmsFromNonFriends', v)} />
          <Toggle label={t('Show when I was last online')} description={t('Friends see “last seen 2 h ago”. Turn off to hide yours; you’ll still see theirs.')} checked={p.lastSeen} onChange={v => setP('lastSeen', v)} />
          <Toggle label={t('Show my relationships and connections on my profile')} checked={p.showConnections} onChange={v => setP('showConnections', v)} />
          <Toggle label={t('Show my flag')} checked={p.flag} onChange={v => setP('flag', v)} />
        </div>
      </Section>
      <Section title={t('Calls and IP address')}>
        <div className="list-rows">
          <Toggle label={t('Hide my IP in calls')} description={t('Relays your video and screen share through Ghar so call partners can’t see your IP. Voice channels are always relayed.')} checked={p.hideIp} onChange={v => setP('hideIp', v)} />
          <Toggle label={t('Warn me before my first video call')} checked={p.warnVideo} onChange={v => setP('warnVideo', v)} />
          <Toggle label={t('Play entrance effects')} checked={p.effects} onChange={v => setP('effects', v)} />
        </div>
      </Section>
      <Section title={t('Stories')}>
        <RadioList name="story-default" legend={t('Default audience for new stories')} variant="segmented" value={aud} onChange={v => update(s => { s.prefs.storyAudienceDefault = v; })} options={AUDIENCES.map(a => ({ value: a, label: t(({ everyone: msg('Everyone'), friends: msg('Friends'), close: msg('Close friends'), custom: msg('Custom') } as const)[a]) }))} />
      </Section>
      <Section title={t('Blocked users')} description={t('Blocked people can’t message you, see your stories or find you in search.')}>
        {blocked.length ? <ul className="flist">{blocked.map(id => <li key={id} className="frow"><div className="frow-main"><Avatar userId={id} size={32} /><span className="person-text"><b>{users[id]?.name ?? id}</b></span></div><Button size="sm" icon={UserX} onClick={() => unblock(id)}>{t('Unblock')}</Button></li>)}</ul> : <p className="meta">{t('You haven’t blocked anyone.')}</p>}
      </Section>
    </SettingsBody>
  );
}

export function DevicesSection() {
  const t = useT();
  const sessions = useApp(s => s.sessions);
  const now = useApp(s => s.now);
  return (
    <SettingsBody>
      <Section title={t('Signed-in devices')} description={t('Sign out anything you don’t recognise.')} actions={sessions.length > 1 ? <Button size="sm" variant="danger-ghost" icon={LogOut} onClick={signOutOthers}>{t('Sign out all others')}</Button> : undefined}>
        <ul className="flist">{sessions.map(x => (
          <li key={x.id} className="frow">
            <div className="frow-main">{x.name.includes('phone') ? <Smartphone size={22} aria-hidden="true" /> : <Laptop size={22} aria-hidden="true" />}<span className="person-text"><b>{x.name}</b><em>{x.detail} · {x.current ? t('This device') : relTime(x.lastActive, now)}</em></span></div>
            {x.current ? <Tag tone="green">{t('Current')}</Tag> : <Button size="sm" icon={LogOut} onClick={() => signOutSession(x.id)}>{t('Sign out')}</Button>}
          </li>
        ))}</ul>
        <DemoTag>{t('Sample sessions')}</DemoTag>
      </Section>
    </SettingsBody>
  );
}
