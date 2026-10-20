import { useMemo, useState } from 'react';
import { Users, Plug, Shield, LogOut, Activity, Inbox, Flag, Ban, BadgeCheck, GraduationCap, AtSign, LifeBuoy, EyeOff, History, KeyRound, Check, X, Download, Search, Plus, ShieldCheck, AlertTriangle, FileCheck } from 'lucide-react';
import { useApp } from '@/state/store';
import { go } from '@/state/actions/ui';
import { staffSignIn, staffSignOut, decideApplication, decideReport, addBan, liftBan, decideAppeal, setBadge, saveBadgeType, bulkPreview, bulkApply, reviewAssessment, addReserved, releaseReserved, assignExpert, advanceExpert, createDecoy, toggleDecoy, decideKyc, exportStaffAudit } from '@/state/actions/staff';
import { useT, useLocale, msg, type Key } from '@/i18n';
import type { StaffSection } from '@/state/types';
import type { ProofState } from '@/types/models';
import { fmt } from '@/domain/format';
import { formatKarachi, relTime } from '@/domain/time';
import { matchScore } from '@/domain/search';
import { usePhone } from '@/hooks/useMedia';
import { Button } from '@/ui/Button';
import { Empty, Note, Section, Stat, Tag, DemoTag } from '@/ui/Misc';
import { Checkbox, RadioList, Select, TextArea, TextField } from '@/ui/Form';
import { Avatar } from '@/ui/Avatar';
import { NavItem } from '@/shell/Sidebar';
import { DASHBOARD, STAFF, QUESTIONS, PASS_MARK } from '@/fixtures/staff';
import { DatePicker } from '@/ui/Pickers';
import { AdminUsers, AdminIntegrations } from './AdminViews';

const NAV: [StaffSection, Key, typeof Activity][] = [
  ['dashboard', msg('Dashboard'), Activity], ['users', msg('Users'), Users], ['integrations', msg('Integration status'), Plug], ['applications', msg('Server applications'), Inbox], ['reports', msg('Reports'), Flag], ['bans', msg('Bans & appeals'), Ban],
  ['badges', msg('Badges'), BadgeCheck], ['certification', msg('Moderator certification'), GraduationCap], ['reserved', msg('Reserved usernames'), AtSign],
  ['expert', msg('Expert tickets'), LifeBuoy], ['decoys', msg('Undercover accounts'), EyeOff], ['audit', msg('Audit log'), History],
];

/** ADM-01: a separate staff experience behind its own (demo) sign-in. Local role fixtures demonstrate presentation; they are not authorization. */
export function StaffConsole() {
  const t = useT();
  const authed = useApp(s => s.staffAuthed);
  const route = useApp(s => s.route);
  const phone = usePhone();
  const section = route.name === 'staff' ? route.section : 'dashboard';
  if (!authed) return <StaffGate />;
  return (
    <div className="staff">
      <header className="staff-bar">
        <Shield size={18} aria-hidden="true" /><b>{t('Ghar Staff')}</b><span className="meta hide-narrow">{t('Team-only console · separate from the app')}</span>
        <DemoTag>{t('Demo: local fixtures, not real authorization')}</DemoTag>
        <span className="grow" />
        <Button size="sm" variant="ghost" icon={LogOut} onClick={staffSignOut}>{t('Exit console')}</Button>
      </header>
      <div className="staff-body">
        <nav className={`staff-nav ${phone ? 'is-phone' : ''}`} aria-label={t('Staff sections')}>
          {phone ? <Select label={t('Section')} value={section} onValue={v => go({ name: 'staff', section: v }, { replace: true })} options={NAV.map(([id, l]) => [id, t(l)] as const)} />
            : <div className="navgroup">{NAV.map(([id, l, I]) => <NavItem key={id} icon={<I size={18} />} label={t(l)} active={section === id} onClick={() => go({ name: 'staff', section: id }, { replace: true })} />)}</div>}
        </nav>
        <main className="staff-main scroll" id="main">
          <div className="page page-wide">
            <h1 className="page-title">{t(NAV.find(n => n[0] === section)![1])}</h1>
            {section === 'dashboard' && <Dashboard />}
            {section === 'users' && <AdminUsers />}
            {section === 'integrations' && <AdminIntegrations />}
            {section === 'applications' && <Applications />}
            {section === 'reports' && <Reports />}
            {section === 'bans' && <Bans />}
            {section === 'badges' && <Badges />}
            {section === 'certification' && <Certification />}
            {section === 'reserved' && <Reserved />}
            {section === 'expert' && <Expert />}
            {section === 'decoys' && <Decoys />}
            {section === 'audit' && <Audit />}
          </div>
        </main>
      </div>
    </div>
  );
}

function StaffGate() {
  const t = useT();
  const [step, setStep] = useState<0 | 1>(0);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="staff-gate">
      <div className="gate-card">
        <Shield size={28} aria-hidden="true" />
        <h1 className="page-title">{t('Ghar staff console')}</h1>
        <p className="muted">{t('For the Ghar development team only. In production this sits on its own domain behind team SSO and a hardware key.')}</p>
        {step === 0 ? <Button variant="primary" icon={ShieldCheck} block onClick={() => setStep(1)}>{t('Continue with team SSO (demo)')}</Button> : (
          <form className="col g12" onSubmit={e => { e.preventDefault(); if (code === '391000') { setCode(''); staffSignIn(); } else setErr(t('That code isn’t right.')); }}>
            <TextField label={t('Security key code')} inputMode="numeric" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setErr(null); }} error={err} hint={t('Demo code: 391000')} autoFocus autoComplete="one-time-code" />
            <Button type="submit" variant="primary" icon={KeyRound} block>{t('Verify')}</Button>
          </form>
        )}
        <Button variant="ghost" onClick={() => go({ name: 'inbox' })}>{t('Back to Ghar')}</Button>
      </div>
    </div>
  );
}

function Dashboard() {
  const t = useT();
  const reports = useApp(s => s.reports.filter(r => r.status === 'open').length);
  const apps = useApp(s => s.applications.filter(a => a.status === 'pending').length);
  const kyc = useApp(s => s.kyc);
  return (
    <>
      <div className="stats3">
        <Stat label={t('Daily users')} value={fmt(DASHBOARD.dailyUsers)} sub={t('Sample')} />
        <Stat label={t('Online now')} value={fmt(DASHBOARD.onlineNow)} />
        <Stat label={t('Open reports')} value={String(reports)} sub={t('{n} priority', { n: DASHBOARD.priorityReports })} tone="bad" />
        <Stat label={t('Pending applications')} value={String(apps)} />
        <Stat label={t('Revenue today (test)')} value={`Rs ${fmt(DASHBOARD.revenueTodayPkr)}`} />
      </div>
      <Section title={t('System health')}>
        <ul className="flist">{DASHBOARD.health.map(([n, s]) => <li key={n} className="frow"><span className="grow">{n}</span><Tag tone={s === 'Normal' ? 'green' : 'amber'} icon={s === 'Normal' ? Check : AlertTriangle}>{s === 'Normal' ? t('Normal') : t('Degraded')}</Tag></li>)}</ul>
      </Section>
      {kyc === 'pending' && <Section title={t('Creator verification queue')}><div className="frow"><Avatar userId="me" size={32} /><span className="grow">{t('Kaif · CNIC check (number not stored)')}</span><Button size="sm" icon={Check} onClick={() => decideKyc(true)}>{t('Approve')}</Button><Button size="sm" variant="danger-ghost" icon={X} onClick={() => decideKyc(false)}>{t('Reject')}</Button></div></Section>}
    </>
  );
}

function Applications() {
  const t = useT();
  const locale = useLocale();
  const apps = useApp(s => s.applications);
  const users = useApp(s => s.users);
  const [sel, setSel] = useState(apps[0]?.id ?? '');
  const [note, setNote] = useState('');
  const a = apps.find(x => x.id === sel);
  return (
    <div className="split-list">
      <ul className="ticket-list">{apps.map(x => <li key={x.id}><button type="button" className={`ticket-row ${sel === x.id ? 'is-on' : ''}`} aria-current={sel === x.id} onClick={() => { setSel(x.id); setNote(''); }}><span className="grow"><b>{x.name}</b><span className="meta block">{x.category} · {users[x.applicant]?.name} · {relTime(x.submittedAt, Date.now())}</span></span><Tag tone={x.status === 'approved' ? 'green' : x.status === 'rejected' ? 'red' : x.status === 'changes-requested' ? 'amber' : 'info'}>{x.status}</Tag></button></li>)}</ul>
      {a ? (
        <section className="panel panel-pad col g12" aria-label={a.name}>
          <h2 className="sec-title">{a.name}</h2>
          <p className="meta">{t('Submitted {date}', { date: formatKarachi(a.submittedAt, { dateStyle: 'medium', timeStyle: 'short' }, locale) })} · {a.phoneVerified ? t('Phone verified') : t('Phone not verified')}</p>
          <dl className="app-dl"><dt>{t('Purpose')}</dt><dd>{a.purpose}</dd><dt>{t('Moderation plan')}</dt><dd>{a.moderationPlan}</dd><dt>{t('Samples')}</dt><dd>{a.samples || '—'}</dd></dl>
          {a.notes.length > 0 && <ul className="col g4">{a.notes.map((n, i) => <li key={i} className="small"><b>{STAFF.find(s => s.id === n.by)?.name ?? n.by}:</b> {n.text}</li>)}</ul>}
          <TextArea label={t('Note to applicant')} value={note} onChange={e => setNote(e.target.value)} maxLength={400} />
          <div className="row g8 wrap">
            <Button variant="primary" icon={Check} onClick={() => { decideApplication(a.id, 'approved', note); setNote(''); }}>{t('Approve')}</Button>
            <Button onClick={() => { if (note.trim()) { decideApplication(a.id, 'changes-requested', note); setNote(''); } }} disabled={!note.trim()}>{t('Request changes')}</Button>
            <Button variant="danger-ghost" icon={X} onClick={() => { decideApplication(a.id, 'rejected', note); setNote(''); }}>{t('Reject')}</Button>
          </div>
          {!note.trim() && <p className="meta">{t('Requesting changes needs a note.')}</p>}
        </section>
      ) : <Empty icon={Inbox} title={t('No applications')} />}
    </div>
  );
}

const PROOF: Record<ProofState, [Key, 'green' | 'amber' | 'red' | 'neutral']> = { verified: [msg('Proof verified (simulated)'), 'green'], unverified: [msg('Unverified'), 'amber'], forged: [msg('Proof failed: edited or forged (simulated)'), 'red'], 'not-applicable': [msg('Not encrypted, no proof needed'), 'neutral'] };
function Reports() {
  const t = useT();
  const locale = useLocale();
  const reports = useApp(s => s.reports);
  const users = useApp(s => s.users);
  const [sel, setSel] = useState(reports[0]?.id ?? '');
  const r = reports.find(x => x.id === sel);
  return (
    <div className="split-list">
      <ul className="ticket-list">{reports.map(x => <li key={x.id}><button type="button" className={`ticket-row ${sel === x.id ? 'is-on' : ''}`} aria-current={sel === x.id} onClick={() => setSel(x.id)}><span className="grow"><b>{x.title}</b><span className="meta block">{x.where} · {relTime(x.at, Date.now())}</span></span>{x.priority && <Tag tone="red">{t('Priority')}</Tag>}<Tag>{x.status}</Tag></button></li>)}</ul>
      {r ? (
        <section className="panel panel-pad col g12" aria-label={r.title}>
          <h2 className="sec-title">{r.title}</h2>
          <p className="meta">{t('{kind} report · reason: {reason} · by {who}', { kind: r.kind, reason: r.reason, who: users[r.reporter]?.name ?? (r.reporter.startsWith('decoy:') ? t('undercover staff account') : r.reporter) })}</p>
          {r.encrypted && <Note>{t('Encrypted conversation: only the messages the reporter selected are visible, each with a proof check.')}</Note>}
          <h3 className="label">{t('Evidence for this report')}</h3>
          <ul className="col g8">{r.evidence.map((e, i) => { const [pl, tone] = PROOF[e.proof]; return (
            <li key={i} className={`evidence ${e.reported ? 'is-reported' : ''}`}>
              <div className="row g8 wrap"><b>@{e.author}</b><span className="meta">{formatKarachi(e.at, { dateStyle: 'medium', timeStyle: 'short' }, locale)}</span>{e.reported && <Tag tone="outline">{t('Reported message')}</Tag>}<Tag tone={tone}>{t(pl)}</Tag></div>
              <p className="small plain">{e.text}</p>
            </li>
          ); })}</ul>
          <div className="row g8 wrap">
            <Button onClick={() => decideReport(r.id, 'dismissed')}>{t('Dismiss')}</Button>
            <Button onClick={() => decideReport(r.id, 'warned')}>{t('Warn')}</Button>
            <Button variant="danger-ghost" onClick={() => decideReport(r.id, 'suspended')}>{t('Suspend')}</Button>
            <Button variant="danger" onClick={() => decideReport(r.id, 'banned')}>{t('Ban')}</Button>
            {r.kind === 'server' && <Button variant="danger" onClick={() => decideReport(r.id, 'server-removed')}>{t('Remove server')}</Button>}
          </div>
          <p className="meta">{t('Status: {s}', { s: r.status })}</p>
        </section>
      ) : <Empty icon={Flag} title={t('No reports')} />}
    </div>
  );
}

function Bans() {
  const t = useT();
  const locale = useLocale();
  const bans = useApp(s => s.bans);
  const [target, setTarget] = useState(''); const [kind, setKind] = useState<'account' | 'device' | 'phone'>('account'); const [reason, setReason] = useState(''); const [days, setDays] = useState('0');
  return (
    <>
      <Section title={t('Add a ban')}>
        <form className="row g12 wrap end-row" onSubmit={e => { e.preventDefault(); if (target.trim() && reason.trim()) { addBan(target, kind, reason, Number(days) || null); setTarget(''); setReason(''); } }}>
          <TextField label={t('Account, device or phone')} value={target} onChange={e => setTarget(e.target.value)} className="grow" />
          <Select label={t('Type')} value={kind} onValue={setKind} options={[['account', t('Account')], ['device', t('Device')], ['phone', t('Phone number')]]} />
          <TextField label={t('Reason')} value={reason} onChange={e => setReason(e.target.value)} className="grow" />
          <Select label={t('Length')} value={days} onValue={setDays} options={[['0', t('Permanent')], ['7', t('7 days')], ['30', t('30 days')]]} />
          <Button type="submit" variant="danger" icon={Ban} disabled={!target.trim() || !reason.trim()}>{t('Ban')}</Button>
        </form>
      </Section>
      <Section title={t('Active bans')}>
        <ul className="flist">{bans.map(b => (
          <li key={b.id} className="frow">
            <div className="frow-main"><Ban size={18} aria-hidden="true" /><span className="person-text"><b>{b.target}</b><em>{b.kind} · {b.reason} · {b.expiresAt ? t('until {date}', { date: formatKarachi(b.expiresAt, { dateStyle: 'medium' }, locale) }) : t('permanent')}</em>{b.appeal && <em>{t('Appeal ({state}): “{text}”', { state: b.appeal.state, text: b.appeal.text })}</em>}</span></div>
            {b.appeal?.state === 'open' && <><Button size="sm" onClick={() => decideAppeal(b.id, true)}>{t('Grant appeal')}</Button><Button size="sm" onClick={() => decideAppeal(b.id, false)}>{t('Deny')}</Button></>}
            <Button size="sm" variant="ghost" onClick={() => liftBan(b.id)}>{t('Lift')}</Button>
          </li>
        ))}</ul>
      </Section>
    </>
  );
}

function Badges() {
  const t = useT();
  const users = useApp(s => s.users);
  const catalog = useApp(s => s.badgeCatalog);
  const [q, setQ] = useState('kaif');
  const [uid, setUid] = useState('me');
  const [nb, setNb] = useState({ id: '', name: '', description: '', icon: 'shield-check', animated: false });
  const [rule, setRule] = useState({ badge: 'early', from: '2026-01-01', to: '2026-06-30' });
  const [preview, setPreview] = useState<string[] | null>(null);
  const [approver, setApprover] = useState('');
  const matches = Object.values(users).filter(u => !u.bot && matchScore(q, [u.name, u.handle]) > 0).slice(0, 6);
  const u = users[uid];
  return (
    <>
      <Note>{t('Badges are assigned only by the team and are never sold.')}</Note>
      <Section title={t('Assign or remove')}>
        <TextField label={t('Find an account')} icon={Search} value={q} onChange={e => setQ(e.target.value)} />
        <div className="row g8 wrap">{matches.map(m => <Button key={m.id} size="sm" aria-pressed={uid === m.id} onClick={() => setUid(m.id)}>{m.name}</Button>)}</div>
        {u && <fieldset className="perm-grid"><legend className="flabel">{t('Badges for {name}', { name: u.name })}</legend>{catalog.map(b => <Checkbox key={b.id} label={<>{b.name}{b.staffOnly && <span className="meta"> · {t('staff-only')}</span>}</>} checked={u.badges.includes(b.id)} onChange={v => setBadge(u.id, b.id, v)} />)}</fieldset>}
      </Section>
      <Section title={t('Bulk rule')} description={t('Example: Early Recognizer for accounts created in the first six months. Needs a second staff member to approve.')}>
        <div className="row g12 wrap end-row">
          <Select label={t('Badge')} value={rule.badge} onValue={v => { setRule({ ...rule, badge: v }); setPreview(null); }} options={catalog.filter(b => !b.staffOnly).map(b => [b.id, b.name] as const)} />
          <DatePicker label={t('Joined from')} value={rule.from} required max={rule.to} onChange={v => { setRule({ ...rule, from: v }); setPreview(null); }} />
          <DatePicker label={t('Joined until')} value={rule.to} required min={rule.from} onChange={v => { setRule({ ...rule, to: v }); setPreview(null); }} />
          <Button onClick={() => setPreview(bulkPreview(rule.badge, rule.from, rule.to))}>{t('Preview')}</Button>
        </div>
        {preview && (
          <div className="panel panel-pad col g8">
            <b>{t('{n} accounts would get this badge', { n: preview.length })}</b>
            <p className="small muted">{preview.map(id => users[id]?.handle).join(', ') || '—'}</p>
            <Select label={t('Second approver')} value={approver} onValue={setApprover} options={[['', t('Choose a staff member')], ...STAFF.filter(s => s.id !== 'staff1').map(s => [s.id, s.name] as const)]} />
            <Button variant="primary" disabled={!approver || !preview.length} onClick={() => { bulkApply(rule.badge, preview, STAFF.find(s => s.id === approver)?.name ?? approver); setPreview(null); setApprover(''); }}>{t('Apply with approval')}</Button>
          </div>
        )}
      </Section>
      <Section title={t('Catalogue')} description={t('Add badge types without a code release.')}>
        <ul className="flist">{catalog.map(b => <li key={b.id} className="frow"><span className="person-text grow"><b>{b.name}{b.animated ? ` · ${t('animated')}` : ''}</b><em>{b.description}</em></span></li>)}</ul>
        <form className="col g12" onSubmit={e => { e.preventDefault(); if (nb.name.trim()) { saveBadgeType({ id: nb.id || nb.name.toLowerCase().replace(/\W+/g, '-'), name: nb.name.trim(), description: nb.description.trim(), icon: nb.icon, animated: nb.animated }); setNb({ id: '', name: '', description: '', icon: 'shield-check', animated: false }); } }}>
          <div className="row g12 wrap"><TextField label={t('Badge name')} value={nb.name} onChange={e => setNb({ ...nb, name: e.target.value })} className="grow" /><Select label={t('Icon')} value={nb.icon} onValue={v => setNb({ ...nb, icon: v })} options={[['shield-check', 'Shield'], ['calendar', 'Calendar'], ['lightbulb', 'Bulb'], ['code', 'Code']]} /></div>
          <TextField label={t('Who gets it')} value={nb.description} onChange={e => setNb({ ...nb, description: e.target.value })} />
          <Checkbox label={t('Animated version')} checked={nb.animated} onChange={v => setNb({ ...nb, animated: v })} />
          <Button type="submit" icon={Plus} disabled={!nb.name.trim()}>{t('Add badge type')}</Button>
        </form>
      </Section>
    </>
  );
}

function Certification() {
  const t = useT();
  const items = useApp(s => s.assessments);
  const users = useApp(s => s.users);
  return (
    <>
      <p className="muted">{t('Pass mark {p}% on multiple choice; scenario answers are judged against the rubric.', { p: PASS_MARK })}</p>
      {items.length ? <ul className="col g16">{items.map(a => (
        <li key={a.id} className="panel panel-pad col g8">
          <div className="row g8 wrap"><Avatar userId={a.user} size={28} /><b className="grow">{users[a.user]?.name}</b><Tag tone={a.score >= PASS_MARK ? 'green' : 'red'}>{a.score}%</Tag><Tag>{a.state}</Tag></div>
          {QUESTIONS.filter(q => q.kind === 'scenario').map(q => <div key={q.id}><p className="small"><b>{q.prompt}</b></p><p className="small muted">{String(a.answers[q.id] ?? '—')}</p><p className="meta">{t('Rubric: {r}', { r: q.rubric ?? '' })}</p></div>)}
          {a.state === 'pending-review' && <div className="row g8"><Button variant="primary" icon={Check} onClick={() => reviewAssessment(a.id, true)}>{t('Pass and grant badge')}</Button><Button variant="danger-ghost" icon={X} onClick={() => reviewAssessment(a.id, false)}>{t('Not passed')}</Button></div>}
        </li>
      ))}</ul> : <Empty icon={GraduationCap} title={t('No assessments to review')} />}
    </>
  );
}

function Reserved() {
  const t = useT();
  const list = useApp(s => s.reserved);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | 'artist' | 'politician' | 'brand' | 'team'>('all');
  const [n, setN] = useState(''); const [nc, setNc] = useState<'artist' | 'politician' | 'brand' | 'team'>('artist'); const [note, setNote] = useState('');
  const shown = list.filter(r => (cat === 'all' || r.category === cat) && (!q.trim() || r.name.includes(q.trim().toLowerCase())));
  return (
    <>
      <form className="row g12 wrap end-row" onSubmit={e => { e.preventDefault(); if (/^[a-z0-9_.]{3,32}$/.test(n.trim().toLowerCase())) { addReserved(n, nc, note); setN(''); setNote(''); } }}>
        <TextField label={t('Username')} prefix="@" value={n} onChange={e => setN(e.target.value)} />
        <Select label={t('Category')} value={nc} onValue={setNc} options={[['artist', t('Artist')], ['politician', t('Politician')], ['brand', t('Brand')], ['team', t('Team')]]} />
        <TextField label={t('Note')} value={note} onChange={e => setNote(e.target.value)} className="grow" />
        <Button type="submit" icon={Plus}>{t('Reserve')}</Button>
      </form>
      <div className="row g12 wrap end-row"><TextField label={t('Search')} icon={Search} value={q} onChange={e => setQ(e.target.value)} className="grow" /><RadioList name="rcat" legend={t('Category')} variant="segmented" value={cat} onChange={setCat} options={[{ value: 'all', label: t('All') }, { value: 'artist', label: t('Artist') }, { value: 'politician', label: t('Politician') }, { value: 'brand', label: t('Brand') }, { value: 'team', label: t('Team') }]} /></div>
      <ul className="flist">{shown.map(r => <li key={r.name} className="frow"><span className="person-text grow"><b className="ltr">@{r.name}</b><em>{r.category}{r.note ? ` · ${r.note}` : ''}</em></span><Button size="sm" onClick={() => releaseReserved(r.name)}>{t('Release to verified owner')}</Button></li>)}</ul>
    </>
  );
}

function Expert() {
  const t = useT();
  const items = useApp(s => s.expertTickets);
  const users = useApp(s => s.users);
  return (
    <ul className="col g12">{items.map(x => (
      <li key={x.id} className="panel panel-pad col g8">
        <div className="row g8 wrap"><b className="grow">{x.server}</b><Tag>{x.state}</Tag></div>
        <p className="small">{x.need}</p>
        <p className="meta">{t('Requested by {name}', { name: users[x.requester]?.name ?? x.requester })}{x.expert ? ` · ${t('Expert: {name}', { name: STAFF.find(s => s.id === x.expert)?.name ?? x.expert })}` : ''}</p>
        <div className="row g8 wrap">
          {x.state === 'requested' && STAFF.slice(1, 3).map(s => <Button key={s.id} size="sm" onClick={() => assignExpert(x.id, s.id)}>{t('Assign {name}', { name: s.name })}</Button>)}
          {(x.state === 'assigned' || x.state === 'in-progress') && <Button size="sm" variant="primary" icon={FileCheck} onClick={() => advanceExpert(x.id)}>{x.state === 'assigned' ? t('Start work') : t('Complete and remove access')}</Button>}
        </div>
      </li>
    ))}</ul>
  );
}

function Decoys() {
  const t = useT();
  const decoys = useApp(s => s.decoys);
  const [h, setH] = useState('');
  return (
    <>
      <Note>{t('Decoy accounts look like normal users. Their staff badge is visible only in this console, and their report button sends reports straight to the priority queue.')}</Note>
      <form className="row g8 wrap end-row" onSubmit={e => { e.preventDefault(); if (h.trim().length >= 3) { createDecoy(h, 'staff3'); setH(''); } }}><TextField label={t('Decoy username')} prefix="@" value={h} onChange={e => setH(e.target.value)} className="grow" /><Button type="submit" icon={Plus}>{t('Create decoy')}</Button></form>
      <ul className="flist">{decoys.map(d => <li key={d.id} className="frow"><span className="person-text grow"><b className="ltr">@{d.handle}</b><em>{t('Run by {s} · {n} priority reports', { s: STAFF.find(x => x.id === d.staff)?.name ?? d.staff, n: d.reports })}</em></span><Tag tone="outline" icon={EyeOff}>{t('Staff-only badge')}</Tag><Button size="sm" onClick={() => toggleDecoy(d.id)}>{d.active ? t('Deactivate') : t('Activate')}</Button></li>)}</ul>
    </>
  );
}

function Audit() {
  const t = useT();
  const locale = useLocale();
  const rows = useApp(s => s.staffAudit);
  const [q, setQ] = useState('');
  const list = useMemo(() => rows.filter(r => !q.trim() || matchScore(q, [r.action, r.target, r.staff]) > 0), [rows, q]);
  return (
    <>
      <div className="row g12 wrap end-row"><TextField label={t('Search')} icon={Search} value={q} onChange={e => setQ(e.target.value)} className="grow" /><Button icon={Download} onClick={exportStaffAudit}>{t('Export CSV')}</Button></div>
      <ul className="flist">{list.map(r => <li key={r.id} className="frow"><span className="person-text grow"><b>{r.action}</b><em>{r.target} · {STAFF.find(s => s.id === r.staff)?.name ?? r.staff} · {formatKarachi(r.at, { dateStyle: 'medium', timeStyle: 'short' }, locale)}</em></span></li>)}</ul>
    </>
  );
}
