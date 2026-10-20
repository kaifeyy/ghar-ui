import { useMemo, useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { useApp, update, resetDemo } from '@/state/store';
import { setDev, go } from '@/state/actions/ui';
import { applyAgeGroup } from '@/state/actions/auth';
import { setNet, simulateDrop } from '@/state/actions/net';
import { simulateIncoming } from '@/state/actions/calls';
import { setOutcome } from '@/state/actions/payments';
import { useT, msg, LANGS } from '@/i18n';
import { Button, IconButton } from '@/ui/Button';
import { Select, Toggle, Tabs, TabPanel } from '@/ui/Form';
import { Tag } from '@/ui/Misc';
import { TRACE, STATUS_LABEL, type TraceStatus } from './traceability';
import type { NetState, PaymentOutcome } from '@/types/models';

/** Developer and persona tools. Opened with Ctrl+Shift+D or #dev. Deliberately outside the account hub. */
export function DevTools() {
  const t = useT();
  const [tab, setTab] = useState<'tools' | 'trace'>('tools');
  const age = useApp(s => s.ageGroup);
  const net = useApp(s => s.net);
  const outcome = useApp(s => s.nextOutcome);
  const failLoad = useApp(s => s.failNextLoad);
  const failSave = useApp(s => s.failNextSave);
  const theme = useApp(s => s.prefs.theme);
  const lang = useApp(s => s.prefs.lang);
  const authed = useApp(s => s.authed);
  return (
    <aside className="devtools" aria-label={t('Developer tools')} data-component="devtools">
      <header className="dev-head">
        <Wrench size={18} aria-hidden /><h2 className="grow">{t('Developer tools')}</h2>
        <IconButton icon={X} label={t('Close')} onClick={() => setDev(false)} />
      </header>
      <Tabs idBase="dev" label={t('Developer tools')} value={tab} onChange={setTab} tabs={[{ value: 'tools', label: t('Simulation') }, { value: 'trace', label: t('Requirements') }]} />
      <TabPanel idBase="dev" value={tab} className="dev-body scroll">
        {tab === 'tools' ? (
          <div className="stack g16">
            <p className="meta">{t('These switches change local demo state only. They are not part of the product’s navigation.')}</p>
            <Select label={t('Persona')} value={age} onValue={v => applyAgeGroup(v === 'minor' ? '2011-03-01' : '1999-06-12')} options={[['adult', t('Adult (18+)')], ['minor', t('Under 18')]] as const} />
            <Select<NetState> label={t('Network')} value={net} onValue={setNet} options={[['online', t('Online')], ['reconnecting', t('Reconnecting')], ['offline', t('Offline')]]} />
            <Button onClick={simulateDrop}>{t('Simulate a connection drop')}</Button>
            <Select<PaymentOutcome> label={t('Next payment result')} value={outcome} onValue={setOutcome} options={[['success', t('Success')], ['failure', t('Failure')], ['pending', t('Pending')], ['cancel', t('Cancelled')]]} />
            <Toggle label={t('Fail the next page load')} checked={failLoad} onChange={v => update(s => { s.failNextLoad = v; })} />
            <Toggle label={t('Fail the next save')} checked={failSave} onChange={v => update(s => { s.failNextSave = v; })} />
            <div className="row g8 wrap">
              <Button disabled={!authed} onClick={() => simulateIncoming()}>{t('Simulate incoming call')}</Button>
              <Button disabled={!authed} onClick={() => { go({ name: 'staff', section: 'dashboard' }); setDev(false); }}>{t('Open staff console')}</Button>
            </div>
            <div className="row g8 wrap">
              <Select label={t('Theme')} value={theme} onValue={v => update(s => { s.prefs.theme = v; })} options={[['dark', t('Dark')], ['light', t('Light')], ['system', t('Match system')]] as const} />
              <Select label={t('Language')} value={lang} onValue={v => update(s => { s.prefs.lang = v; })} options={LANGS.map(l => [l.id, l.native] as const)} />
            </div>
            <Button variant="danger-ghost" onClick={() => { resetDemo(); setDev(false); }}>{t('Reset demo data')}</Button>
          </div>
        ) : <TraceView />}
      </TabPanel>
    </aside>
  );
}

const TONE: Record<TraceStatus, 'green' | 'info' | 'amber' | 'neutral' | 'outline'> = { implemented: 'green', simulated: 'info', missing: 'amber', backend: 'neutral', deferred: 'outline' };

function TraceView() {
  const t = useT();
  const [filter, setFilter] = useState<TraceStatus | 'all'>('all');
  const counts = useMemo(() => TRACE.reduce<Record<string, number>>((a, x) => { a[x.status] = (a[x.status] ?? 0) + 1; return a; }, {}), []);
  const list = filter === 'all' ? TRACE : TRACE.filter(x => x.status === filter);
  return (
    <div className="stack g12">
      <Select<TraceStatus | 'all'> label={t('Status')} value={filter} onValue={setFilter}
        options={[['all', `${t('All')} (${TRACE.length})`], ...(Object.keys(STATUS_LABEL) as TraceStatus[]).map(k => [k, `${STATUS_LABEL[k]} (${counts[k] ?? 0})`] as const)]} />
      <p className="meta">{t(msg('Requirement descriptions are in English to match the PRD.'))}</p>
      <ul className="trace-list" lang="en" dir="ltr">
        {list.map(x => (
          <li key={x.id} className="trace-row">
            <div className="row g8"><b className="mono">{x.id}</b><Tag tone={TONE[x.status]}>{STATUS_LABEL[x.status]}</Tag></div>
            <div>{x.title}</div>
            <div className="meta">{x.where}{x.note ? ` · ${x.note}` : ''}{x.external ? ` · External: ${x.external}` : ''}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
