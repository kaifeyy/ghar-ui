import { CHANNEL_ICONS, type ChannelIconName } from '@/ui/ChannelIcons';
import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';
import { Search, Compass, Plus, Hash, Volume2, Radio, MessagesSquare, Megaphone, Check, Upload, Phone } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { closeModal, go, replaceModal, toast } from '@/state/actions/ui';
import { createFromTemplate, createChannel, updateChannel, deleteChannel, createEvent, rsvp, addEmoji, cancelEvent } from '@/state/actions/community';
import { postForum, replyForum } from '@/state/actions/messages';
import { moderate } from '@/state/actions/portal';
import { useT, useLocale, msg, type Key } from '@/i18n';
import type { ChannelType, CommunityCategory, ChannelLock } from '@/types/models';
import { uid } from '@/domain/rng';
import { matchScore } from '@/domain/search';
import { formatKarachi, relTime } from '@/domain/time';
import { kfmt } from '@/domain/format';
import { Dialog } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { RadioList, Select, TextArea, TextField, Toggle } from '@/ui/Form';
import { CommunityIcon } from '@/ui/Art';
import { Avatar } from '@/ui/Avatar';
import { Markdown } from '@/ui/Markdown';
import { Note, Tag, DemoTag } from '@/ui/Misc';
import { TEMPLATES, levelFor, emojiSlots, BRIDGE_LEVEL, type Template } from '@/fixtures/communities';
import { ME } from '@/fixtures/users';
import { DateTimeField } from '@/ui/Pickers';

const CATS: CommunityCategory[] = ['Gaming', 'Study', 'Jobs', 'Local cities', 'Islamic', 'Fun'];
export const TYPE_LABEL: Record<ChannelType, Key> = { text: msg('Text'), voice: msg('Voice'), stage: msg('Stage'), forum: msg('Forum'), announcement: msg('Announcement') };
const TYPE_DESC: Record<ChannelType, Key> = { text: msg('Messages, files and links'), voice: msg('Hang out with voice, camera and screen share'), stage: msg('Speakers and an audience: open mics, AMAs, live streams'), forum: msg('Posts for questions, mentorship and job listings'), announcement: msg('Only staff post; everyone can read and react') };
const TYPE_ICON = { text: Hash, voice: Volume2, stage: Radio, forum: MessagesSquare, announcement: Megaphone } as const;

export function CreateCommunityModal() {
  const t = useT();
  const [kind, setKind] = useState<'room' | 'server'>('room');
  const [name, setName] = useState('');
  const [tpl, setTpl] = useState<Template['id']>('study');
  const [cat, setCat] = useState<CommunityCategory>('Study');
  const [e2ee, setE2ee] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const roomsToday = useApp(s => Object.values(s.servers).filter(x => x.owner === ME && x.kind === 'room').length);
  const submit = () => {
    if (kind === 'server') { replaceModal({ kind: 'apply' }); return; }
    if (name.trim().length < 2 || name.trim().length > 40) { setErr(t('Use 2–40 characters.')); return; }
    if (roomsToday >= 5) { setErr(t('You can create up to 5 Rooms a day.')); return; }
    closeModal();
    createFromTemplate({ name, kind: 'room', templateId: tpl, category: cat, e2ee });
  };
  return (
    <Dialog title={t('Create a community')} onClose={closeModal} onSubmit={submit} size="lg"
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{kind === 'room' ? t('Create Room') : t('Continue to application')}</Button></>}>
      <RadioList name="ckind" legend={t('Type')} variant="cards" value={kind} onChange={setKind} options={[
        { value: 'room', label: t('Room'), description: t('Open to anyone you invite. Not listed in Discover and can’t take payments.') },
        { value: 'server', label: t('Server'), description: t('Listed in Discover, can earn. Needs an application and a verified phone; the team replies within 72 hours.') },
      ]} />
      {kind === 'room' && <>
        <TextField label={t('Name')} value={name} onChange={e => { setName(e.target.value); setErr(null); }} error={err} maxLength={40} autoFocus />
        <RadioList name="tpl" legend={t('Template')} variant="cards" value={tpl} onChange={setTpl} options={TEMPLATES.map(x => ({ value: x.id, label: x.name, description: x.description }))} />
        <TemplatePreview id={tpl} />
        <Select label={t('Category')} value={cat} onValue={setCat} options={CATS.map(c => [c, c] as const)} />
        <Toggle label={t('End-to-end encryption')} description={t('Auto-moderation, search and content logs are turned off in encrypted Rooms. Shown as a label only in this demo.')} checked={e2ee} onChange={setE2ee} />
      </>}
    </Dialog>
  );
}
function TemplatePreview({ id }: { id: Template['id'] }) {
  const t = useT();
  const tp = TEMPLATES.find(x => x.id === id)!;
  return (
    <div className="tpl-preview">
      <div><h4 className="label">{t('Channels')}</h4><ul>{tp.categories.flatMap(c => c.channels.map(ch => <li key={c.name + ch.name}>{ch.type === 'voice' ? <Volume2 size={14} aria-hidden="true" /> : <Hash size={14} aria-hidden="true" />} {ch.name}</li>))}</ul></div>
      <div><h4 className="label">{t('Roles')}</h4><ul>{tp.roles.map(r => <li key={r}>{r}</li>)}</ul></div>
      {tp.portal.length > 0 && <div><h4 className="label">{t('Developer Portal')}</h4><ul>{tp.portal.map(p => <li key={p}>{p}</li>)}</ul></div>}
    </div>
  );
}

export function ApplyModal() {
  const t = useT();
  const phoneVerified = useApp(s => s.phoneVerified);
  const existing = useApp(s => s.applications.find(a => a.id === s.myApplicationId));
  const recent = useApp(s => s.applications.filter(a => a.applicant === ME && Date.now() - a.submittedAt < 7 * 86_400_000).length);
  const [f, setF] = useState({ name: existing?.name ?? '', category: (existing?.category ?? 'Study') as CommunityCategory, purpose: existing?.purpose ?? '', plan: existing?.moderationPlan ?? '', samples: existing?.samples ?? '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string) => { setF(x => ({ ...x, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); };
  const submit = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = t('Use 2–40 characters.');
    if (f.purpose.trim().length < 20) e.purpose = t('Describe the purpose in at least 20 characters.');
    if (f.plan.trim().length < 20) e.plan = t('Describe how you’ll moderate in at least 20 characters.');
    if (!existing && recent >= 3) e.name = t('You can send up to 3 applications a week.');
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    const id = existing?.id ?? uid('ap');
    update(d => {
      const a = { id, name: f.name.trim(), category: f.category, applicant: ME, purpose: f.purpose.trim(), moderationPlan: f.plan.trim(), samples: f.samples.trim(), submittedAt: Date.now(), status: 'pending' as const, notes: existing?.notes ?? [], phoneVerified: true };
      const i = d.applications.findIndex(x => x.id === id);
      if (i >= 0) d.applications[i] = a; else d.applications.unshift(a);
      d.myApplicationId = id;
    });
    closeModal(); go({ name: 'communities' });
    toast(existing ? msg('Application resubmitted') : msg('Application sent. The team replies within 72 hours.'));
  };
  if (!phoneVerified) return (
    <Dialog title={t('Apply for a server')} onClose={closeModal} size="sm" footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button variant="primary" icon={Phone} onClick={() => replaceModal({ kind: 'verifyPhone' })}>{t('Verify phone')}</Button></>}>
      <Note tone="info" title={t('Verify your phone first')}>{t('Server owners need a verified phone number. It’s never shown to anyone.')}</Note>
    </Dialog>
  );
  return (
    <Dialog title={existing ? t('Edit and resubmit') : t('Apply for a server')} description={t('Servers are reviewed by the Ghar team. There’s no member cap once approved.')} onClose={closeModal} onSubmit={submit} size="lg"
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{existing ? t('Resubmit') : t('Send application')}</Button></>}>
      {existing?.status === 'changes-requested' && <Note tone="warn" title={t('The team asked for changes')}>{existing.notes.at(-1)?.text}</Note>}
      <TextField label={t('Server name')} value={f.name} onChange={e => set('name', e.target.value)} error={errs.name} maxLength={40} required />
      <Select label={t('Category')} value={f.category} onValue={v => set('category', v)} options={CATS.map(c => [c, c] as const)} />
      <TextArea label={t('Purpose')} value={f.purpose} onChange={e => set('purpose', e.target.value)} error={errs.purpose} maxLength={600} count={f.purpose.length} required />
      <TextArea label={t('Moderation plan')} value={f.plan} onChange={e => set('plan', e.target.value)} error={errs.plan} maxLength={600} count={f.plan.length} required hint={t('Who moderates, when, and what tools you’ll use.')} />
      <TextArea label={t('Sample content (optional)')} value={f.samples} onChange={e => set('samples', e.target.value)} maxLength={600} />
      <p className="meta">{t('Phone verified')} <Check size={14} aria-hidden="true" className="ok" /></p>
    </Dialog>
  );
}

export function AllCommunitiesModal() {
  const t = useT();
  const joined = useApp(s => s.joined);
  const servers = useApp(s => s.servers);
  const [q, setQ] = useState('');
  const list = joined.map(id => servers[id]!).filter(sv => !q.trim() || matchScore(q, [sv.name, sv.category, sv.city]) > 0);
  return (
    <Dialog title={t('All communities')} onClose={closeModal} size="md" footer={<><Button icon={Compass} onClick={() => { closeModal(); go({ name: 'discover', cat: 'all' }); }}>{t('Discover more')}</Button><Button icon={Plus} variant="primary" onClick={() => replaceModal({ kind: 'createCommunity' })}>{t('Create')}</Button></>}>
      <TextField label={t('Search your communities')} srLabel icon={Search} placeholder={t('Search your communities')} value={q} onChange={e => setQ(e.target.value)} autoFocus />
      <ul className="picker-list" aria-label={t('Your communities')}>
        {list.map(sv => (
          <li key={sv.id}><button type="button" className="person" onClick={() => { closeModal(); go({ name: 'channel', serverId: sv.id, channelId: sv.categories.flatMap(c => c.channelIds)[0] ?? '' }); }}>
            <CommunityIcon id={sv.id} name={sv.name} color={sv.color} style={sv.bannerStyle} size={36} />
            <span className="person-text"><b dir="auto">{sv.name}</b><em>{sv.kind === 'room' ? t('Room · unlisted') : sv.category} · {t('{n} members', { n: kfmt(sv.members) })}</em></span>
          </button></li>
        ))}
        {!list.length && <li className="meta pad12">{t('No communities match.')}</li>}
      </ul>
    </Dialog>
  );
}

function ChannelForm({ serverId, initial, onSubmit, submitLabel, onDelete }: { serverId: string; initial?: { name: string; type: ChannelType; topic: string; emoji: string; lock: 'none' | 'role' | 'password' | 'payment'; roleId: string; price: string; hint: string; categoryId: string; slow: string }; onSubmit: (v: NonNullable<typeof initial>) => void; submitLabel: string; onDelete?: () => void }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const [v, setV] = useState(initial ?? { name: '', type: 'text' as ChannelType, topic: '', emoji: '', lock: 'none' as const, roleId: sv.roles.find(r => r.name === 'Moderators')?.id ?? '', price: '200', hint: '', categoryId: sv.categories[0]?.id ?? '', slow: '0' });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => { setV(x => ({ ...x, [k]: val })); setErr(e => ({ ...e, [k]: '' })); };
  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.name.trim() || v.name.trim().length > 40) e.name = t('Use 1–40 characters.');
    if (v.lock === 'payment' && (!/^\d+$/.test(v.price) || Number(v.price) < 50)) e.price = t('Price must be at least Rs 50.');
    if (v.lock === 'password' && v.hint.trim().length < 3) e.hint = t('Add a hint so members know whom to ask.');
    setErr(e);
    if (!Object.values(e).some(Boolean)) onSubmit(v);
  };
  return (
    <Dialog title={submitLabel} onClose={closeModal} onSubmit={submit} size="lg" footer={<>{onDelete && <Button variant="danger-ghost" onClick={onDelete}>{t('Delete channel')}</Button>}<span className="grow" /><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{t('Save')}</Button></>}>
      {!initial && <RadioList name="ctype" legend={t('Channel type')} variant="cards" value={v.type} onChange={x => set('type', x)} options={(Object.keys(TYPE_LABEL) as ChannelType[]).map(x => { const I = TYPE_ICON[x]; return { value: x, label: t(TYPE_LABEL[x]), description: t(TYPE_DESC[x]), icon: <I size={18} /> }; })} />}
      <TextField label={t('Name')} value={v.name} onChange={e => set('name', e.target.value)} error={err.name} autoFocus required />
      <fieldset className="icon-pick">
        <legend className="flabel">{t('Icon (optional)')}</legend>
        <div className="icon-pick-grid" role="radiogroup" aria-label={t('Icon (optional)')}>
          <button type="button" role="radio" aria-checked={!v.emoji} className={`icon-opt ${!v.emoji ? 'is-on' : ''}`} onClick={() => set('emoji', '')} data-tip={t('Default for the channel type')}><Hash size={18} aria-hidden="true" /><span className="sr">{t('Default for the channel type')}</span></button>
          {(Object.keys(CHANNEL_ICONS) as ChannelIconName[]).map(k => { const I = CHANNEL_ICONS[k]; return (
            <button key={k} type="button" role="radio" aria-checked={v.emoji === k} aria-label={k} className={`icon-opt ${v.emoji === k ? 'is-on' : ''}`} onClick={() => set('emoji', k)}><I size={18} aria-hidden="true" /></button>
          ); })}
        </div>
      </fieldset>
      {!initial && <Select label={t('Category')} value={v.categoryId} onValue={x => set('categoryId', x)} options={sv.categories.map(c => [c.id, c.name] as const)} />}
      <TextField label={t('Topic (optional)')} value={v.topic} onChange={e => set('topic', e.target.value)} maxLength={120} />
      {(v.type === 'text' || v.type === 'forum') && <Select label={t('Slow mode')} value={v.slow} onValue={x => set('slow', x)} options={[['0', t('Off')], ['5', '5 s'], ['30', '30 s'], ['120', '2 min']]} />}
      <RadioList name="lock" legend={t('Access')} variant="segmented" value={v.lock} onChange={x => set('lock', x)} options={[{ value: 'none', label: t('Everyone') }, { value: 'role', label: t('Role') }, { value: 'password', label: t('Password') }, { value: 'payment', label: t('Paid') }]} />
      {v.lock === 'role' && <Select label={t('Role required')} value={v.roleId} onValue={x => set('roleId', x)} options={sv.roles.filter(r => !r.system).map(r => [r.id, r.name] as const)} hint={t('Roles above this one can also see it.')} />}
      {v.lock === 'password' && <TextField label={t('Hint shown to members')} value={v.hint} onChange={e => set('hint', e.target.value)} error={err.hint} hint={t('The password itself is set on the server in the real app; this demo never stores one.')} />}
      {v.lock === 'payment' && <TextField label={t('Price (PKR)')} prefix="Rs" inputMode="numeric" value={v.price} onChange={e => set('price', e.target.value.replace(/\D/g, ''))} error={err.price} hint={t('Members pay once. Proposed platform fee 15%.')} />}
      {v.lock === 'payment' && sv.kind === 'room' && <Note tone="warn">{t('Rooms can’t take payments until approved as a server.')}</Note>}
    </Dialog>
  );
}
const lockFrom = (v: { lock: string; roleId: string; price: string; hint: string }): ChannelLock | undefined =>
  v.lock === 'role' ? { kind: 'role', roleId: v.roleId } : v.lock === 'password' ? { kind: 'password', hint: v.hint.trim() } : v.lock === 'payment' ? { kind: 'payment', pricePkr: Number(v.price) } : undefined;

export function CreateChannelModal({ serverId, categoryId }: { serverId: string; categoryId?: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  return <ChannelForm serverId={serverId} submitLabel={t('Create channel')} initial={undefined}
    onSubmit={v => {
      if (v.lock === 'payment' && sv.kind === 'room') return;
      const lock = lockFrom(v);
      const id = createChannel(serverId, categoryId && !v.categoryId ? categoryId : v.categoryId || categoryId || sv.categories[0]!.id, { name: v.name, type: v.type, ...(v.topic ? { topic: v.topic } : {}), ...(v.emoji ? { icon: { kind: 'icon' as const, name: v.emoji as ChannelIconName } } : {}), ...(lock ? { lock } : {}) });
      closeModal(); go({ name: 'channel', serverId, channelId: id });
    }} />;
}
export function EditChannelModal({ channelId }: { channelId: string }) {
  const t = useT();
  const c = useApp(s => s.channels[channelId]);
  if (!c) return null;
  const l = c.lock;
  return <ChannelForm serverId={c.serverId} submitLabel={t('Edit #{name}', { name: c.name })} onDelete={() => { closeModal(); deleteChannel(channelId); }}
    initial={{ name: c.name, type: c.type, topic: c.topic ?? '', emoji: c.icon?.kind === 'icon' ? c.icon.name : '', lock: l?.kind ?? 'none', roleId: l?.kind === 'role' ? l.roleId : '', price: l?.kind === 'payment' ? String(l.pricePkr) : '200', hint: l?.kind === 'password' ? l.hint : '', categoryId: '', slow: String(c.slowModeSec ?? 0) }}
    onSubmit={v => { const lock = lockFrom(v); updateChannel(channelId, { name: v.name, topic: v.topic, slowModeSec: Number(v.slow), ...(v.emoji ? { icon: { kind: 'icon', name: v.emoji as ChannelIconName } } : { clearIcon: true }), ...(lock ? { lock } : { clearLock: true }) }); closeModal(); }} />;
}

const EVENT_TYPES = [['open-mic', msg('Open mic')], ['hackathon', msg('Hackathon')], ['watch-along', msg('Match watch-along')], ['ama', msg('AMA')], ['meetup', msg('Meetup')]] as const;
export function CreateEventModal({ serverId }: { serverId: string }) {
  const t = useT();
  const channels = useApp(useShallow(s => Object.values(s.channels).filter(c => c.serverId === serverId)));
  const [f, setF] = useState({ name: '', type: 'open-mic' as (typeof EVENT_TYPES)[number][0], when: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 16), channelId: channels.find(c => c.type === 'stage' || c.type === 'voice')?.id ?? channels[0]?.id ?? '', description: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 3) e.name = t('Use at least 3 characters.');
    const at = Date.parse(f.when);
    if (!Number.isFinite(at) || at < Date.now()) e.when = t('Pick a time in the future.');
    setErr(e);
    if (Object.values(e).some(Boolean)) return;
    createEvent(serverId, { name: f.name.trim(), type: f.type, startsAt: at, channelId: f.channelId, description: f.description.trim() });
    closeModal();
  };
  return (
    <Dialog title={t('Create event')} description={t('Members can RSVP and get reminders 24 hours and 15 minutes before.')} onClose={closeModal} onSubmit={submit} size="md" footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{t('Create event')}</Button></>}>
      <TextField label={t('Event name')} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} error={err.name} autoFocus required />
      <Select label={t('Type')} value={f.type} onValue={v => setF({ ...f, type: v })} options={EVENT_TYPES.map(([v, l]) => [v, t(l)] as const)} />
      <DateTimeField label={t('Starts')} value={f.when} onChange={v => setF({ ...f, when: v })} error={err.when} min={new Date().toISOString().slice(0, 10)} />
      <Select label={t('Where')} value={f.channelId} onValue={v => setF({ ...f, channelId: v })} options={channels.map(c => [c.id, c.name] as const)} />
      <TextArea label={t('Description')} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} maxLength={500} count={f.description.length} />
    </Dialog>
  );
}

export function EventModal({ eventId }: { eventId: string }) {
  const t = useT();
  const locale = useLocale();
  const e = useApp(s => s.events.find(x => x.id === eventId));
  const mine = useApp(s => s.rsvps[eventId] ?? null);
  const manage = useApp(s => (e ? s.servers[e.serverId]?.owner === ME || e.host === ME : false));
  const channel = useApp(s => (e ? s.channels[e.channelId] : undefined));
  if (!e) return null;
  return (
    <Dialog title={e.name} description={formatKarachi(e.startsAt, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }, locale) + ' PKT'} onClose={closeModal} size="md"
      footer={<>{manage && <Button variant="danger-ghost" onClick={() => { closeModal(); cancelEvent(eventId); }}>{t('Cancel event')}</Button>}<span className="grow" />{channel && <Button onClick={() => { closeModal(); go({ name: 'channel', serverId: e.serverId, channelId: e.channelId }); }}>{t('Go to {name}', { name: channel.name })}</Button>}<Button variant="primary" onClick={closeModal}>{t('Done')}</Button></>}>
      <div className="row g8 wrap"><Tag>{t(EVENT_TYPES.find(x => x[0] === e.type)?.[1] ?? msg('Meetup'))}</Tag><span className="meta">{t('{a} going · {b} interested', { a: e.going, b: e.interested })}</span></div>
      <p>{e.description}</p>
      <div className="row g8"><Avatar userId={e.host} size={24} /><span className="small">{t('Hosted by {name}', { name: useApp.getState().users[e.host]?.name ?? '' })}</span></div>
      <RadioList name="rsvp" legend={t('Your RSVP')} variant="segmented" value={(mine ?? 'none') as 'going' | 'interested' | 'none'} onChange={v => rsvp(eventId, v === 'none' ? null : v)} options={[{ value: 'going', label: t('Going') }, { value: 'interested', label: t('Interested') }, { value: 'none', label: t('Not going') }]} />
      {mine === 'going' && <p className="meta">{t('Reminders 24 hours and 15 minutes before. Delivered as Inbox items in this demo.')}</p>}
    </Dialog>
  );
}

export function NewPostModal({ channelId }: { channelId: string }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog title={t('New post')} onClose={closeModal} onSubmit={() => { if (title.trim().length < 5) { setErr(t('Use at least 5 characters.')); return; } postForum(channelId, title, body, tags.split(',').map(x => x.trim()).filter(Boolean).slice(0, 3)); closeModal(); }}
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{t('Publish')}</Button></>}>
      <TextField label={t('Title')} value={title} onChange={e => { setTitle(e.target.value); setErr(null); }} error={err} maxLength={120} autoFocus />
      <TextArea label={t('Details')} value={body} onChange={e => setBody(e.target.value)} maxLength={2000} count={body.length} rows={6} />
      <TextField label={t('Tags (comma separated, up to 3)')} value={tags} onChange={e => setTags(e.target.value)} placeholder="Physics, FSc" />
    </Dialog>
  );
}
export function PostModal({ postId }: { postId: string }) {
  const t = useT();
  const p = useApp(s => s.forum.find(x => x.id === postId));
  const users = useApp(s => s.users);
  const now = useApp(s => s.now);
  const sid = useApp(s => (p ? s.channels[p.channelId]?.serverId : undefined));
  const [reply, setReply] = useState('');
  if (!p) return null;
  return (
    <Dialog title={p.title} description={`${users[p.author]?.name} · ${relTime(p.at, now)}`} onClose={closeModal} size="lg" onSubmit={() => { if (reply.trim()) { replyForum(postId, reply); setReply(''); } }}
      footer={<><TextArea label={t('Reply')} srLabel value={reply} onChange={e => setReply(e.target.value)} rows={2} className="grow" placeholder={t('Write a reply')} /><Button type="submit" variant="primary" disabled={!reply.trim()}>{t('Reply')}</Button></>}>
      <div className="row g4 wrap">{p.tags.map(x => <Tag key={x}>{x}</Tag>)}</div>
      <p><Markdown text={p.body} serverId={sid} /></p>
      <h3 className="label">{t('{n} replies', { n: p.replies.length })}</h3>
      <ul className="col g12">{p.replies.map(r => <li key={r.id} className="row g12 start"><Avatar userId={r.author} size={32} /><div><b>{users[r.author]?.name}</b> <span className="meta">{relTime(r.at, now)}</span><p><Markdown text={r.text} serverId={sid} /></p></div></li>)}</ul>
    </Dialog>
  );
}

export function ModerateModal({ serverId, userId, action }: { serverId: string; userId: string; action: 'warn' | 'timeout' | 'kick' | 'ban' | 'remove-messages' }) {
  const t = useT();
  const user = useApp(s => s.users[userId]);
  const [reason, setReason] = useState('');
  const [mins, setMins] = useState('10');
  const [count, setCount] = useState('50');
  const title = { warn: t('Warn {name}', { name: user?.name ?? '' }), timeout: t('Time out {name}', { name: user?.name ?? '' }), kick: t('Kick {name}', { name: user?.name ?? '' }), ban: t('Ban {name}', { name: user?.name ?? '' }), 'remove-messages': t('Remove messages from {name}', { name: user?.name ?? '' }) }[action];
  const danger = action === 'kick' || action === 'ban' || action === 'remove-messages';
  return (
    <Dialog title={title} onClose={closeModal} size="sm" onSubmit={() => { if (moderate(serverId, userId, action, reason, { minutes: Number(mins), count: Number(count) })) closeModal(); }}
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant={danger ? 'danger' : 'primary'}>{t('Confirm')}</Button></>}>
      {action === 'timeout' && <Select label={t('Duration')} value={mins} onValue={setMins} options={[['10', t('10 minutes')], ['60', t('1 hour')], ['1440', t('1 day')], ['10080', t('1 week')]]} />}
      {action === 'remove-messages' && <Select label={t('How many recent messages')} value={count} onValue={setCount} options={[['10', '10'], ['50', '50'], ['500', '500']]} />}
      <TextArea label={t('Reason (shown in the case history)')} value={reason} onChange={e => setReason(e.target.value)} maxLength={300} autoFocus />
      {action === 'ban' && <p className="meta">{t('Banned members can’t rejoin until unbanned.')}</p>}
    </Dialog>
  );
}

export function EmojiUploadModal({ serverId, type }: { serverId: string; type: 'emoji' | 'sticker' }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const [name, setName] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [glyph, setGlyph] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const used = type === 'emoji' ? sv.emoji.length : sv.stickers.length;
  const slots = type === 'emoji' ? emojiSlots(sv.xp) : 10;
  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)) { setErr(t('SVG files can’t be uploaded.')); return; }
    if (!/^image\/(png|webp|gif|jpeg)$/.test(f.type)) { setErr(t('Use PNG, WebP, GIF or JPEG.')); return; }
    if (f.size > 256 * 1024) { setErr(t('Emoji and stickers must be 256 KB or smaller.')); return; }
    setErr(null); setUrl(URL.createObjectURL(f));
  };
  const submit = () => {
    if (!/^[a-z0-9_]{2,32}$/.test(name)) { setErr(t('Names use 2–32 lowercase letters, numbers or underscores.')); return; }
    if (!url && !glyph) { setErr(t('Choose an image or an emoji character.')); return; }
    if (used >= slots) { setErr(t('All {n} slots are used. Higher community levels unlock more.', { n: slots })); return; }
    addEmoji(serverId, type, { name, art: url ? { kind: 'local', url } : { kind: 'glyph', glyph, color: '#949BA8' } });
    closeModal();
  };
  return (
    <Dialog title={type === 'emoji' ? t('Add emoji') : t('Add sticker')} description={t('{used} of {slots} slots used', { used, slots })} onClose={closeModal} onSubmit={submit} size="sm"
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{t('Add')}</Button></>}>
      <TextField label={t('Name')} prefix=":" value={name} onChange={e => { setName(e.target.value.toLowerCase()); setErr(null); }} hint={t('Members type :{name}: to use it.', { name: name || 'name' })} autoFocus />
      <label className="btn btn-secondary btn-md file-btn"><Upload size={18} aria-hidden="true" /><span>{t('Choose image')}</span><input type="file" accept="image/png,image/webp,image/gif,image/jpeg" className="sr" onChange={e => onFile(e.target.files?.[0])} /></label>
      {url && <img src={url} alt={t('Preview')} className="emoji-preview" />}
      <TextField label={t('…or use an emoji character')} value={glyph} onChange={e => setGlyph([...e.target.value].slice(-2).join(''))} />
      {err && <p className="ferr" role="alert">{err}</p>}
      <p className="meta">{t('Images stay in this browser session only.')}</p>
    </Dialog>
  );
}

export function BridgeRequestModal({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const channels = useApp(useShallow(s => Object.values(s.channels).filter(c => c.serverId === serverId && c.type === 'text')));
  const dir = useApp(s => s.directory);
  const [ch, setCh] = useState(channels[0]?.id ?? '');
  const [partner, setPartner] = useState(dir[0]?.name ?? '');
  const [pch, setPch] = useState('general');
  const eligible = levelFor(sv.xp).level >= BRIDGE_LEVEL && sv.kind === 'server';
  return (
    <Dialog title={t('Request a bridge')} description={t('Both communities must be level {n} and both owners must approve.', { n: BRIDGE_LEVEL })} onClose={closeModal} size="md"
      onSubmit={() => { if (!eligible) return; update(d => { d.bridges.push({ id: uid('br'), fromChannel: ch, toServer: partner, toChannel: pch.trim() || 'general', state: 'requested' }); }); closeModal(); toast('Bridge request sent to {name}', { vars: { name: partner } }); }}
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary" disabled={!eligible}>{t('Send request')}</Button></>}>
      {!eligible && <Note tone="info">{t('This community is level {l}. Bridges unlock at level {n}.', { l: levelFor(sv.xp).level, n: BRIDGE_LEVEL })}</Note>}
      <Select label={t('Your channel')} value={ch} onValue={setCh} options={channels.map(c => [c.id, '#' + c.name] as const)} />
      <Select label={t('Partner community')} value={partner} onValue={setPartner} options={dir.map(d => [d.name, d.name] as const)} />
      <TextField label={t('Their channel')} value={pch} onChange={e => setPch(e.target.value)} />
    </Dialog>
  );
}

export function ExpertRequestModal({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const [need, setNeed] = useState('');
  return (
    <Dialog title={t('Free expert setup')} description={t('Ghar experts can build channels, roles, Developer Portal setup and branding. They get temporary access that’s removed when done.')} onClose={closeModal} size="md"
      onSubmit={() => { if (need.trim().length < 10) return; update(d => { d.expertTickets.unshift({ id: uid('ex'), server: sv.name, requester: ME, need: need.trim(), state: 'requested', at: Date.now() }); }); closeModal(); toast('Request sent. An expert will reply in your Inbox.'); }}
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary" disabled={need.trim().length < 10}>{t('Send request')}</Button></>}>
      <TextArea label={t('What do you need?')} value={need} onChange={e => setNeed(e.target.value)} maxLength={600} count={need.length} autoFocus />
      <DemoTag>{t('Tracked in the staff console demo')}</DemoTag>
    </Dialog>
  );
}
