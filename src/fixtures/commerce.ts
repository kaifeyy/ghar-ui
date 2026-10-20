import type { ShopItem, Transaction } from '@/types/models';
import { DAY, HOUR } from '@/domain/time';
import { ago } from './users';

export const SHOP: ShopItem[] = [
  { id: 'th-graphite', name: 'Graphite', kind: 'theme', pricePkr: 0, preview: '#18191C' },
  { id: 'th-lahore', name: 'Lahore Night', kind: 'theme', pricePkr: 350, preview: '#17131F' },
  { id: 'th-monsoon', name: 'Monsoon', kind: 'theme', pricePkr: 350, preview: '#121A22' },
  { id: 'np-minimal', name: 'Minimal Line', kind: 'nameplate', pricePkr: 0, preview: '#303138' },
  { id: 'np-truck', name: 'Truck Art', kind: 'nameplate', pricePkr: 250, preview: '#F5B544' },
  { id: 'dec-ring', name: 'Crescent Ring', kind: 'decoration', pricePkr: 300, preview: '#3CCB91' },
  { id: 'bn-rain', name: 'Rain Banner', kind: 'banner', pricePkr: 200, preview: '#60A5FA' },
  { id: 'fx-confetti', name: 'Confetti Entrance', kind: 'effect', pricePkr: 400, preview: '#E879F9' },
  { id: 'fx-chai', name: 'Chai Steam Entrance', kind: 'effect', pricePkr: 250, preview: '#F5B544' },
  { id: 'bb-sky', name: 'Sky Bubbles', kind: 'bubble', pricePkr: 150, preview: '#38BDF8' },
  { id: 'ic-truck', name: 'Truck Art Icon', kind: 'icon', pricePkr: 120, preview: '#F5B544' },
  { id: 'ic-mono', name: 'Mono Icon', kind: 'icon', pricePkr: 0, preview: '#F2F3F5' },
  { id: 'ne-gold', name: 'Gold Name Effect', kind: 'name-effect', pricePkr: 500, preview: '#E5B454' },
];
export const OWNED = ['th-graphite', 'np-minimal', 'ic-mono'];

const tx = (id: string, msAgo: number, kind: Transaction['kind'], description: string, rupees: number, o: Partial<Transaction> = {}): Transaction => ({
  id, at: ago(msAgo), kind, description, amountPaisa: Math.round(rupees * 100), status: 'succeeded', provider: 'test-gateway', ...o,
});
export const TRANSACTIONS: Transaction[] = [
  tx('t1', 20 * DAY, 'topup', 'Added from JazzCash (test)', 2000),
  tx('t2', 9 * DAY, 'points', 'Bought 500 popularity points', -450, { grants: { kind: 'popularity-event', eventId: 'seed-purchase' } }),
  tx('t3', 8 * DAY, 'tip-in', 'Tip from Zainab Raza', 250, { feePaisa: 2500, provider: 'wallet' }),
  tx('t4', 6 * DAY, 'topup', 'Added from Easypaisa (test)', 1500),
  tx('t5', 70 * HOUR, 'gift', 'Gift to Ayesha Khan · Heart × 3', -270),
  tx('t6', 3 * DAY, 'unlock', 'Unlock attempt · #premium-notes', -250, { status: 'failed' }),
];

export const PLUS = { pricePkr: 499, perks: ['Bigger uploads (100 MB)', 'Animated avatar and banner', '1.5× server XP when you chat', 'Extra profile customisation'] };

export interface Payout { id: string; at: number; amountPkr: number; status: 'held' | 'available' | 'paid'; releaseAt: number; source: string }
export const PAYOUTS: Payout[] = [
  { id: 'po1', at: ago(2 * DAY), amountPkr: 225, status: 'held', releaseAt: ago(2 * DAY) + 7 * DAY, source: 'Tip from Zainab Raza (after 10% proposed fee)' },
  { id: 'po2', at: ago(12 * DAY), amountPkr: 540, status: 'available', releaseAt: ago(5 * DAY), source: 'Donations to Close Friends' },
];
