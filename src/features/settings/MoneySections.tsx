import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Plus, RotateCcw, Clock, Check, X, ShieldCheck, Zap, RefreshCw, Crown, Banknote } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { openModal, toast } from '@/state/actions/ui';
import { refund, checkPending } from '@/state/actions/payments';
import { equip, setTitle } from '@/state/actions/profile';
import { useT, useLocale, msg, type Key } from '@/i18n';
import type { TxStatus } from '@/types/models';
import { balancePaisa, refundable, FEES, PAYOUT_HOLD_DAYS } from '@/domain/payments';
import { fmt, pkr } from '@/domain/format';
import { formatKarachi } from '@/domain/time';
import { useRestrictions, useSpentToday } from '@/state/selectors';
import { Button } from '@/ui/Button';
import { Empty, Note, Section, Stat, Tag, DemoTag } from '@/ui/Misc';
import { RadioList } from '@/ui/Form';
import { SettingsBody } from './SettingsPage';
import { SHOP, PLUS } from '@/fixtures/commerce';
import { TITLES, ME } from '@/fixtures/users';

const STATUS: Record<TxStatus, [Key, 'green' | 'amber' | 'red' | 'neutral' | 'info']> = { succeeded: [msg('Completed'), 'green'], pending: [msg('Pending'), 'amber'], failed: [msg('Failed'), 'red'], cancelled: [msg('Cancelled'), 'neutral'], refunded: [msg('Refunded'), 'info'] };

function CheckStatusButton({ txId }: { txId: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return <Button size="sm" icon={RefreshCw} loading={busy} onClick={async () => { setBusy(true); await checkPending(txId); setBusy(false); }}>{t('Check status')}</Button>;
}

export function WalletSection() {
  const t = useT();
  const locale = useLocale();
  const txs = useApp(s => s.transactions);
  const r = useRestrictions();
  const spent = useSpentToday();
  const now = useApp(s => s.now);
  const [filter, setFilter] = useState<'all' | TxStatus>('all');
  const bal = balancePaisa(txs);
  const list = txs.filter(x => filter === 'all' || x.status === filter);
  return (
    <SettingsBody>
      <div className="stats3">
        <Stat label={t('Balance')} value={pkr(bal)} sub={t('Simulated · no real money')} />
        <Stat label={t('Spent today')} value={`Rs ${fmt(spent)}`} sub={r.dailySpendCapPkr ? t('Limit Rs {n} (under 18)', { n: fmt(r.dailySpendCapPkr) }) : undefined} />
        <Stat label={t('Pending')} value={String(txs.filter(x => x.status === 'pending').length)} />
      </div>
      <div className="row g8 wrap"><Button variant="primary" icon={Plus} onClick={() => openModal({ kind: 'addMoney' })}>{t('Add money')}</Button><Button icon={Zap} onClick={() => openModal({ kind: 'buyPoints' })}>{t('Buy popularity points')}</Button></div>
      <Note tone="info">{t('Payments in this demo are simulated. No real money moves and no card or wallet details are collected.')}</Note>
      <Section title={t('Transactions')} actions={<RadioList name="txf" legend={t('Filter')} srLegend variant="segmented" value={filter} onChange={setFilter} options={[{ value: 'all', label: t('All') }, { value: 'pending', label: t('Pending') }, { value: 'failed', label: t('Failed') }, { value: 'refunded', label: t('Refunded') }]} />}>
        {list.length ? <ul className="tx-list">{list.map(x => {
          const [label, tone] = STATUS[x.status];
          return (
            <li key={x.id} className="tx">
              <span className="grow"><b className="ellip block">{x.description}</b><span className="meta">{formatKarachi(x.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }, locale)}{x.feePaisa ? ` · ${t('fee {n}', { n: pkr(x.feePaisa) })}` : ''}</span></span>
              <Tag tone={tone}>{t(label)}</Tag>
              <b className={`tnum tx-amt ${x.status !== 'succeeded' ? 'is-void' : x.amountPaisa > 0 ? 'ok' : ''}`}>{x.amountPaisa > 0 ? '+' : '−'}{pkr(x.amountPaisa)}</b>
              <span className="tx-actions">
                {x.status === 'pending' && <CheckStatusButton txId={x.id} />}
                {refundable(x, now) && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => refund(x.id)}>{t('Refund')}</Button>}
              </span>
            </li>
          );
        })}</ul> : <Empty icon={Banknote} title={t('No transactions')} />}
        <p className="meta">{t('Pending payments don’t change your balance until confirmed. Refunds within 7 days return the money and remove what was bought.')}</p>
      </Section>
    </SettingsBody>
  );
}

export function PayoutsSection() {
  const t = useT();
  const locale = useLocale();
  const r = useRestrictions();
  const phone = useApp(s => s.phoneVerified);
  const kyc = useApp(s => s.kyc);
  const payouts = useApp(s => s.payouts);
  const now = useApp(s => s.now);
  if (!r.payouts) return <SettingsBody><Note tone="info" title={t('Payouts aren’t available')}>{t('Under-18 accounts can’t receive payouts.')}</Note></SettingsBody>;
  const available = payouts.filter(p => p.status === 'available' || (p.status === 'held' && p.releaseAt <= now));
  const total = available.reduce((n, p) => n + p.amountPkr, 0);
  const ready = phone && kyc === 'approved';
  return (
    <SettingsBody>
      <Section title={t('Eligibility')}>
        <ul className="col g8">
          <li className="row g8">{phone ? <Check size={16} className="ok" aria-hidden="true" /> : <X size={16} className="bad" aria-hidden="true" />}{t('Verified phone')}{!phone && <Button size="sm" onClick={() => openModal({ kind: 'verifyPhone' })}>{t('Verify')}</Button>}</li>
          <li className="row g8">{kyc === 'approved' ? <Check size={16} className="ok" aria-hidden="true" /> : kyc === 'pending' ? <Clock size={16} className="warn" aria-hidden="true" /> : <X size={16} className="bad" aria-hidden="true" />}{t('CNIC check')}
            <Tag tone={kyc === 'approved' ? 'green' : kyc === 'pending' ? 'amber' : kyc === 'rejected' ? 'red' : 'neutral'}>{t(({ none: msg('Not started'), pending: msg('Under review'), approved: msg('Approved'), rejected: msg('Rejected') } as const)[kyc])}</Tag>
            {(kyc === 'none' || kyc === 'rejected') && <Button size="sm" icon={ShieldCheck} onClick={() => openModal({ kind: 'payoutKyc' })}>{t('Start')}</Button>}</li>
        </ul>
        {kyc === 'pending' && <p className="meta">{t('Reviewed in the staff console demo. Only the result is kept.')}</p>}
      </Section>
      <Section title={t('Earnings')} description={t('Earnings are held for {n} days for fraud and chargebacks, then become available.', { n: PAYOUT_HOLD_DAYS })}>
        <ul className="tx-list">{payouts.map(p => {
          const releasable = p.status === 'held' && p.releaseAt <= now;
          return (
            <li key={p.id} className="tx">
              <span className="grow"><b className="block">{p.source}</b><span className="meta">{p.status === 'held' && !releasable ? t('Held until {date}', { date: formatKarachi(p.releaseAt, { dateStyle: 'medium' }, locale) }) : p.status === 'paid' ? t('Paid out') : t('Available')}</span></span>
              <Tag tone={p.status === 'paid' ? 'neutral' : p.status === 'held' && !releasable ? 'amber' : 'green'}>{p.status === 'paid' ? t('Paid') : p.status === 'held' && !releasable ? t('On hold') : t('Available')}</Tag>
              <b className="tnum">Rs {fmt(p.amountPkr)}</b>
            </li>
          );
        })}</ul>
        <div className="row g12 wrap">
          <b className="grow">{t('Available to withdraw: Rs {n}', { n: fmt(total) })}</b>
          <Button variant="primary" disabled={!ready || total === 0} onClick={() => { update(s => { s.payouts.forEach(p => { if (available.some(a => a.id === p.id)) p.status = 'paid'; }); }); toast('Payout requested (demo, no bank is contacted)'); }}>{t('Request payout')}</Button>
        </div>
        {!ready && <p className="meta">{t('Finish verification to request payouts.')}</p>}
      </Section>
      <Section title={t('Proposed platform fees')} description={t('Proposals to validate; shown so the numbers are transparent.')}>
        <dl className="pay-sum">
          <div><dt>{t('Tips')}</dt><dd>{Math.round(FEES.tip * 100)}%</dd></div><div><dt>{t('Donations')}</dt><dd>{Math.round(FEES.donation * 100)}%</dd></div>
          <div><dt>{t('Locked content')}</dt><dd>{Math.round(FEES.unlock * 100)}%</dd></div><div><dt>{t('Sponsorships')}</dt><dd>{Math.round(FEES.sponsor * 100)}%</dd></div>
        </dl>
      </Section>
    </SettingsBody>
  );
}

export function PlusSection() {
  const t = useT();
  const locale = useLocale();
  const until = useApp(s => s.plusUntil);
  const active = !!until && until > Date.now();
  return (
    <SettingsBody>
      <Section title={t('Ghar Plus')} description={t('Rs {n} a month.', { n: PLUS.pricePkr })}>
        {active ? <Tag tone="green" icon={Crown}>{t('Active until {date}', { date: formatKarachi(until!, { dateStyle: 'medium' }, locale) })}</Tag> : <Tag>{t('Not subscribed')}</Tag>}
        <ul className="perks">{PLUS.perks.map(p => <li key={p}><Check size={16} aria-hidden="true" className="ok" />{p}</li>)}</ul>
        <div className="row g8 wrap">
          <Button variant="primary" icon={Crown} onClick={() => openModal({ kind: 'plus' })}>{active ? t('Add a month') : t('Subscribe')}</Button>
          {active && <Button variant="ghost" onClick={() => toast('Auto-renew is off. Perks stay until the end date.', { tone: 'info' })}>{t('Turn off auto-renew')}</Button>}
        </div>
        <p className="meta">{t('Profile badges are never part of Plus or the shop.')}</p>
      </Section>
    </SettingsBody>
  );
}

const KIND_LABEL: Record<string, Key> = { theme: msg('Themes'), nameplate: msg('Nameplates'), decoration: msg('Avatar decorations'), banner: msg('Banners'), effect: msg('Entrance effects'), bubble: msg('Chat bubbles'), icon: msg('App icons'), 'name-effect': msg('Name effects') };
export function ShopSection() {
  const t = useT();
  const owned = useApp(s => s.owned);
  const equipped = useApp(useShallow(s => s.equipped));
  const kinds = [...new Set(SHOP.map(i => i.kind))];
  return (
    <SettingsBody>
      <Note>{t('Cosmetic items only. Profile badges are assigned by the Ghar team and are never sold.')}</Note>
      {kinds.map(k => (
        <Section key={k} title={t(KIND_LABEL[k] ?? msg('Items'))}>
          <ul className="shop-grid">{SHOP.filter(i => i.kind === k).map(i => {
            const has = owned.includes(i.id);
            const on = equipped[k] === i.id;
            return (
              <li key={i.id} className={`shop-item ${on ? 'is-on' : ''}`}>
                <span className="swatch-lg" style={{ ['--p' as string]: i.preview }} aria-hidden="true" />
                <b>{i.name}</b>
                <span className="meta">{has ? (on ? t('Equipped') : t('Owned')) : i.pricePkr ? `Rs ${fmt(i.pricePkr)}` : t('Free')}</span>
                {has ? <Button size="sm" variant={on ? 'secondary' : 'primary'} onClick={() => equip(k, on ? null : i.id)}>{on ? t('Unequip') : t('Equip')}</Button>
                  : <Button size="sm" onClick={() => openModal({ kind: 'shop', itemId: i.id })}>{i.pricePkr ? t('Buy') : t('Get')}</Button>}
              </li>
            );
          })}</ul>
        </Section>
      ))}
      <DemoTag>{t('Test payments')}</DemoTag>
    </SettingsBody>
  );
}

export function TitlesSection() {
  const t = useT();
  const titles = useApp(s => s.titles);
  const active = useApp(s => s.users[ME]!.titleId);
  return (
    <SettingsBody>
      <Section title={t('Your titles')} description={t('One title shows beside your name at a time.')}>
        <RadioList name="title" legend={t('Active title')} srLegend value={active ?? ''} onChange={v => setTitle(v || undefined)}
          options={[{ value: '', label: t('No title') }, ...titles.map(id => { const x = TITLES.find(y => y.id === id); return { value: id, label: x?.name ?? id, description: x?.source === 'bought' ? t('Bought') : t('Earned') }; })]} />
      </Section>
      <Section title={t('Titles you can buy')}>
        <ul className="shop-grid">{TITLES.filter(x => x.source === 'bought' && !titles.includes(x.id)).map(x => (
          <li key={x.id} className="shop-item"><Crown size={22} aria-hidden="true" /><b>{x.name}</b><span className="meta">Rs {x.pricePkr}</span>
            <Button size="sm" onClick={() => { useApp.setState(s => { s.payment = { phase: 'idle' }; }); openModal({ kind: 'shop', itemId: x.id }); }}>{t('Buy')}</Button></li>
        ))}</ul>
        {TITLES.filter(x => x.source === 'bought' && !titles.includes(x.id)).length === 0 && <p className="meta">{t('You own every title for sale.')}</p>}
      </Section>
    </SettingsBody>
  );
}
