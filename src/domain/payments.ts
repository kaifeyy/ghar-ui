import type { PaymentOutcome, Transaction } from '@/types/models';
import { startOfKarachiDay } from './time';

/** Balance = succeeded money movements. Pending/failed/cancelled never move the balance; refunds add back. */
export function balancePaisa(txs: readonly Transaction[]): number {
  let b = 0;
  for (const t of txs) {
    if (t.status === 'succeeded') b += t.amountPaisa;
    // a refunded purchase is restored: its original debit no longer counts
  }
  return b;
}

export function spentTodayPkr(txs: readonly Transaction[], now: number): number {
  const start = startOfKarachiDay(now);
  return Math.round(
    txs.filter(t => t.status === 'succeeded' && t.at >= start && t.amountPaisa < 0 && t.kind !== 'payout').reduce((s, t) => s - t.amountPaisa, 0) / 100,
  );
}

/** Proposed platform fees (PRD §5, proposals to validate) — configurable sample values. */
export const FEES = { tip: 0.10, donation: 0.10, unlock: 0.15, sponsor: 0.20 } as const;
export const feeFor = (kind: keyof typeof FEES, paisa: number) => Math.round(Math.abs(paisa) * FEES[kind]);

export const PAYOUT_HOLD_DAYS = 7;

export interface GatewayResult { outcome: PaymentOutcome; delayMs: number }
/** The test gateway is deterministic: the selected outcome is what happens. */
export function simulateGateway(outcome: PaymentOutcome): GatewayResult {
  return { outcome, delayMs: 1800 };
}

export function refundable(t: Transaction, now: number, windowDays = 7): boolean {
  return t.status === 'succeeded' && t.amountPaisa < 0 && t.provider === 'test-gateway' && now - t.at < windowDays * 86_400_000 && t.kind !== 'payout';
}
