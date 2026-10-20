import type { Draft } from 'immer';
import { update, get } from '../store';
import type { AppState } from '../types';
import type { Entitlement, PaymentOutcome, PopularityEvent, Transaction, TxKind } from '@/types/models';
import { uid } from '@/domain/rng';
import { checkSpend } from '@/domain/age';
import { balancePaisa, spentTodayPkr, simulateGateway, feeFor, refundable } from '@/domain/payments';
import { toast, ask } from './ui';
import { msg, type Key } from '@/i18n';
import { ME } from '@/fixtures/users';

export interface PaymentSpec {
  kind: TxKind;
  description: string;
  amountPkr: number; // positive
  /** top-ups add money; everything else spends wallet balance */
  direction: 'in' | 'out';
  grant?: Entitlement;
  event?: PopularityEvent; // created on success
  feeKind?: 'tip' | 'donation' | 'unlock' | 'sponsor';
  onSuccess?: (d: Draft<AppState>) => void;
  /** payment method label shown on the receipt */
  method?: string;
}

export type SpendBlock = { ok: true } | { ok: false; reason: Key; vars?: Record<string, string | number> };
export function canSpend(amountPkr: number): SpendBlock {
  const s = get();
  const r = checkSpend(s.ageGroup, spentTodayPkr(s.transactions, Date.now()), amountPkr, Math.floor(balancePaisa(s.transactions) / 100));
  if (r.ok) return { ok: true };
  if (r.reason === 'balance') return { ok: false, reason: msg('Not enough balance. Add money first.') };
  return { ok: false, reason: msg('Under-18 accounts can spend up to Rs {cap} a day. Rs {left} left today.'), vars: { cap: 2000, left: r.remainingPkr } };
}

function applyGrant(d: Draft<AppState>, g: Entitlement | undefined, ev?: PopularityEvent) {
  if (ev) d.popularity.push(ev);
  if (!g) return;
  if (g.kind === 'item' && !d.owned.includes(g.itemId)) d.owned.push(g.itemId);
  if (g.kind === 'title' && !d.titles.includes(g.titleId)) d.titles.push(g.titleId);
  if (g.kind === 'plus') d.plusUntil = g.until;
  if (g.kind === 'channel') d.unlocked[g.channelId] = true;
}
function revokeGrant(d: Draft<AppState>, g: Entitlement | undefined) {
  if (!g) return;
  if (g.kind === 'popularity-event') d.popularity = d.popularity.filter(e => e.id !== g.eventId);
  if (g.kind === 'item') { d.owned = d.owned.filter(i => i !== g.itemId); for (const k of Object.keys(d.equipped)) if (d.equipped[k] === g.itemId) delete d.equipped[k]; }
  if (g.kind === 'title') { d.titles = d.titles.filter(x => x !== g.titleId); if (d.users[ME]!.titleId === g.titleId) d.users[ME]!.titleId = undefined; }
  if (g.kind === 'plus') d.plusUntil = null;
  if (g.kind === 'channel') delete d.unlocked[g.channelId];
}

const pendingSpecs = new Map<string, PaymentSpec>();
let busy = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSpec: PaymentSpec | null = null;
/** Simulated authorisation time, long enough to show the processing steps. */
export const PROCESSING_MS = 1800;

/** Runs one payment through the deterministic test gateway. Nothing changes until the outcome is known. */
export function pay(spec: PaymentSpec, outcomeOverride?: PaymentOutcome): void {
  if (busy) return; // duplicate-submit guard
  const s = get();
  if (spec.direction === 'out') {
    const c = canSpend(spec.amountPkr);
    if (!c.ok) { update(d => { d.payment = { phase: 'failed', reason: c.reason, ...(c.vars ? { vars: c.vars } : {}) }; }); return; }
  }
  lastSpec = spec;
  const outcome = outcomeOverride ?? s.nextOutcome;
  const intentId = uid('pi');
  // Developer-tools outcomes apply to one payment only, so a retry behaves like a real second attempt.
  if (outcome !== 'success') update(d => { d.nextOutcome = 'success'; });
  busy = true;
  update(d => { d.payment = { phase: 'processing', intentId }; });
  const { outcome: result } = simulateGateway(outcome);
  timer = setTimeout(() => {
    busy = false; timer = null;
    if (result === 'cancel') { update(d => { d.payment = { phase: 'cancelled' }; }); return; }
    const txId = uid('tx');
    const amountPaisa = (spec.direction === 'in' ? 1 : -1) * Math.round(spec.amountPkr * 100);
    const grant: Entitlement | undefined = spec.event ? { kind: 'popularity-event', eventId: spec.event.id } : spec.grant;
    const tx: Transaction = { id: txId, at: Date.now(), kind: spec.kind, description: spec.description, amountPaisa, status: 'pending', provider: 'test-gateway', method: spec.method ?? 'Ghar wallet', ...(grant ? { grants: grant } : {}), ...(spec.feeKind ? { feePaisa: feeFor(spec.feeKind, amountPaisa) } : {}) };
    if (result === 'failure') {
      update(d => { d.transactions.unshift({ ...tx, status: 'failed' }); d.payment = { phase: 'failed', reason: msg('The payment was declined by the simulated provider. You weren’t charged.') }; });
      return;
    }
    if (result === 'pending') {
      pendingSpecs.set(txId, spec);
      update(d => { d.transactions.unshift(tx); d.payment = { phase: 'pending', intentId, txId }; });
      return;
    }
    update(d => {
      d.transactions.unshift({ ...tx, status: 'succeeded' });
      applyGrant(d, spec.grant, spec.event);
      spec.onSuccess?.(d);
      d.payment = { phase: 'succeeded', txId };
    });
  }, PROCESSING_MS);
}

/** Cancels a payment that is still being authorised. Nothing is charged. */
export function cancelProcessing() {
  if (!timer) return;
  clearTimeout(timer); timer = null; busy = false;
  update(d => { d.payment = { phase: 'cancelled' }; });
}
/** Runs the last payment again (after a failure or cancellation). */
export function retryPayment() { if (lastSpec) pay(lastSpec); }

/** Asks the simulated provider for a pending payment's status. It confirms after a short wait. */
export function checkPending(txId: string): Promise<void> {
  return new Promise(res => setTimeout(() => { resolvePending(txId, true); res(); }, 1200));
}

/** Simulates the provider's later confirmation for a pending payment. */
export function resolvePending(txId: string, succeed: boolean) {
  const spec = pendingSpecs.get(txId);
  update(d => {
    const tx = d.transactions.find(x => x.id === txId);
    if (!tx || tx.status !== 'pending') return;
    tx.status = succeed ? 'succeeded' : 'failed';
    if (succeed && spec) { applyGrant(d, spec.grant, spec.event); spec.onSuccess?.(d); }
    if (d.payment.phase === 'pending' && d.payment.txId === txId) d.payment = succeed ? { phase: 'succeeded', txId } : { phase: 'failed', reason: msg('The payment wasn’t completed. You weren’t charged.') };
  });
  pendingSpecs.delete(txId);
  toast(succeed ? msg('Payment confirmed') : msg('Payment failed. You weren’t charged.'), { tone: succeed ? 'ok' : 'warn' });
}

export function refund(txId: string) {
  const tx = get().transactions.find(t => t.id === txId);
  if (!tx || !refundable(tx, Date.now())) return;
  ask({ title: msg('Refund this payment?'), body: msg('The money returns to your wallet and what it bought is removed.'), confirmLabel: msg('Refund'), tone: 'danger', onConfirm: () => {
    update(d => { const t = d.transactions.find(x => x.id === txId); if (!t) return; t.status = 'refunded'; revokeGrant(d, t.grants); });
    toast('Refunded to your wallet (test mode)');
  } });
}

export const setOutcome = (o: PaymentOutcome) => update(s => { s.nextOutcome = o; });
export const resetPayment = () => update(s => { s.payment = { phase: 'idle' }; });

/* ---------------- popularity purchases (REP-02) and gifts ---------------- */
export function buyPoints(points: number, pricePkr: number) {
  pay({ kind: 'points', description: `Bought ${points} popularity points`, amountPkr: pricePkr, direction: 'out', event: { id: uid('pe'), recipient: ME, at: Date.now(), source: 'purchase', points, paid: true } });
}
export function sendGift(to: string, giftId: string, giftName: string, quantity: number, pointsEach: number, unitPrice: number, note: string, serverId?: string) {
  const event: PopularityEvent = { id: uid('pe'), recipient: to, sender: ME, at: Date.now(), source: 'gift', giftId, quantity, points: pointsEach * quantity, paid: unitPrice > 0, ...(serverId ? { serverId } : {}), ...(note.trim() ? { note: note.trim().slice(0, 120) } : {}) };
  const toName = get().users[to]?.name ?? to;
  if (unitPrice === 0) {
    update(d => { d.popularity.push(event); d.payment = { phase: 'succeeded', txId: 'free' }; });
    return;
  }
  pay({ kind: 'gift', description: `Gift to ${toName} · ${giftName} × ${quantity}`, amountPkr: unitPrice * quantity, direction: 'out', event });
}
export function addMoney(amountPkr: number, method: string) {
  pay({ kind: 'topup', description: `Added from ${method} (simulated)`, amountPkr, direction: 'in', method: `${method} (simulated)` });
}
