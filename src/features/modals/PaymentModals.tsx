import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Clock, XCircle, Wallet, Zap, Minus, Plus, Check, ShieldCheck } from 'lucide-react';
import { useApp } from '@/state/store';
import { closeModal, openModal } from '@/state/actions/ui';
import { pay, sendGift, buyPoints, addMoney, resetPayment, retryPayment, cancelProcessing, checkPending, canSpend, PROCESSING_MS } from '@/state/actions/payments';
import { useT, useLocale, msg, type Key } from '@/i18n';
import { formatKarachi } from '@/domain/time';
import { quoteGift, freeGiftsUsedToday } from '@/domain/popularity';
import { feeFor, FEES } from '@/domain/payments';
import { fmt } from '@/domain/format';
import { useBalancePkr, useRestrictions } from '@/state/selectors';
import { Dialog } from '@/ui/Overlay';
import { Button, IconButton } from '@/ui/Button';
import { Note } from '@/ui/Misc';
import { RadioList, Select, TextArea, TextField } from '@/ui/Form';
import { Avatar } from '@/ui/Avatar';
import { GiftArt } from '@/ui/Glyphs';
import { GIFTS, POINT_PACKS } from '@/fixtures/popularity';
import { SHOP, PLUS } from '@/fixtures/commerce';
import { DONATION_LEVEL, levelFor } from '@/fixtures/communities';
import { ME, TITLES } from '@/fixtures/users';

/** Steps shown while the simulated provider authorises the payment. */
const STEPS: Key[] = [msg('Contacting the simulated provider'), msg('Authorising the payment'), msg('Confirming with your wallet')];

function SimulatedBadge() {
  const t = useT();
  return <span className="sim-badge"><ShieldCheck size={14} aria-hidden="true" />{t('Simulated payment · no real money')}</span>;
}

function Processing({ onCancel }: { onCancel: () => void }) {
  const t = useT();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => Math.min(STEPS.length - 1, s + 1)), PROCESSING_MS / STEPS.length);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="pay-processing" role="status" aria-live="polite">
      <span className="spinner lg" aria-hidden="true" />
      <b>{t('Processing payment…')}</b>
      <ol className="pay-steps">{STEPS.map((s, i) => <li key={s} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}>{i < step ? <Check size={14} aria-hidden="true" /> : <span className="pay-dot" aria-hidden="true" />}{t(s)}</li>)}</ol>
      <Button size="sm" variant="ghost" onClick={onCancel}>{t('Cancel payment')}</Button>
    </div>
  );
}

function Receipt({ txId }: { txId: string }) {
  const t = useT();
  const locale = useLocale();
  const tx = useApp(s => s.transactions.find(x => x.id === txId));
  if (!tx) return null;
  return (
    <dl className="receipt">
      <dt>{t('Amount')}</dt><dd className="tnum">Rs {fmt(Math.abs(tx.amountPaisa) / 100)}</dd>
      <dt>{t('Paid with')}</dt><dd>{tx.method ?? t('Ghar wallet')}</dd>
      <dt>{t('Reference')}</dt><dd className="mono ltr">{tx.id}</dd>
      <dt>{t('Time')}</dt><dd>{formatKarachi(tx.at, { dateStyle: 'medium', timeStyle: 'short' }, locale)}</dd>
    </dl>
  );
}

/**
 * Simulated checkout: review → processing (cancellable) → succeeded | failed | pending | cancelled.
 * No provider is contacted and no card or wallet credentials are collected.
 * The outcome comes from the simulation (Developer tools can force one for testing; it is not part of this flow).
 */
export function PaymentDialog({ title, description, children, confirmLabel, onConfirm, disabled, successText, block, total, method }: { title: string; description?: ReactNode; children: ReactNode; confirmLabel: string; onConfirm: () => void; disabled?: boolean; successText: string; block?: string | null; total?: number; method?: string }) {
  const t = useT();
  const p = useApp(s => s.payment);
  const [checking, setChecking] = useState(false);
  const done = () => { resetPayment(); closeModal(); };
  if (p.phase === 'succeeded') return (
    <Dialog title={title} onClose={done} size="sm" footer={<Button variant="primary" onClick={done} data-autofocus>{t('Done')}</Button>}>
      <div className="pay-result is-ok" role="status"><CheckCircle2 size={36} aria-hidden="true" /><b>{t('Payment successful')}</b><span className="muted small">{successText}</span></div>
      {p.txId !== 'free' && <Receipt txId={p.txId} />}
      <SimulatedBadge />
    </Dialog>
  );
  if (p.phase === 'failed') return (
    <Dialog title={title} onClose={done} size="sm" footer={<><Button onClick={done}>{t('Cancel')}</Button><Button onClick={resetPayment}>{t('Review order')}</Button><Button variant="primary" onClick={retryPayment} data-autofocus>{t('Try again')}</Button></>}>
      <div className="pay-result is-bad" role="alert"><AlertCircle size={36} aria-hidden="true" /><b>{t('Payment didn’t go through')}</b><span className="small">{t(p.reason as Key, p.vars)}</span><span className="muted small">{t('Nothing was charged and nothing changed.')}</span></div>
    </Dialog>
  );
  if (p.phase === 'cancelled') return (
    <Dialog title={title} onClose={done} size="sm" footer={<><Button onClick={done}>{t('Close')}</Button><Button variant="primary" onClick={resetPayment} data-autofocus>{t('Back to checkout')}</Button></>}>
      <div className="pay-result" role="status"><XCircle size={36} aria-hidden="true" /><b>{t('Payment cancelled')}</b><span className="muted small">{t('You weren’t charged.')}</span></div>
    </Dialog>
  );
  if (p.phase === 'pending') return (
    <Dialog title={title} onClose={done} size="sm" footer={<><Button onClick={done}>{t('Close and check later')}</Button><Button variant="primary" loading={checking} onClick={async () => { setChecking(true); await checkPending(p.txId); setChecking(false); }}>{t('Check status')}</Button></>}>
      <div className="pay-result" role="status"><Clock size={36} aria-hidden="true" /><b>{t('Waiting for confirmation')}</b><span className="muted small">{t('The provider hasn’t confirmed yet. Nothing is added until it does. You can close this; it stays in Wallet as pending.')}</span></div>
    </Dialog>
  );
  const processing = p.phase === 'processing';
  return (
    <Dialog title={title} description={processing ? undefined : description} onClose={closeModal} busy={processing} hideClose={processing} onSubmit={() => !disabled && !block && onConfirm()}
      footer={processing ? undefined : <><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary" disabled={disabled || !!block}>{confirmLabel}</Button></>}>
      {processing ? <Processing onCancel={cancelProcessing} /> : (
        <>
          {children}
          {total != null && total > 0 && (
            <div className="checkout-sum">
              <SimulatedBadge />
              <div className="row between"><span className="muted">{t('Pay with')}</span><b>{method ?? t('Ghar wallet')}</b></div>
              <div className="row between checkout-total"><span>{t('Total')}</span><b className="tnum">Rs {fmt(total)}</b></div>
            </div>
          )}
          {!(total != null && total > 0) && <SimulatedBadge />}
          {block && <Note tone="warn">{block}</Note>}
        </>
      )}
    </Dialog>
  );
}

function BalanceLine({ cost }: { cost: number }) {
  const t = useT();
  const bal = useBalancePkr();
  return (
    <div className="balance-line">
      <Wallet size={16} aria-hidden="true" /><span className="grow">{t('Wallet balance')}</span><b className="tnum">Rs {fmt(bal)}</b>
      {cost > 0 && <span className="meta tnum">{t('After: Rs {n}', { n: fmt(bal - cost) })}</span>}
      {cost > bal && <Button size="sm" variant="ghost" onClick={() => openModal({ kind: 'addMoney' })}>{t('Add money')}</Button>}
    </div>
  );
}
function useBlock(cost: number) {
  const t = useT();
  const c = canSpend(cost);
  return cost > 0 && !c.ok ? t(c.reason, c.vars) : null;
}

export function GiftModal({ to, serverId }: { to: string; serverId?: string }) {
  const t = useT();
  const user = useApp(s => s.users[to]);
  const events = useApp(s => s.popularity);
  const [giftId, setGiftId] = useState('heart');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const gift = GIFTS.find(g => g.id === giftId)!;
  const used = freeGiftsUsedToday(events, ME, 'chai', Date.now());
  const q = quoteGift(gift, gift.pricePkr === 0 ? 1 : qty, used);
  const block = useBlock(q.totalPricePkr);
  return (
    <PaymentDialog total={q.totalPricePkr} title={t('Send a gift to {name}', { name: user?.name ?? '' })} confirmLabel={q.totalPricePkr ? t('Pay Rs {n} and send', { n: fmt(q.totalPricePkr) }) : t('Send free gift')}
      onConfirm={() => sendGift(to, gift.id, gift.name, gift.pricePkr === 0 ? 1 : qty, gift.points, gift.pricePkr, note, serverId)}
      disabled={q.points === 0} block={block} successText={t('{name} received {pts} popularity points.', { name: user?.name ?? '', pts: fmt(q.points) })}>
      <div className="row g12"><Avatar userId={to} size={40} /><span><b>{user?.name}</b><span className="meta block">@{user?.handle}</span></span></div>
      <fieldset className="gift-grid">
        <legend className="flabel">{t('Choose a gift')}</legend>
        {GIFTS.map(g => (
          <label key={g.id} className={`gift-opt ${g.id === giftId ? 'is-on' : ''}`}>
            <input type="radio" name="gift" value={g.id} checked={g.id === giftId} onChange={() => setGiftId(g.id)} />
            <GiftArt art={g.art} size={40} />
            <b>{g.name}</b>
            <span className="meta tnum">{t('{n} points', { n: fmt(g.points) })}</span>
            <span className="small tnum">{g.pricePkr ? `Rs ${fmt(g.pricePkr)}` : t('Free once a day')}</span>
          </label>
        ))}
      </fieldset>
      {gift.pricePkr > 0 ? (
        <div className="qty" role="group" aria-label={t('Quantity')}>
          <span className="flabel grow">{t('Quantity')}</span>
          <IconButton icon={Minus} label={t('Decrease quantity')} size="sm" disabled={qty <= 1} onClick={() => setQty(n => Math.max(1, n - 1))} />
          <output className="tnum qty-n" aria-live="polite">{qty}</output>
          <IconButton icon={Plus} label={t('Increase quantity')} size="sm" disabled={qty >= 99} onClick={() => setQty(n => Math.min(99, n + 1))} />
        </div>
      ) : q.freeLeft === 0 ? <Note tone="info">{t('You’ve used today’s free Chai. Try a paid gift or come back tomorrow.')}</Note> : null}
      <dl className="pay-sum">
        <div><dt>{t('Unit price')}</dt><dd className="tnum">{q.unitPricePkr ? `Rs ${fmt(q.unitPricePkr)}` : t('Free')}</dd></div>
        <div><dt>{t('Popularity for {name}', { name: user?.name.split(' ')[0] ?? '' })}</dt><dd className="tnum">+{fmt(q.points)}</dd></div>
        <div className="pay-total"><dt>{t('Total')}</dt><dd className="tnum">Rs {fmt(q.totalPricePkr)}</dd></div>
      </dl>
      {q.paid && <p className="meta row g8"><Zap size={14} aria-hidden="true" />{t('Paid gifts show as Boosted in {name}’s popularity breakdown.', { name: user?.name.split(' ')[0] ?? '' })}</p>}
      <TextArea label={t('Message (optional)')} value={note} onChange={e => setNote(e.target.value)} maxLength={120} count={note.length} rows={2} />
      <BalanceLine cost={q.totalPricePkr} />
    </PaymentDialog>
  );
}

export function BuyPointsModal() {
  const t = useT();
  const [pack, setPack] = useState(POINT_PACKS[0]!.id);
  const p = POINT_PACKS.find(x => x.id === pack)!;
  const block = useBlock(p.pricePkr);
  return (
    <PaymentDialog total={p.pricePkr} title={t('Buy popularity points')} description={t('Bought points are labelled Boosted on your profile and in rankings.')} confirmLabel={t('Pay Rs {n}', { n: fmt(p.pricePkr) })} onConfirm={() => buyPoints(p.points, p.pricePkr)} block={block} successText={t('{n} Boosted points added.', { n: fmt(p.points) })}>
      <RadioList name="pack" legend={t('Pack')} variant="cards" value={pack} onChange={setPack} options={POINT_PACKS.map(x => ({ value: x.id, label: t('{n} points', { n: fmt(x.points) }), description: `Rs ${fmt(x.pricePkr)}` }))} />
      <BalanceLine cost={p.pricePkr} />
    </PaymentDialog>
  );
}

const METHODS = ['JazzCash', 'Easypaisa', 'NayaPay', 'Card (Stripe)'] as const;
export function AddMoneyModal() {
  const t = useT();
  const [amt, setAmt] = useState('1000');
  const [method, setMethod] = useState<(typeof METHODS)[number]>('JazzCash');
  const n = Number(amt);
  const err = !Number.isInteger(n) || n < 100 ? t('Enter a whole amount of at least Rs 100.') : n > 50000 ? t('The test limit is Rs 50,000.') : null;
  return (
    <PaymentDialog total={err ? 0 : n} method={`${method} (${t('simulated')})`} title={t('Add money')} confirmLabel={t('Add Rs {n}', { n: err ? '…' : fmt(n) })} onConfirm={() => addMoney(n, method)} disabled={!!err} successText={t('Rs {n} added to your wallet.', { n: fmt(n) })}>
      <TextField label={t('Amount (PKR)')} inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/[^\d]/g, ''))} error={amt && err ? err : null} prefix="Rs" autoFocus />
      <div className="row g8 wrap">{[500, 1000, 2000, 5000].map(v => <Button key={v} size="sm" onClick={() => setAmt(String(v))} aria-pressed={n === v}>Rs {fmt(v)}</Button>)}</div>
      <RadioList name="method" legend={t('Pay with')} value={method} onChange={setMethod} options={METHODS.map(m => ({ value: m, label: m }))} />
      <Note>{t('No payment provider is connected. Card and wallet details are never collected in this demo.')}</Note>
    </PaymentDialog>
  );
}

export function ShopItemModal({ itemId }: { itemId: string }) {
  const t = useT();
  const tt = TITLES.find(x => x.id === itemId && x.source === 'bought');
  const item = SHOP.find(i => i.id === itemId) ?? { id: itemId, name: tt?.name ?? itemId, kind: 'title' as const, pricePkr: tt?.pricePkr ?? 0, preview: '#E5B454' };
  const ownedTitle = useApp(s => s.titles.includes(itemId));
  const ownedItem = useApp(s => s.owned.includes(itemId));
  const owned = ownedItem || ownedTitle;
  const block = useBlock(item.pricePkr);
  return (
    <PaymentDialog total={item.pricePkr} title={t('Buy {name}', { name: item.name })} confirmLabel={t('Pay Rs {n}', { n: fmt(item.pricePkr) })} disabled={owned}
      onConfirm={() => pay({ kind: 'shop', description: `Shop · ${item.name}`, amountPkr: item.pricePkr, direction: 'out', grant: item.kind === 'title' ? { kind: 'title', titleId: item.id } : { kind: 'item', itemId: item.id } })}
      block={block} successText={t('{name} is yours. Equip it from Shop or Appearance.', { name: item.name })}>
      <div className="shop-preview" style={{ ['--p' as string]: item.preview }}><span className="swatch-lg" aria-hidden="true" /><span><b>{item.name}</b><span className="meta block">{item.kind}</span></span></div>
      {owned && <Note tone="ok">{t('You already own this.')}</Note>}
      <p className="meta">{t('Profile badges are never sold. Shop items are cosmetic only.')}</p>
      <BalanceLine cost={item.pricePkr} />
    </PaymentDialog>
  );
}

export function PlusModal() {
  const t = useT();
  const until = useApp(s => s.plusUntil);
  const block = useBlock(PLUS.pricePkr);
  return (
    <PaymentDialog total={PLUS.pricePkr} title={t('Ghar Plus')} description={t('Monthly. Perks end when the month runs out unless you renew.')} confirmLabel={until ? t('Renew for Rs {n}', { n: PLUS.pricePkr }) : t('Subscribe for Rs {n}/month', { n: PLUS.pricePkr })}
      onConfirm={() => pay({ kind: 'plus', description: 'Ghar Plus · 1 month', amountPkr: PLUS.pricePkr, direction: 'out', grant: { kind: 'plus', until: Math.max(Date.now(), until ?? 0) + 30 * 86_400_000 } })} block={block} successText={t('Ghar Plus is active for 30 days.')}>
      <ul className="perks">{PLUS.perks.map(p => <li key={p}><CheckCircle2 size={16} aria-hidden="true" className="ok" />{p}</li>)}</ul>
      <BalanceLine cost={PLUS.pricePkr} />
    </PaymentDialog>
  );
}

export function UnlockModal({ channelId }: { channelId: string }) {
  const t = useT();
  const c = useApp(s => s.channels[channelId]);
  const price = c?.lock?.kind === 'payment' ? c.lock.pricePkr : 0;
  const block = useBlock(price);
  return (
    <PaymentDialog total={price} title={t('Unlock #{name}', { name: c?.name ?? '' })} confirmLabel={t('Pay Rs {n}', { n: price })}
      onConfirm={() => pay({ kind: 'unlock', description: `Unlock #${c?.name} `, amountPkr: price, direction: 'out', feeKind: 'unlock', grant: { kind: 'channel', channelId } })}
      block={block} successText={t('#{name} is unlocked.', { name: c?.name ?? '' })}>
      <p>{t('One-time payment. The community keeps the price minus a proposed {pct}% platform fee.', { pct: Math.round(FEES.unlock * 100) })}</p>
      <BalanceLine cost={price} />
    </PaymentDialog>
  );
}

export function TipModal({ to }: { to: string }) {
  const t = useT();
  const user = useApp(s => s.users[to]);
  const [amt, setAmt] = useState('200');
  const n = Number(amt) || 0;
  const block = useBlock(n);
  const err = n < 50 ? t('Minimum tip is Rs 50.') : null;
  return (
    <PaymentDialog total={err ? 0 : n} title={t('Tip {name}', { name: user?.name ?? '' })} confirmLabel={t('Tip Rs {n}', { n: fmt(n) })} disabled={!!err}
      onConfirm={() => pay({ kind: 'tip', description: `Tip to ${user?.name}`, amountPkr: n, direction: 'out', feeKind: 'tip' })} block={block} successText={t('Tip sent to {name}.', { name: user?.name ?? '' })}>
      <TextField label={t('Amount (PKR)')} prefix="Rs" inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/\D/g, ''))} error={err} />
      <p className="meta">{t('{name} receives Rs {net} after a proposed {pct}% fee, available after a 7-day hold.', { name: user?.name ?? '', net: fmt(n - feeFor('tip', n * 100) / 100), pct: Math.round(FEES.tip * 100) })}</p>
      <BalanceLine cost={n} />
    </PaymentDialog>
  );
}

export function DonateModal({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]);
  const [amt, setAmt] = useState('500');
  const n = Number(amt) || 0;
  const level = levelFor(sv?.xp ?? 0).level;
  const eligible = level >= DONATION_LEVEL && sv?.kind === 'server';
  const block = useBlock(n);
  if (!eligible) return (
    <Dialog title={t('Support {name}', { name: sv?.name ?? '' })} onClose={closeModal} size="sm" footer={<Button onClick={closeModal}>{t('Close')}</Button>}>
      <Note tone="info" title={t('Donations aren’t open yet')}>{sv?.kind === 'room' ? t('Rooms can’t take payments until they’re approved as a server.') : t('Donations unlock at community level {n}. This community is level {l}.', { n: DONATION_LEVEL, l: level })}</Note>
    </Dialog>
  );
  return (
    <PaymentDialog total={n} title={t('Support {name}', { name: sv!.name })} confirmLabel={t('Donate Rs {n}', { n: fmt(n) })} disabled={n < 50}
      onConfirm={() => pay({ kind: 'donation', description: `Donation to ${sv!.name}`, amountPkr: n, direction: 'out', feeKind: 'donation', onSuccess: d => { d.servers[serverId]!.xp += n; } })} block={block} successText={t('Thank you. Your donation also adds community XP.')}>
      <TextField label={t('Amount (PKR)')} prefix="Rs" inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/\D/g, ''))} />
      <p className="meta">{t('Proposed platform fee: {pct}%.', { pct: Math.round(FEES.donation * 100) })}</p>
      <BalanceLine cost={n} />
    </PaymentDialog>
  );
}

export function SponsorModal({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]);
  const r = useRestrictions();
  const [brand, setBrand] = useState('');
  const [months, setMonths] = useState<'1' | '3'>('1');
  const price = months === '1' ? 15000 : 40000;
  const block = useBlock(price);
  if (!r.sponsorship) return <Dialog title={t('Sponsor {name}', { name: sv?.name ?? '' })} onClose={closeModal} size="sm"><Note tone="info">{t('Sponsorships aren’t available on under-18 accounts.')}</Note></Dialog>;
  return (
    <PaymentDialog total={price} title={t('Sponsor {name}', { name: sv?.name ?? '' })} confirmLabel={t('Pay Rs {n}', { n: fmt(price) })} disabled={brand.trim().length < 2}
      onConfirm={() => pay({ kind: 'sponsor', description: `Sponsorship · ${sv?.name} · ${months} month(s)`, amountPkr: price, direction: 'out', feeKind: 'sponsor', onSuccess: d => { d.servers[serverId]!.sponsor = { name: brand.trim(), until: new Date(Date.now() + Number(months) * 30 * 86_400_000).toISOString().slice(0, 10) }; } })}
      block={block} successText={t('Sponsor slot booked.')}>
      <TextField label={t('Brand name shown in the banner slot')} value={brand} onChange={e => setBrand(e.target.value)} />
      <Select label={t('Length')} value={months} onValue={setMonths} options={[['1', t('1 month · Rs 15,000')], ['3', t('3 months · Rs 40,000')]]} />
      <p className="meta">{t('Proposed platform fee: {pct}%.', { pct: Math.round(FEES.sponsor * 100) })}</p>
      <BalanceLine cost={price} />
    </PaymentDialog>
  );
}
