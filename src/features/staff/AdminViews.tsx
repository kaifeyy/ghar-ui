import { useMemo, useState } from 'react';
import { Search, UserX, UserCheck, AlertTriangle, BadgeCheck, CreditCard, MessageSquareText, Mail, Link2, BellRing, Headphones, Webhook, RefreshCw, CheckCircle2, CircleSlash, FlaskConical, type LucideIcon } from 'lucide-react';
import { useApp } from '@/state/store';
import { go } from '@/state/actions/ui';
import { suspendUser, liftSuspension, warnUser, runServiceCheck } from '@/state/actions/staff';
import { useT, useLocale, msg, type Key } from '@/i18n';
import { formatKarachi, relTime } from '@/domain/time';
import { matchScore } from '@/domain/search';
import { platform } from '@/domain/social';
import { Button } from '@/ui/Button';
import { Empty, Note, Tag } from '@/ui/Misc';
import { RadioList, Select, TextArea } from '@/ui/Form';
import { Avatar } from '@/ui/Avatar';
import { PLATFORM_ICON } from '@/features/social/SocialLinks';

type UserFilter = 'all' | 'active' | 'suspended' | 'minor' | 'reported';

/** Admin › Users: search, filter, inspect and act on accounts (demo state only). */
export function AdminUsers() {
  const t = useT();
  const locale = useLocale();
  const users = useApp(s => s.users);
  const suspensions = useApp(s => s.suspensions);
  const reports = useApp(s => s.reports);
  const socialLinks = useApp(s => s.socialLinks);
  const catalog = useApp(s => s.badgeCatalog);
  const ageGroup = useApp(s => s.ageGroup);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [sel, setSel] = useState<string>('ayesha');
  const [days, setDays] = useState('7');
  const [reason, setReason] = useState('');
  const [warn, setWarn] = useState('');
  const [touched, setTouched] = useState(false);
  const reportCount = useMemo(() => reports.reduce<Record<string, number>>((a, r) => { a[r.target] = (a[r.target] ?? 0) + 1; return a; }, {}), [reports]);
  const list = Object.values(users).filter(u => !u.bot)
    .filter(u => !q.trim() || matchScore(q, [u.name, u.handle, u.city ?? '']) > 0)
    .filter(u => filter === 'all' || (filter === 'suspended' ? !!suspensions[u.id] : filter === 'active' ? !suspensions[u.id] : filter === 'minor' ? u.id === 'me' && ageGroup === 'minor' : (reportCount[u.id] ?? 0) > 0))
    .sort((a, b) => a.name.localeCompare(b.name));
  const u = users[sel];
  const susp = u ? suspensions[u.id] : undefined;
  const reasonErr = touched && reason.trim().length < 5 ? t('Give a reason of at least 5 characters. It is shown in the audit log.') : null;
  return (
    <>
      <div className="discover-bar">
        <div className="field grow"><label className="sr" htmlFor="au-q">{t('Search accounts')}</label><div className="fbox"><Search size={16} aria-hidden="true" className="mut" /><input id="au-q" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Name, @username or city')} /></div></div>
        <RadioList name="au-f" legend={t('Filter')} srLegend variant="segmented" value={filter} onChange={setFilter} options={[{ value: 'all', label: t('All') }, { value: 'active', label: t('Active') }, { value: 'suspended', label: t('Suspended') }, { value: 'reported', label: t('Reported') }]} />
      </div>
      <p className="meta" aria-live="polite">{t('{n} accounts', { n: list.length })}</p>
      <div className="split-list">
        <ul className="ticket-list" aria-label={t('Accounts')}>
          {list.map(x => (
            <li key={x.id}><button type="button" className={`ticket-row ${sel === x.id ? 'is-on' : ''}`} aria-current={sel === x.id} onClick={() => { setSel(x.id); setTouched(false); setReason(''); setWarn(''); }}>
              <Avatar userId={x.id} size={32} /><span className="grow person-text"><b className="ellip" dir="auto">{x.name}</b><em className="ltr ellip">@{x.handle}</em></span>
              {suspensions[x.id] ? <Tag tone="red">{t('Suspended')}</Tag> : (reportCount[x.id] ?? 0) > 0 ? <Tag tone="amber">{t('{n} reports', { n: reportCount[x.id]! })}</Tag> : null}
            </button></li>
          ))}
          {!list.length && <li className="pad12"><Empty icon={Search} title={t('No accounts match')}>{t('Try another name or clear the filter.')}</Empty></li>}
        </ul>
        {u ? (
          <section className="panel panel-pad col g16" aria-label={u.name}>
            <div className="row g12"><Avatar userId={u.id} size={56} showPresence /><div className="grow person-text"><b className="ellip" dir="auto">{u.name}</b><em className="ltr">@{u.handle}</em></div>
              <Button size="sm" variant="ghost" onClick={() => go({ name: 'profile', userId: u.id })}>{t('Open profile')}</Button></div>
            <dl className="app-dl">
              <dt>{t('Joined')}</dt><dd>{formatKarachi(Date.parse(u.joinedAt), { dateStyle: 'medium' }, locale)}</dd>
              <dt>{t('City')}</dt><dd>{u.city || '—'}</dd>
              <dt>{t('Status')}</dt><dd>{susp ? t('Suspended {when}', { when: susp.until ? t('until {date}', { date: formatKarachi(susp.until, { dateStyle: 'medium' }, locale) }) : t('indefinitely') }) : t('Active')}</dd>
              <dt>{t('Reports')}</dt><dd>{reportCount[u.id] ?? 0}</dd>
              <dt>{t('Badges')}</dt><dd className="row g4 wrap">{u.badges.length ? u.badges.map(b => <Tag key={b} icon={BadgeCheck}>{catalog.find(c => c.id === b)?.name ?? b}</Tag>) : '—'}</dd>
              <dt>{t('Linked profiles')}</dt><dd className="row g4 wrap">{(socialLinks[u.id] ?? []).length ? (socialLinks[u.id] ?? []).map(l => { const I = PLATFORM_ICON[l.platform]; return <Tag key={l.platform} tone="outline" icon={I}>{platform(l.platform).name} · {t('unverified')}</Tag>; }) : '—'}</dd>
            </dl>
            {susp && <Note tone="warn" title={t('Suspended')}>{susp.reason}</Note>}
            {susp ? <Button icon={UserCheck} onClick={() => liftSuspension(u.id)}>{t('Lift suspension')}</Button> : (
              <form className="col g12" onSubmit={e => { e.preventDefault(); setTouched(true); if (reason.trim().length >= 5) { suspendUser(u.id, days === '0' ? null : Number(days), reason); setReason(''); setTouched(false); } }}>
                <h3 className="label">{t('Suspend account')}</h3>
                <Select label={t('Duration')} value={days} onValue={setDays} options={[['1', t('1 day')], ['7', t('7 days')], ['30', t('30 days')], ['0', t('Until lifted')]]} />
                <TextArea label={t('Reason')} value={reason} onChange={e => setReason(e.target.value)} error={reasonErr} maxLength={200} count={200} />
                <Button type="submit" variant="danger" icon={UserX} className="self-start">{t('Suspend')}</Button>
              </form>
            )}
            <form className="col g8" onSubmit={e => { e.preventDefault(); warnUser(u.id, warn); setWarn(''); }}>
              <TextArea label={t('Send a warning')} value={warn} onChange={e => setWarn(e.target.value)} maxLength={200} hint={u.id === 'me' ? t('Arrives in their Inbox.') : t('Recorded in the audit log (demo: no delivery to other accounts).')} />
              <Button type="submit" icon={AlertTriangle} disabled={!warn.trim()} className="self-start">{t('Send warning')}</Button>
            </form>
          </section>
        ) : <Empty icon={UserX} title={t('Pick an account')} />}
      </div>
    </>
  );
}

interface ServiceDef { id: string; name: Key; icon: LucideIcon; state: 'simulated' | 'missing'; detail: Key }
const SERVICES: ServiceDef[] = [
  { id: 'payments', name: msg('Payments'), icon: CreditCard, state: 'simulated', detail: msg('Simulated checkout in the browser. No payment provider is connected and no money moves.') },
  { id: 'sms', name: msg('SMS codes'), icon: MessageSquareText, state: 'simulated', detail: msg('Phone codes are checked locally. No SMS is sent.') },
  { id: 'email', name: msg('Email'), icon: Mail, state: 'simulated', detail: msg('Verification and reset emails are simulated. Nothing is sent.') },
  { id: 'social', name: msg('Social profile verification'), icon: Link2, state: 'missing', detail: msg('Needs sign-in with each service. Linked profiles stay Unverified until that exists.') },
  { id: 'push', name: msg('Push notifications'), icon: BellRing, state: 'missing', detail: msg('No push service. Notifications appear only inside the app.') },
  { id: 'media', name: msg('Voice and video'), icon: Headphones, state: 'simulated', detail: msg('Call and stage states are simulated. No audio or video is transmitted.') },
  { id: 'webhooks', name: msg('Incoming webhooks'), icon: Webhook, state: 'simulated', detail: msg('Webhook URLs are fake and receive nothing.') },
];

/** Admin › Integration status: honest health view of every external dependency. */
export function AdminIntegrations() {
  const t = useT();
  const checks = useApp(s => s.serviceChecks);
  const socialLinks = useApp(s => s.socialLinks);
  const hooks = useApp(s => s.webhooks.length);
  const txs = useApp(s => s.transactions);
  const [running, setRunning] = useState<string | null>(null);
  const now = Date.now();
  const linkedCount = Object.values(socialLinks).reduce((a, l) => a + l.length, 0);
  const usage: Record<string, string> = {
    payments: t('{n} simulated transactions', { n: txs.length }),
    social: t('{n} linked profiles, all unverified', { n: linkedCount }),
    webhooks: t('{n} webhooks configured', { n: hooks }),
  };
  const run = (s: ServiceDef) => { setRunning(s.id); setTimeout(() => { runServiceCheck(s.id, s.state === 'simulated'); setRunning(null); }, 700); };
  return (
    <>
      <Note tone="info" title={t('Demo environment')}>{t('This frontend has no backend. “Simulated” means the flow works with local demo data; “Not connected” means it needs a live service that doesn’t exist here.')}</Note>
      <ul className="svc-list">
        {SERVICES.map(s => {
          const c = checks[s.id];
          return (
            <li key={s.id} className="svc-row">
              <span className="social-ic"><s.icon size={20} aria-hidden="true" /></span>
              <span className="grow col g4" style={{ minWidth: 0 }}>
                <span className="row g8 wrap"><b>{t(s.name)}</b>{s.state === 'simulated' ? <Tag tone="info" icon={FlaskConical}>{t('Simulated')}</Tag> : <Tag tone="neutral" icon={CircleSlash}>{t('Not connected')}</Tag>}</span>
                <span className="small muted">{t(s.detail)}</span>
                <span className="meta">{usage[s.id] ? usage[s.id] + ' · ' : ''}{c ? (c.ok ? t('Last check {when}: simulation responding', { when: relTime(c.at, now) }) : t('Last check {when}: no service to reach', { when: relTime(c.at, now) })) : t('Not checked yet')}</span>
              </span>
              <Button size="sm" icon={c?.ok ? CheckCircle2 : RefreshCw} loading={running === s.id} onClick={() => run(s)}>{t('Run check')}</Button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

