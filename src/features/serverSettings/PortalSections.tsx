import { SocialLinksManager, SocialChips } from '@/features/social/SocialLinks';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Ticket, Download, UserCheck, XCircle, RotateCcw, Send, Bomb, Camera, Search, Plus, Trash2, Eye, Copy, Code2, Gavel, Bot, History, Lock } from 'lucide-react';
import { useApp } from '@/state/store';
import { canManage } from '@/state/selectors';
import { toast } from '@/state/actions/ui';
import { savePortal, openTicket, ticketReply, claimTicket, closeTicket, reopenTicket, downloadTranscript, takeSnapshot, simulateNuke, restoreSnapshot, unfreeze, toggleBot, setBotPerms, createWebhook, deleteWebhook, createApp, deleteApp, exportAudit } from '@/state/actions/portal';
import { useT, useLocale, msg, type Key } from '@/i18n';
import type { AutomodAction } from '@/domain/automod';
import { evaluate } from '@/domain/automod';
import { matchScore } from '@/domain/search';
import { formatKarachi, relTime } from '@/domain/time';
import { useDraft } from '@/hooks/useDraft';
import { Button, IconButton } from '@/ui/Button';
import { Empty, Note, Section, Tag, DemoTag } from '@/ui/Misc';
import { Checkbox, RadioList, Select, TextArea, TextField, Toggle } from '@/ui/Form';
import { SaveBar } from '@/ui/SaveBar';
import { Avatar } from '@/ui/Avatar';
import { Markdown } from '@/ui/Markdown';

const ACTIONS: AutomodAction[] = ['delete', 'warn', 'timeout', 'kick', 'ban', 'alert'];
const ACTION_LABEL: Record<AutomodAction, Key> = { delete: msg('Delete message'), warn: msg('Warn'), timeout: msg('Time out'), kick: msg('Kick'), ban: msg('Ban'), alert: msg('Alert moderators') };

function useTextChannels(serverId: string) {
  return useApp(useShallow(s => Object.values(s.channels).filter(c => c.serverId === serverId && (c.type === 'text' || c.type === 'announcement'))));
}

/* ---------------- tickets (DPT-02) ---------------- */
export function TicketsSection({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const cfg = useApp(s => s.portal[serverId]!.tickets);
  const roles = useApp(useShallow(s => s.servers[serverId]!.roles.filter(r => !r.system)));
  const tickets = useApp(useShallow(s => s.tickets.filter(x => x.serverId === serverId)));
  const users = useApp(s => s.users);
  const chans = useTextChannels(serverId);
  const { draft: d, patch, dirty, reset } = useDraft(cfg);
  const [sel, setSel] = useState<string | null>(tickets[0]?.id ?? null);
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [reply, setReply] = useState('');
  const [newSubj, setNewSubj] = useState('');
  const tk = tickets.find(x => x.id === sel);
  const list = tickets.filter(x => filter === 'all' || (filter === 'closed' ? x.state === 'closed' : x.state !== 'closed'));
  return (
    <div className="ss-page">
      <Section title={t('Ticket panel')}>
        <Toggle label={t('Tickets on')} checked={d.enabled} onChange={v => patch({ enabled: v })} />
        <Select label={t('Panel channel')} value={d.panelChannelId} onValue={v => patch({ panelChannelId: v })} options={chans.map(c => [c.id, '#' + c.name] as const)} hint={t('Members press “Open a ticket” in this channel.')} />
        <Select label={t('Staff role that sees tickets')} value={d.staffRoleId} onValue={v => patch({ staffRoleId: v })} options={roles.map(r => [r.id, r.name] as const)} />
        <TextArea label={t('Greeting')} value={d.greeting} onChange={e => patch({ greeting: e.target.value })} maxLength={300} />
        <Toggle label={t('Save a transcript when a ticket closes')} checked={d.transcripts} onChange={v => patch({ transcripts: v })} />
        <SaveBar dirty={dirty} onSave={() => savePortal(serverId, 'tickets', d)} onDiscard={reset} />
      </Section>
      <Section title={t('Tickets')} actions={<RadioList name="tkf" legend={t('Show')} srLegend variant="segmented" value={filter} onChange={setFilter} options={[{ value: 'open', label: t('Open') }, { value: 'closed', label: t('Closed') }, { value: 'all', label: t('All') }]} />}>
        <form className="row g8 wrap" onSubmit={e => { e.preventDefault(); if (newSubj.trim().length >= 3) { const id = openTicket(serverId, newSubj, newSubj); setSel(id); setNewSubj(''); setFilter('open'); } }}>
          <TextField label={t('Open a test ticket as a member')} value={newSubj} onChange={e => setNewSubj(e.target.value)} placeholder={t('What do you need help with?')} className="grow" />
          <Button type="submit" icon={Ticket} disabled={newSubj.trim().length < 3}>{t('Open ticket')}</Button>
        </form>
        <div className="tickets">
          <ul className="ticket-list" aria-label={t('Tickets')}>{list.map(x => (
            <li key={x.id}><button type="button" className={`ticket-row ${sel === x.id ? 'is-on' : ''}`} aria-current={sel === x.id} onClick={() => setSel(x.id)}>
              <span className="grow"><b>#{x.number} {x.subject}</b><span className="meta block">{users[x.opener]?.name} · {relTime(x.createdAt, Date.now())}</span></span>
              <Tag tone={x.state === 'closed' ? 'neutral' : x.state === 'claimed' ? 'info' : 'amber'}>{t(({ open: msg('Open'), claimed: msg('Claimed'), closed: msg('Closed') } as const)[x.state])}</Tag>
            </button></li>
          ))}{!list.length && <li className="meta pad12">{t('No tickets here.')}</li>}</ul>
          {tk ? (
            <section className="ticket-conv" aria-label={t('Ticket #{n}', { n: tk.number })}>
              <header className="row g8 wrap"><b className="grow">#{tk.number} · {tk.subject}</b><Lock size={14} aria-hidden="true" /><span className="meta">{t('Private: opener and staff only')}</span></header>
              <p className="meta">{tk.claimedBy ? t('Claimed by {name}', { name: users[tk.claimedBy]?.name ?? '' }) : t('Unclaimed')}</p>
              <ol className="ticket-msgs">{tk.messages.map(m => <li key={m.id} className={m.system ? 'is-sys' : ''}>{m.system ? <span className="meta">{m.text}</span> : <><Avatar userId={m.author} size={24} /><span><b>{users[m.author]?.name}</b> <span className="meta">{formatKarachi(m.at, { hour: 'numeric', minute: '2-digit' }, locale)}</span><br /><Markdown text={m.text} /></span></>}</li>)}</ol>
              {tk.state !== 'closed' && <form className="row g8" onSubmit={e => { e.preventDefault(); ticketReply(tk.id, reply); setReply(''); }}><TextField label={t('Reply')} srLabel value={reply} onChange={e => setReply(e.target.value)} placeholder={t('Reply to the ticket')} className="grow" /><IconButton type="submit" icon={Send} label={t('Send reply')} disabled={!reply.trim()} /></form>}
              <div className="row g8 wrap">
                {tk.state === 'open' && <Button size="sm" icon={UserCheck} onClick={() => claimTicket(tk.id)}>{t('Claim')}</Button>}
                {tk.state !== 'closed' ? <Button size="sm" icon={XCircle} onClick={() => closeTicket(tk.id)}>{t('Close')}</Button> : <Button size="sm" icon={RotateCcw} onClick={() => reopenTicket(tk.id)}>{t('Reopen')}</Button>}
                <Button size="sm" icon={Download} onClick={() => downloadTranscript(tk.id)}>{t('Download transcript')}</Button>
              </div>
            </section>
          ) : <Empty icon={Ticket} title={t('Select a ticket')} />}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- welcome (DPT-03) ---------------- */
export function WelcomeSection({ serverId }: { serverId: string }) {
  const t = useT();
  const cfg = useApp(s => s.portal[serverId]!.welcome);
  const sv = useApp(s => s.servers[serverId]!);
  const chans = useTextChannels(serverId);
  const { draft: d, patch, dirty, reset } = useDraft(cfg);
  const fill = (s: string) => s.replace(/\{user\}/g, '@sana.j').replace(/\{server\}/g, sv.name);
  return (
    <div className="ss-page settings-split">
      <div className="col g16">
        <Toggle label={t('Welcome new members')} checked={d.enabled} onChange={v => patch({ enabled: v })} />
        <Select label={t('Post in')} value={d.channelId} onValue={v => patch({ channelId: v })} options={chans.map(c => [c.id, '#' + c.name] as const)} />
        <TextArea label={t('Welcome message')} value={d.message} onChange={e => patch({ message: e.target.value })} maxLength={400} hint={t('Use {user} for the new member and {server} for the community name.')} />
        <Toggle label={t('Also send a DM')} checked={d.dm} onChange={v => patch({ dm: v })} />
        {d.dm && <TextArea label={t('DM message')} value={d.dmMessage} onChange={e => patch({ dmMessage: e.target.value })} maxLength={400} />}
        <Select label={t('Give this role on join')} value={d.autoRoleId} onValue={v => patch({ autoRoleId: v })} options={[['', t('No role')], ...sv.roles.filter(r => !r.system && r.position > 2).map(r => [r.id, r.name] as const)]} />
        <Toggle label={t('Rules gate')} description={t('New members must accept the rules before they can post.')} checked={d.rulesGate} onChange={v => patch({ rulesGate: v })} />
        {d.rulesGate && <TextArea label={t('Rules')} value={d.rules} onChange={e => patch({ rules: e.target.value })} maxLength={800} />}
        <SaveBar dirty={dirty} onSave={() => savePortal(serverId, 'welcome', d)} onDiscard={reset} />
      </div>
      <aside className="preview-card" aria-label={t('Preview')}>
        <h3 className="label">{t('Preview')}</h3>
        {d.enabled ? <div className="panel panel-pad col g8"><span className="meta">#{chans.find(c => c.id === d.channelId)?.name}</span><p>{fill(d.message)}</p>{d.dm && <><span className="meta">{t('DM')}</span><p>{fill(d.dmMessage)}</p></>}{d.rulesGate && <><span className="meta">{t('Rules gate')}</span><p className="small">{d.rules}</p><Button size="sm" variant="primary">{t('I accept the rules')}</Button></>}</div> : <p className="meta">{t('Welcome is off.')}</p>}
      </aside>
    </div>
  );
}

/* ---------------- auto-moderation (DPT-04) ---------------- */
export function AutomodSection({ serverId }: { serverId: string }) {
  const t = useT();
  const cfg = useApp(s => s.portal[serverId]!.automod);
  const e2ee = useApp(s => !!s.servers[serverId]!.e2ee);
  const { draft: d, patch, dirty, reset } = useDraft(cfg);
  const [test, setTest] = useState('');
  const result = useMemo(() => (test.trim() ? evaluate(test, d) : []), [test, d]);
  if (e2ee) return <div className="ss-page"><Note tone="info" title={t('Auto-moderation is off')}>{t('This community is end-to-end encrypted, so messages can’t be scanned. Members see this clearly.')}</Note></div>;
  const actSel = (label: string, v: AutomodAction, on: (v: AutomodAction) => void) => <Select label={label} value={v} onValue={on} options={ACTIONS.map(a => [a, t(ACTION_LABEL[a])] as const)} />;
  return (
    <div className="ss-page">
      <Section title={t('Word filter')} description={t('Any language or script, including Roman Urdu. Common letter swaps (like 5 for s) are caught.')}>
        <TextArea label={t('Blocked words and phrases (one per line)')} value={d.words.join('\n')} onChange={e => patch({ words: e.target.value.split('\n') })} rows={4} />
        {actSel(t('When matched'), d.wordAction, v => patch({ wordAction: v }))}
      </Section>
      <Section title={t('Links and invites')}>
        <Toggle label={t('Block links')} checked={d.blockLinks} onChange={v => patch({ blockLinks: v })} />
        {d.blockLinks && <TextField label={t('Allowed sites (comma separated)')} value={d.allowedHosts.join(', ')} onChange={e => patch({ allowedHosts: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />}
        <Toggle label={t('Block invites to other communities')} checked={d.blockInvites} onChange={v => patch({ blockInvites: v })} />
        {actSel(t('When matched'), d.linkAction, v => patch({ linkAction: v }))}
      </Section>
      <Section title={t('Spam and raids')}>
        <div className="row g12 wrap">
          <TextField label={t('Max mentions per message (0 = off)')} inputMode="numeric" value={String(d.mentionLimit)} onChange={e => patch({ mentionLimit: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          <TextField label={t('Same message repeated (0 = off)')} inputMode="numeric" value={String(d.spamRepeat)} onChange={e => patch({ spamRepeat: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          <TextField label={t('Raid alert: joins per minute')} inputMode="numeric" value={String(d.raidJoinsPerMinute)} onChange={e => patch({ raidJoinsPerMinute: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
        </div>
        {actSel(t('When spam is detected'), d.spamAction, v => patch({ spamAction: v }))}
      </Section>
      <Section title={t('Try it')} description={t('Type a message to see which rule would act, using the settings above (saved or not).')}>
        <TextField label={t('Test message')} value={test} onChange={e => setTest(e.target.value)} />
        <div aria-live="polite">{test.trim() && (result.length ? <ul className="col g4">{result.map((v, i) => <li key={i} className="row g8"><Tag tone="red">{v.rule}</Tag><span className="small">{v.detail} → {t(ACTION_LABEL[v.action])}</span></li>)}</ul> : <p className="ok small">{t('No rule matches. It would be posted.')}</p>)}</div>
      </Section>
      <SaveBar dirty={dirty} onSave={() => savePortal(serverId, 'automod', { ...d, words: d.words.map(w => w.trim()).filter(Boolean) })} onDiscard={reset} />
    </div>
  );
}

/* ---------------- moderation cases (DPT-05) ---------------- */
export function ModerationSection({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const cases = useApp(useShallow(s => s.modCases.filter(c => c.serverId === serverId)));
  const users = useApp(s => s.users);
  const [q, setQ] = useState('');
  const list = cases.filter(c => !q.trim() || matchScore(q, [users[c.memberId]?.name ?? '', c.reason, c.action]) > 0);
  return (
    <div className="ss-page">
      <p className="muted small">{t('Warn, time out, kick, ban or remove messages from the Members page or a message’s menu. Every action is recorded here.')}</p>
      <TextField label={t('Search cases')} srLabel icon={Search} placeholder={t('Search cases')} value={q} onChange={e => setQ(e.target.value)} />
      {list.length ? <ul className="flist">{list.map(c => <li key={c.id} className="frow"><div className="frow-main"><Gavel size={18} aria-hidden="true" /><span className="person-text"><b>{users[c.memberId]?.name ?? c.memberId} · {c.action}{c.detail ? ` (${c.detail})` : ''}</b><em>{c.reason} · {t('by {name}', { name: users[c.by]?.name ?? c.by })} · {formatKarachi(c.at, { dateStyle: 'medium', timeStyle: 'short' }, locale)}</em></span></div></li>)}</ul> : <Empty icon={Gavel} title={t('No cases')} />}
    </div>
  );
}

/* ---------------- anti-nuke (DPT-06) ---------------- */
export function AntiNukeSection({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const cfg = useApp(s => s.portal[serverId]!.antinuke);
  const snaps = useApp(useShallow(s => s.snapshots.filter(x => x.serverId === serverId)));
  const { draft: d, patch, dirty, reset } = useDraft(cfg);
  return (
    <div className="ss-page">
      {cfg.frozen && <Note tone="danger" title={t('Community frozen')} action={<Button size="sm" onClick={() => unfreeze(serverId)}>{t('Unfreeze')}</Button>}>{cfg.alert}</Note>}
      <Section title={t('Protection')} description={t('If one account does too much damage too fast, Ghar removes its permissions, freezes the community and alerts the owner.')}>
        <Toggle label={t('Anti-nuke on')} checked={d.enabled} onChange={v => patch({ enabled: v })} />
        <div className="row g12 wrap">
          <TextField label={t('Channel deletes allowed')} inputMode="numeric" value={String(d.channelDeletes)} onChange={e => patch({ channelDeletes: Number(e.target.value.replace(/\D/g, '')) || 1 })} />
          <TextField label={t('Bans allowed')} inputMode="numeric" value={String(d.bans)} onChange={e => patch({ bans: Number(e.target.value.replace(/\D/g, '')) || 1 })} />
          <TextField label={t('Within (seconds)')} inputMode="numeric" value={String(d.windowSec)} onChange={e => patch({ windowSec: Number(e.target.value.replace(/\D/g, '')) || 60 })} />
        </div>
        <Toggle label={t('Apply to admins too')} checked={!d.exemptAdmins} onChange={v => patch({ exemptAdmins: !v })} />
        <SaveBar dirty={dirty} onSave={() => savePortal(serverId, 'antinuke', d)} onDiscard={reset} />
      </Section>
      <Section title={t('Snapshots')} description={t('Roles, categories and channels saved for one-click restore.')} actions={<Button size="sm" icon={Camera} onClick={() => takeSnapshot(serverId)}>{t('Take snapshot')}</Button>}>
        <ul className="flist">{snaps.map(s => <li key={s.id} className="frow"><div className="frow-main"><Camera size={18} aria-hidden="true" /><span className="person-text"><b>{formatKarachi(s.at, { dateStyle: 'medium', timeStyle: 'short' }, locale)}</b><em>{t('{a} roles · {b} channels', { a: s.roles.length, b: s.channels.length })}</em></span></div><Button size="sm" icon={RotateCcw} onClick={() => restoreSnapshot(serverId, s.id)}>{t('Restore')}</Button></li>)}</ul>
      </Section>
      <Section title={t('Test it')}>
        <div className="row g8 wrap"><Button variant="danger-ghost" icon={Bomb} onClick={() => simulateNuke(serverId)}>{t('Simulate a mass deletion')}</Button><DemoTag>{t('Deletes channels locally, then restore from a snapshot')}</DemoTag></div>
      </Section>
    </div>
  );
}

/* ---------------- logs (DPT-07) & audit (DPT-08) ---------------- */
const LOG_EVENTS: [keyof import('@/fixtures/portal').LogsConfig['events'], Key][] = [['joins', msg('Joins')], ['leaves', msg('Leaves')], ['edits', msg('Message edits')], ['deletes', msg('Message deletes')], ['roles', msg('Role changes')], ['channels', msg('Channel changes')], ['voice', msg('Voice moves')], ['moderation', msg('Moderation actions')]];
export function LogsSection({ serverId }: { serverId: string }) {
  const t = useT();
  const cfg = useApp(s => s.portal[serverId]!.logs);
  const chans = useTextChannels(serverId);
  const { draft: d, setDraft, dirty, reset } = useDraft(cfg);
  return (
    <div className="ss-page">
      <Select label={t('Post logs in')} value={d.channelId} onValue={v => setDraft({ ...d, channelId: v })} options={chans.map(c => [c.id, '#' + c.name] as const)} />
      <fieldset className="col g4"><legend className="flabel">{t('What to log')}</legend>{LOG_EVENTS.map(([k, l]) => <Checkbox key={k} label={t(l)} checked={d.events[k]} onChange={v => setDraft({ ...d, events: { ...d.events, [k]: v } })} />)}</fieldset>
      <SaveBar dirty={dirty} onSave={() => savePortal(serverId, 'logs', d)} onDiscard={reset} />
    </div>
  );
}
export function AuditSection({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const entries = useApp(useShallow(s => s.audit.filter(a => a.serverId === serverId)));
  const users = useApp(s => s.users);
  const allowed = useApp(s => canManage(s, serverId, 'viewAudit'));
  const [q, setQ] = useState('');
  const [actor, setActor] = useState('');
  const actors = [...new Set(entries.map(e => e.actor))];
  const list = entries.filter(e => (!actor || e.actor === actor) && (!q.trim() || matchScore(q, [e.action, e.target ?? '', users[e.actor]?.name ?? '']) > 0));
  if (!allowed) return <div className="ss-page"><Note tone="info">{t('You need the View audit log permission.')}</Note></div>;
  return (
    <div className="ss-page">
      <div className="row g12 wrap end-row">
        <TextField label={t('Search')} icon={Search} value={q} onChange={e => setQ(e.target.value)} className="grow" />
        <Select label={t('By')} value={actor} onValue={setActor} options={[['', t('Anyone')], ...actors.map(a => [a, users[a]?.name ?? a] as const)]} />
        <Button icon={Download} onClick={() => exportAudit(serverId)}>{t('Export CSV')}</Button>
      </div>
      {list.length ? <ul className="flist">{list.map(e => <li key={e.id} className="frow"><div className="frow-main"><History size={16} aria-hidden="true" /><span className="person-text"><b>{e.action}{e.target ? ` · ${e.target}` : ''}</b><em>{users[e.actor]?.name ?? e.actor} · {formatKarachi(e.at, { dateStyle: 'medium', timeStyle: 'short' }, locale)}</em></span></div></li>)}</ul> : <Empty icon={History} title={t('Nothing matches')} />}
    </div>
  );
}

/* ---------------- bots, webhooks, integrations, apps (DEV-01..03) ---------------- */
const BOT_PERMS = ['Read messages', 'Send messages', 'Add reactions', 'Embed links', 'Manage messages', 'Kick members'];
export function BotsSection() {
  const t = useT();
  const bots = useApp(s => s.bots);
  const users = useApp(s => s.users);
  return (
    <div className="ss-page">
      <Note>{t('Bots only get the permissions you tick. Changes apply immediately.')}</Note>
      <ul className="col g12">{bots.map(b => (
        <li key={b.id} className="panel panel-pad col g8">
          <div className="row g8"><Bot size={20} aria-hidden="true" /><b className="grow">{b.name}</b><span className="meta">{t('by {name}', { name: users[b.by]?.name ?? b.by })}</span><Button size="sm" variant={b.added ? 'danger-ghost' : 'primary'} onClick={() => toggleBot(b.id)}>{b.added ? t('Remove') : t('Add')}</Button></div>
          <p className="small muted">{b.description}</p>
          {b.added && <fieldset className="perm-grid"><legend className="flabel">{t('Permissions')}</legend>{BOT_PERMS.map(p => <Checkbox key={p} label={p} checked={b.perms.includes(p)} onChange={v => setBotPerms(b.id, v ? [...b.perms, p] : b.perms.filter(x => x !== p))} />)}</fieldset>}
        </li>
      ))}</ul>
    </div>
  );
}

export function IntegrationsSection({ serverId }: { serverId: string }) {
  const t = useT();
  const hooks = useApp(s => s.webhooks);
  const chans = useTextChannels(serverId);
  const [name, setName] = useState('');
  const [ch, setCh] = useState(chans[0]?.id ?? '');
  const [shown, setShown] = useState<string | null>(null);
  const url = (id: string) => `https://ghar.example/api/webhooks/${id}/demo-token-not-real`;
  return (
    <div className="ss-page">
      <Section title={t('Community social profiles')} description={t('Link the community’s official profiles so members can find them. They appear on the community’s page.')}>
        <SocialLinksManager owner={`server:${serverId}`} subject="community" />
        <div className="col g8"><span className="flabel">{t('How members see it')}</span><SocialChips owner={`server:${serverId}`} /></div>
      </Section>
      <Section title={t('Incoming webhooks')} description={t('Let your own tools post notices into a channel. URLs here are fake demo values and receive nothing.')}>
        <form className="row g8 wrap end-row" onSubmit={e => { e.preventDefault(); if (name.trim()) { createWebhook(name, ch); setName(''); } }}>
          <TextField label={t('Name')} value={name} onChange={e => setName(e.target.value)} className="grow" />
          <Select label={t('Channel')} value={ch} onValue={setCh} options={chans.map(c => [c.id, '#' + c.name] as const)} />
          <Button type="submit" icon={Plus} disabled={!name.trim()}>{t('Create')}</Button>
        </form>
        {hooks.length ? <ul className="flist">{hooks.map(h => (
          <li key={h.id} className="frow"><div className="frow-main"><Code2 size={18} aria-hidden="true" /><span className="person-text"><b>{h.name}</b><em className="ltr ellip">{shown === h.id ? url(h.id) : '••••••••••••'}</em></span></div>
            <IconButton icon={Eye} size="sm" label={shown === h.id ? t('Hide URL') : t('Show URL')} onClick={() => setShown(s => (s === h.id ? null : h.id))} />
            <IconButton icon={Copy} size="sm" label={t('Copy URL')} onClick={() => navigator.clipboard?.writeText(url(h.id)).then(() => toast('Copied'), () => toast('Couldn’t copy. Select the text instead.', { tone: 'warn' }))} />
            <IconButton icon={Trash2} size="sm" label={t('Delete webhook')} onClick={() => deleteWebhook(h.id)} /></li>
        ))}</ul> : <p className="meta">{t('No webhooks yet.')}</p>}
      </Section>
    </div>
  );
}

const SCOPES = ['identify', 'guilds', 'messages.read', 'bot'];
export function AppsSection() {
  const t = useT();
  const apps = useApp(s => s.devApps);
  const [name, setName] = useState('');
  const [redirect, setRedirect] = useState('https://');
  const [scopes, setScopes] = useState<string[]>(['identify']);
  const [bot, setBot] = useState(false);
  const [reveal, setReveal] = useState<string | null>(null);
  const err = redirect && !/^https:\/\/[^\s/]+\.[^\s]+/.test(redirect) ? t('Use an https:// address.') : null;
  return (
    <div className="ss-page">
      <Note>{t('OAuth2 apps and bot tokens for the public API. Every credential shown here is a fake demo value.')}</Note>
      <Section title={t('New app')}>
        <TextField label={t('App name')} value={name} onChange={e => setName(e.target.value)} />
        <TextField label={t('Redirect URL')} value={redirect} onChange={e => setRedirect(e.target.value)} error={err} dir="ltr" />
        <fieldset className="row g12 wrap"><legend className="flabel">{t('Scopes')}</legend>{SCOPES.map(s => <Checkbox key={s} label={s} checked={scopes.includes(s)} onChange={v => setScopes(x => (v ? [...x, s] : x.filter(y => y !== s)))} />)}</fieldset>
        <Toggle label={t('Create a bot user')} checked={bot} onChange={setBot} />
        <Button variant="primary" icon={Plus} disabled={!name.trim() || !!err || redirect === 'https://'} onClick={() => { createApp(name, redirect, scopes, bot); setName(''); }}>{t('Create app')}</Button>
      </Section>
      <Section title={t('Your apps')}>
        <ul className="flist">{apps.map(a => (
          <li key={a.id} className="frow"><div className="frow-main"><Code2 size={18} aria-hidden="true" /><span className="person-text"><b>{a.name}</b><em className="ltr">{a.clientId} · {a.scopes.join(', ')}{a.bot ? ' · bot' : ''}</em>{reveal === a.id && <em className="ltr">demo-secret-{a.id}-not-real</em>}</span></div>
            <Button size="sm" variant="ghost" onClick={() => setReveal(r => (r === a.id ? null : a.id))}>{reveal === a.id ? t('Hide secret') : t('Reveal secret')}</Button>
            <IconButton icon={Trash2} size="sm" label={t('Delete app')} onClick={() => deleteApp(a.id)} /></li>
        ))}</ul>
      </Section>
    </div>
  );
}
export function PortalLocked() { const t = useT(); return <div className="ss-page"><Note tone="info" title={t('No access')}>{t('The Developer Portal is for the owner and roles with “Manage Developer Portal”.')}</Note></div>; }
