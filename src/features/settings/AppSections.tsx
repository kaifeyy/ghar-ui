import { useEffect, useRef, useState } from 'react';
import { Mic, Bell, BellOff, Check, AlertTriangle, Moon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useApp, update } from '@/state/store';
import { toast, go } from '@/state/actions/ui';
import { setDevice, setAudioPref } from '@/state/actions/audio';
import { equip } from '@/state/actions/profile';
import { toggleServerMute } from '@/state/actions/community';
import { useT, LANGS, msg } from '@/i18n';
import type { Lang, ThemeMode } from '@/types/models';
import { contrast, ratioLabel, grade } from '@/domain/contrast';
import { Button } from '@/ui/Button';
import { Note, Section, Tag, DemoTag } from '@/ui/Misc';
import { RadioList, Select, Toggle } from '@/ui/Form';
import { CommunityIcon } from '@/ui/Art';
import { SettingsBody } from './SettingsPage';
import { SHOP } from '@/fixtures/commerce';

const ACCENTS = ['#3CCB91', '#5AA9F5', '#E5B454', '#F07878', '#A78BFA', '#2DD4BF'];
const SURFACE = { dark: '#18191C', light: '#FFFFFF' } as const;

export function AppearanceSection() {
  const t = useT();
  const p = useApp(useShallow(s => ({ theme: s.prefs.theme, accent: s.prefs.accent, skin: s.prefs.skin, chat: s.prefs.chatStyle, motion: s.prefs.reduceMotion, large: s.prefs.largeText, low: s.prefs.lowData, icon: s.prefs.appIcon, bubble: s.prefs.bubble })));
  const owned = useApp(s => s.owned);
  const set = (fn: (d: ReturnType<typeof useApp.getState>['prefs']) => void) => update(s => fn(s.prefs));
  const mode: 'dark' | 'light' = p.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : p.theme;
  const accent = p.accent ?? (mode === 'light' ? '#0B7A50' : '#3CCB91');
  const ratio = contrast(accent, SURFACE[mode]);
  const g = grade(ratio);
  const themes = SHOP.filter(i => i.kind === 'theme');
  const icons = SHOP.filter(i => i.kind === 'icon');
  return (
    <SettingsBody>
      <Section title={t('Theme')}>
        <RadioList name="theme" legend={t('Theme')} srLegend variant="segmented" value={p.theme} onChange={(v: ThemeMode) => set(x => { x.theme = v; })} options={[{ value: 'dark', label: t('Dark') }, { value: 'light', label: t('Light') }, { value: 'system', label: t('Match system') }]} />
        <fieldset><legend className="flabel">{t('Dark theme surface')}</legend>
          <div className="theme-grid mt8">{themes.map(th => {
            const has = owned.includes(th.id);
            return (
              <button key={th.id} type="button" className={`theme-tile ${p.skin === th.id ? 'is-on' : ''}`} aria-pressed={p.skin === th.id} disabled={!has} onClick={() => equip('theme', th.id)} style={{ ['--p' as string]: th.preview }}>
                <span className="theme-swatch" aria-hidden="true" /><b>{th.name}</b><span className="meta">{has ? (p.skin === th.id ? t('In use') : t('Owned')) : `Rs ${th.pricePkr}`}</span>
              </button>
            );
          })}</div>
          <Button size="sm" variant="ghost" className="mt8" onClick={() => go({ name: 'settings', section: 'shop' })}>{t('Get more themes in Shop')}</Button>
        </fieldset>
      </Section>
      <Section title={t('Accent colour')} description={t('Used sparingly: presence, success and mentions of you.')}>
        <div className="row g8 wrap" role="group" aria-label={t('Accent colour')}>
          <button type="button" className={`swatch swatch-lg2 ${!p.accent ? 'is-on' : ''}`} style={{ background: mode === 'light' ? '#0B7A50' : '#3CCB91' }} aria-pressed={!p.accent} aria-label={t('Default green')} onClick={() => set(x => { x.accent = null; })} />
          {ACCENTS.slice(1).map(c => <button key={c} type="button" className={`swatch swatch-lg2 ${p.accent === c ? 'is-on' : ''}`} style={{ background: c }} aria-pressed={p.accent === c} aria-label={c} onClick={() => set(x => { x.accent = c; })} />)}
        </div>
        <p className={`row g8 small ${g === 'fail' || g === 'AA-large' ? 'warn' : 'ok'}`} role="status">
          {g === 'fail' || g === 'AA-large' ? <AlertTriangle size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          {t('Contrast against the {mode} background: {ratio}', { mode: mode === 'light' ? t('light') : t('dark'), ratio: ratioLabel(ratio) })} · {g === 'AAA' ? t('excellent for text') : g === 'AA' ? t('fine for text') : g === 'AA-large' ? t('only for large text and icons') : t('too low for text')}
        </p>
      </Section>
      <Section title={t('Messages')}>
        <RadioList name="chat" legend={t('Message layout')} variant="segmented" value={p.chat} onChange={v => set(x => { x.chatStyle = v; })} options={[{ value: 'rows', label: t('Rows') }, { value: 'bubbles', label: t('Bubbles') }]} />
        <Select label={t('Bubble theme')} value={p.bubble} onValue={v => set(x => { x.bubble = v; })} options={[['default', t('Default')], ...SHOP.filter(i => i.kind === 'bubble' && owned.includes(i.id)).map(i => [i.id, i.name] as const)]} hint={t('Owned bubble themes appear here.')} />
      </Section>
      <Section title={t('Accessibility')}>
        <div className="list-rows">
          <RadioList name="motion" legend={t('Motion')} variant="segmented" value={p.motion === null ? 'system' : p.motion ? 'reduce' : 'full'} onChange={v => set(x => { x.reduceMotion = v === 'system' ? null : v === 'reduce'; })} options={[{ value: 'system', label: t('Follow system') }, { value: 'reduce', label: t('Reduce motion') }, { value: 'full', label: t('Allow motion') }]} />
          <Toggle label={t('Larger text')} description={t('Scales every text size and row height.')} checked={p.large} onChange={v => set(x => { x.largeText = v; })} />
          <Toggle label={t('Low data mode')} description={t('Pauses animated effects and loads smaller images.')} checked={p.low} onChange={v => set(x => { x.lowData = v; })} />
        </div>
      </Section>
      <Section title={t('App icon')} description={t('The real apps can change their icon on iOS, Android and desktop.')}>
        <div className="row g8 wrap">{icons.map(i => <Button key={i.id} size="sm" aria-pressed={p.icon === i.id} disabled={!owned.includes(i.id)} onClick={() => set(x => { x.appIcon = i.id; })}>{i.name}{!owned.includes(i.id) ? ` · Rs ${i.pricePkr}` : ''}</Button>)}</div>
      </Section>
    </SettingsBody>
  );
}

export function LanguageSection() {
  const t = useT();
  const lang = useApp(s => s.prefs.lang);
  return (
    <SettingsBody>
      <Section title={t('App language')} description={t('Changes menus and buttons. You can chat in any language either way.')}>
        <RadioList name="lang" legend={t('App language')} srLegend value={lang} onChange={(v: Lang) => update(s => { s.prefs.lang = v; })}
          options={LANGS.map(l => ({ value: l.id, label: <span lang={l.id} dir={l.dir}>{l.native}</span>, description: l.dir === 'rtl' ? `${l.english} · ${t('right to left')}` : l.english }))} />
        <p className="meta">{t('Urdu uses Nastaliq type; Arabic and Urdu switch the layout to right-to-left.')}</p>
      </Section>
    </SettingsBody>
  );
}

const INPUTS = ['Default microphone', 'Headset microphone', 'Laptop microphone'];
const OUTPUTS = ['Default speakers', 'Headset', 'HDMI display'];
export function VoiceSection() {
  const t = useT();
  const a = useApp(s => s.audio);
  const hideIp = useApp(s => s.prefs.privacy.hideIp);
  const [test, setTest] = useState<'idle' | 'asking' | 'live' | 'denied' | 'unavailable'>('idle');
  const [level, setLevel] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);
  const stop = () => { cancelAnimationFrame(raf.current); stream.current?.getTracks().forEach(tr => tr.stop()); stream.current = null; setLevel(0); setTest('idle'); };
  useEffect(() => () => { cancelAnimationFrame(raf.current); stream.current?.getTracks().forEach(tr => tr.stop()); }, []);
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setTest('unavailable'); return; }
    setTest('asking');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const ctx = new AudioContext(); const an = ctx.createAnalyser(); ctx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => { an.getByteFrequencyData(buf); setLevel(Math.min(100, Math.round(buf.reduce((x, y) => x + y, 0) / buf.length * 1.6))); raf.current = requestAnimationFrame(loop); };
      setTest('live'); loop();
    } catch { setTest('denied'); }
  };
  return (
    <SettingsBody>
      <Section title={t('Devices')}>
        <Select label={t('Microphone')} value={a.inputDevice} onValue={v => setDevice('input', v)} options={INPUTS.map(d => [d, d] as const)} />
        <Select label={t('Speakers')} value={a.outputDevice} onValue={v => setDevice('output', v)} options={OUTPUTS.map(d => [d, d] as const)} />
        <DemoTag>{t('Sample device names')}</DemoTag>
      </Section>
      <Section title={t('Microphone test')} description={t('Uses your real microphone in this browser. Nothing is recorded or sent.')}>
        {test === 'live' ? <>
          <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} aria-label={t('Input level')}><span style={{ width: level + '%' }} /></div>
          <Button onClick={stop}>{t('Stop test')}</Button>
        </> : <Button icon={Mic} onClick={start} loading={test === 'asking'}>{t('Start test')}</Button>}
        {test === 'denied' && <Note tone="warn">{t('Microphone access was blocked. Allow it in your browser’s site settings, then try again.')}</Note>}
        {test === 'unavailable' && <Note tone="warn">{t('This browser doesn’t allow microphone access here.')}</Note>}
      </Section>
      <Section title={t('Input')}>
        <div className="list-rows">
          <Toggle label={t('Push to talk')} description={t('Hold V to talk in voice channels.')} checked={a.pushToTalk} onChange={v => setAudioPref('pushToTalk', v)} />
          <Toggle label={t('Noise suppression')} description={t('Filters fans, traffic and keyboard sounds on your device.')} checked={a.noiseSuppression} onChange={v => setAudioPref('noiseSuppression', v)} />
          <Toggle label={t('Hide my IP in calls')} description={t('Relays your video and screen share. Voice channels are always relayed.')} checked={hideIp} onChange={v => update(s => { s.prefs.privacy.hideIp = v; })} />
        </div>
      </Section>
      <Section title={t('Video')}><p className="muted small">{t('Calls open your camera with the device’s default settings, capped at 720p. Video works for up to 4 people.')}</p></Section>
    </SettingsBody>
  );
}

export function NotificationsSection() {
  const t = useT();
  const n = useApp(useShallow(s => s.prefs.notif));
  const joined = useApp(s => s.joined);
  const servers = useApp(s => s.servers);
  const muted = useApp(s => s.prefs.mutedServers);
  const dnd = useApp(s => s.manualPresence === 'dnd');
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const setN = (k: keyof typeof n, v: boolean) => update(s => { s.prefs.notif[k] = v; });
  const ask = async () => { if (typeof Notification === 'undefined') return; const r = await Notification.requestPermission(); setPerm(r); toast(r === 'granted' ? msg('Browser notifications allowed') : msg('Browser notifications not allowed'), { tone: r === 'granted' ? 'ok' : 'info' }); };
  const rows: [keyof typeof n, ReturnType<typeof msg>][] = [['mentions', msg('Mentions')], ['dms', msg('Direct messages')], ['replies', msg('Replies')], ['friends', msg('Friend requests')], ['events', msg('Event reminders')], ['prayer', msg('Prayer times')], ['gifts', msg('Gifts')]];
  return (
    <SettingsBody>
      {dnd && <Note tone="info" title={t('Do Not Disturb is on')}>{t('Sounds and banners are muted. Everything still collects in your Inbox.')}</Note>}
      <Section title={t('Browser notifications')}>
        <p className="row g8">{perm === 'granted' ? <Tag tone="green" icon={Bell}>{t('Allowed')}</Tag> : perm === 'denied' ? <Tag tone="red" icon={BellOff}>{t('Blocked in browser settings')}</Tag> : perm === 'unsupported' ? <Tag>{t('Not supported here')}</Tag> : <Tag>{t('Not asked yet')}</Tag>}</p>
        {perm === 'default' && <Button icon={Bell} onClick={ask}>{t('Allow notifications')}</Button>}
        <p className="meta">{t('No push service is connected, so nothing is delivered in this demo even when allowed.')}</p>
      </Section>
      <Section title={t('Notify me about')}><div className="list-rows">{rows.map(([k, l]) => <Toggle key={k} label={t(l)} checked={n[k]} onChange={v => setN(k, v)} />)}</div></Section>
      <Section title={t('Communities')} description={t('Muted communities still send mentions of you to your Inbox.')}>
        <ul className="flist">{joined.map(id => { const sv = servers[id]!; return (
          <li key={id} className="frow"><div className="frow-main"><CommunityIcon id={id} name={sv.name} color={sv.color} size={32} /><span className="person-text"><b>{sv.name}</b><em>{muted[id] ? t('Muted') : t('All messages')}</em></span></div><Button size="sm" icon={muted[id] ? Bell : BellOff} onClick={() => toggleServerMute(id)}>{muted[id] ? t('Unmute') : t('Mute')}</Button></li>
        ); })}</ul>
      </Section>
    </SettingsBody>
  );
}

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
const SAMPLE_TIMES: Record<string, string[]> = { Lahore: ['4:52', '11:58', '3:14', '5:39', '6:58'], Karachi: ['5:16', '12:23', '3:44', '6:08', '7:23'], Islamabad: ['4:57', '12:02', '3:16', '5:41', '7:02'], Peshawar: ['5:03', '12:08', '3:21', '5:46', '7:07'], Multan: ['5:01', '12:07', '3:24', '5:50', '7:08'] };
export function PrayerSection() {
  const t = useT();
  const p = useApp(useShallow(s => s.prefs.prayer));
  const times = SAMPLE_TIMES[p.city] ?? SAMPLE_TIMES.Lahore!;
  return (
    <SettingsBody>
      <Section title={t('City and method')}>
        <Select label={t('City')} value={p.city} onValue={v => update(s => { s.prefs.prayer.city = v; })} options={Object.keys(SAMPLE_TIMES).map(c => [c, c] as const)} />
        <Select label={t('Calculation method')} value={p.method} onValue={v => update(s => { s.prefs.prayer.method = v; })} options={[['karachi', t('University of Islamic Sciences, Karachi')], ['hanafi', t('Hanafi (Asr)')], ['isna', 'ISNA'], ['mwl', t('Muslim World League')]]} />
      </Section>
      <Section title={t('Today’s times')} description={t('Sample times for the demo. The real app calculates them on your device from your city and method.')}>
        <ul className="prayer-list">{PRAYERS.map((pr, i) => (
          <li key={pr} className="row g12"><Moon size={16} aria-hidden="true" className="mut" /><b className="grow">{pr}</b><span className="tnum ltr">{times[i]}</span>
            <Toggle label={<span className="sr">{t('Alert for {p}', { p: pr })}</span>} checked={p.on[pr]} onChange={v => update(s => { s.prefs.prayer.on[pr] = v; })} /></li>
        ))}</ul>
        <Toggle label={t('Play Azaan with alerts')} description={t('A short clip on the notification; the full Azaan plays when you open it.')} checked={p.azaan} onChange={v => update(s => { s.prefs.prayer.azaan = v; })} />
        <DemoTag>{t('Alerts aren’t scheduled in this demo')}</DemoTag>
      </Section>
    </SettingsBody>
  );
}
