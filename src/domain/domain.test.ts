import { describe, expect, it } from 'vitest';
import type { PopularityEvent, User, ActivityRecord, Transaction } from '@/types/models';
import { breakdown, capActivity, supporters, quoteGift, DEFAULT_POLICY } from './popularity';
import { buildBoard, periodBounds } from './leaderboard';
import { applyChange, changeAllowance, checkAvailability, validateUsername, buildBloom, HOLD_MS, CHANGE_WINDOW_MS } from './username';
import { checkAge, checkSpend, relationshipAllowed, restrictionsFor } from './age';
import { effectivePresence, presenceForOthers, activeCustomStatus, AFK_AFTER_MS } from './presence';
import { balancePaisa, spentTodayPkr, refundable } from './payments';
import { contrast, grade } from './contrast';
import { parseInline, safeUrl } from './markdown';
import { matchScore } from './search';
import { evaluate } from './automod';
import { startOfKarachiDay, startOfKarachiWeek, karachiDay, DAY, HOUR } from './time';

const NOW = Date.parse('2026-10-15T12:00:00Z'); // Thursday 17:00 PKT
const ev = (o: Partial<PopularityEvent>): PopularityEvent => ({ id: Math.random().toString(36), recipient: 'a', at: NOW - HOUR, source: 'message', points: 10, paid: false, ...o });

describe('time (Asia/Karachi)', () => {
  it('day starts at 00:00 PKT = 19:00 UTC previous day', () => {
    expect(new Date(startOfKarachiDay(NOW)).toISOString()).toBe('2026-10-14T19:00:00.000Z');
    expect(karachiDay(Date.parse('2026-10-14T19:30:00Z'))).toBe('2026-10-15');
  });
  it('week starts Monday 00:00 PKT', () => {
    expect(new Date(startOfKarachiWeek(NOW)).toISOString()).toBe('2026-10-11T19:00:00.000Z');
  });
});

describe('popularity accounting', () => {
  const events = [
    ev({ source: 'message', points: 100 }),
    ev({ source: 'gift', points: 50, sender: 'b', paid: true, giftId: 'heart' }),
    ev({ source: 'gift', points: 5, sender: 'c', paid: false, giftId: 'chai' }),
    ev({ source: 'purchase', points: 500, paid: true }),
    ev({ source: 'legacy', points: 1000, at: NOW - 400 * DAY }),
  ];
  it('derives totals without double counting boosted', () => {
    const b = breakdown(events, 'a');
    expect(b).toEqual({ activity: 1100, gifts: 55, purchased: 500, total: 1655, boosted: 550 });
    expect(b.total).toBe(b.activity + b.gifts + b.purchased);
  });
  it('period breakdown excludes earlier events but lifetime keeps them', () => {
    expect(breakdown(events, 'a', startOfKarachiDay(NOW)).total).toBe(655);
    expect(breakdown(events, 'a').total).toBe(1655);
  });
  it('caps daily activity', () => {
    const today = [ev({ source: 'message', points: 280 })];
    expect(capActivity(today, 'a', 50, NOW)).toBe(DEFAULT_POLICY.dailyActivityCap - 280);
    expect(capActivity([ev({ points: 300 })], 'a', 10, NOW)).toBe(0);
  });
  it('ranks supporters by gift points then recency', () => {
    const s = supporters([
      ev({ source: 'gift', sender: 'x', points: 30, at: NOW - 3 * HOUR }),
      ev({ source: 'gift', sender: 'y', points: 30, at: NOW - HOUR }),
      ev({ source: 'gift', sender: 'z', points: 90 }),
    ], 'a');
    expect(s.map(x => x.userId)).toEqual(['z', 'y', 'x']);
  });
  it('quotes paid and free gifts', () => {
    expect(quoteGift({ id: 'h', name: 'Heart', points: 50, pricePkr: 90, art: 'heart' }, 3, 0)).toMatchObject({ totalPricePkr: 270, points: 150, paid: true });
    expect(quoteGift({ id: 'c', name: 'Chai', points: 5, pricePkr: 0, art: 'chai', dailyFree: 1 }, 2, 0)).toMatchObject({ points: 5, paid: false, freeLeft: 1 });
    expect(quoteGift({ id: 'c', name: 'Chai', points: 5, pricePkr: 0, art: 'chai', dailyFree: 1 }, 1, 1).points).toBe(0);
  });
});

describe('leaderboards', () => {
  const users: User[] = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, name: 'User ' + id, handle: id, color: '#fff', presence: 'online', badges: [], city: i < 2 ? 'Lahore' : 'Karachi', joinedAt: '2026-01-01' }));
  const events = [
    ev({ recipient: 'a', points: 50 }), ev({ recipient: 'b', points: 50 }), ev({ recipient: 'c', points: 70, serverId: 's1' }),
    ev({ recipient: 'd', points: 999, at: NOW - 30 * DAY }),
  ];
  const q = { metric: 'popularity' as const, scope: 'global' as const, period: 'daily' as const, me: 'a', now: NOW };
  it('filters before sorting and uses competition ranks with deterministic ties', () => {
    const b = buildBoard(users, events, [], q);
    expect(b.rows.map(r => [r.userId, r.rank])).toEqual([['c', 1], ['a', 2], ['b', 2]]);
    expect(b.me?.rank).toBe(2);
    expect(b.rows.find(r => r.userId === 'a')?.tied).toBe(true);
  });
  it('city scope and not-ranked state', () => {
    const b = buildBoard(users, events, [], { ...q, scope: 'city', city: 'Karachi' });
    expect(b.rows.map(r => r.userId)).toEqual(['c']);
    expect(b.me).toBeNull();
  });
  it('all-time includes old events; period never mutates lifetime', () => {
    expect(buildBoard(users, events, [], { ...q, period: 'all' }).rows[0]?.userId).toBe('d');
    expect(buildBoard(users, events, [], q).rows.some(r => r.userId === 'd')).toBe(false);
  });
  it('server scope uses only events earned in that server', () => {
    expect(buildBoard(users, events, [], { ...q, scope: 'server', serverId: 's1' }).rows.map(r => r.userId)).toEqual(['c']);
  });
  it('activity metrics read day records inside the period', () => {
    const act: ActivityRecord[] = [
      { userId: 'a', serverId: 's1', day: karachiDay(NOW), messages: 5, voiceMinutes: 30, studyMinutes: 0 },
      { userId: 'b', serverId: 's1', day: karachiDay(NOW - 2 * DAY), messages: 50, voiceMinutes: 0, studyMinutes: 0 },
    ];
    expect(buildBoard(users, [], act, { ...q, metric: 'messages' }).rows.map(r => r.userId)).toEqual(['a']);
    expect(buildBoard(users, [], act, { ...q, metric: 'messages', period: 'weekly' }).rows.map(r => r.userId)).toEqual(['b', 'a']);
  });
  it('period bounds', () => { expect(periodBounds('all', NOW).since).toBe(-Infinity); });
});

describe('usernames', () => {
  const reg = { active: new Map([['kaif', 'me'], ['ayesha.k', 'ay']]), holds: [{ name: 'old.ali', previousOwner: 'ali', heldUntil: NOW + DAY }, { name: 'kaif.old', previousOwner: 'me', heldUntil: NOW + DAY }], reserved: [{ name: 'atifaslam', category: 'artist' as const }] };
  it('validates rules', () => {
    expect(validateUsername('ab')).toBe('too-short');
    expect(validateUsername('Ali.Khan')).toBeNull();
    expect(validateUsername('.ali')).toBe('dot-edge');
    expect(validateUsername('a..b')).toBe('double-dot');
    expect(validateUsername('ali-khan')).toBe('charset');
    expect(validateUsername('x'.repeat(33))).toBe('too-long');
  });
  it('availability states incl. bloom fast path', () => {
    const bloom = buildBloom(reg);
    expect(checkAvailability('AYESHA.K', 'me', reg, NOW, bloom).state).toBe('taken');
    expect(checkAvailability('old.ali', 'me', reg, NOW).state).toBe('held');
    expect(checkAvailability('kaif.old', 'me', reg, NOW).state).toBe('held-by-you');
    expect(checkAvailability('atifaslam', 'me', reg, NOW).state).toBe('reserved');
    expect(checkAvailability('brand.new.name', 'me', reg, NOW, bloom)).toMatchObject({ state: 'available' });
    expect(checkAvailability('old.ali', 'me', reg, NOW + 2 * DAY).state).toBe('available');
  });
  it('rolling 14-day limit with next allowed date', () => {
    const h = [{ oldName: 'a', newName: 'b', changedAt: NOW - 13 * DAY }, { oldName: 'b', newName: 'c', changedAt: NOW - 2 * DAY }];
    const a = changeAllowance(h, NOW);
    expect(a.allowed).toBe(false);
    expect(a.nextAllowedAt).toBe(NOW - 13 * DAY + CHANGE_WINDOW_MS);
    expect(changeAllowance(h, NOW + 2 * DAY).allowed).toBe(true);
  });
  it('change creates a 30-day hold the owner can reclaim', () => {
    const r = applyChange('kaif', 'kaif.new', 'me', reg, [], NOW);
    expect(r.ok).toBe(true);
    expect(r.holds.find(x => x.name === 'kaif')).toMatchObject({ previousOwner: 'me', heldUntil: NOW + HOLD_MS });
    const back = applyChange('kaif.new', 'kaif.old', 'me', { ...reg, holds: r.holds }, r.history, NOW + HOUR);
    expect(back.ok).toBe(true);
  });
});

describe('age restrictions', () => {
  it('blocks under 13, flags minors', () => {
    expect(checkAge('2015-01-01', NOW)).toEqual({ ok: false, reason: 'under-13' });
    expect(checkAge('2010-10-16', NOW)).toMatchObject({ ok: true, group: 'minor', age: 15 });
    expect(checkAge('2008-10-15', NOW)).toMatchObject({ ok: true, group: 'adult', age: 18 });
  });
  it('minor restrictions enforced by actions', () => {
    expect(relationshipAllowed('minor', 'partner')).toBe(false);
    expect(relationshipAllowed('minor', 'sibling')).toBe(true);
    expect(restrictionsFor('minor').payouts).toBe(false);
    expect(checkSpend('minor', 1900, 200, 5000)).toMatchObject({ ok: false, reason: 'minor-cap', remainingPkr: 100 });
    expect(checkSpend('adult', 1900, 200, 5000)).toEqual({ ok: true });
    expect(checkSpend('adult', 0, 600, 500)).toMatchObject({ reason: 'balance' });
  });
});

describe('presence', () => {
  it('AFK derives idle only from online; manual overrides stick', () => {
    expect(effectivePresence('online', NOW - AFK_AFTER_MS, NOW)).toEqual({ shown: 'idle', reason: 'afk' });
    expect(effectivePresence('dnd', NOW - 99 * AFK_AFTER_MS, NOW)).toEqual({ shown: 'dnd' });
    expect(effectivePresence('online', NOW - 1000, NOW)).toEqual({ shown: 'online' });
  });
  it('invisible appears offline to others', () => {
    expect(presenceForOthers({ shown: 'invisible' })).toBe('offline');
  });
  it('custom status expiry', () => {
    expect(activeCustomStatus({ text: 'Exams', expiresAt: NOW - 1 }, NOW)).toBeUndefined();
    expect(activeCustomStatus({ text: 'Exams' }, NOW)?.text).toBe('Exams');
  });
});

describe('payments', () => {
  const tx = (o: Partial<Transaction>): Transaction => ({ id: 't', at: NOW, kind: 'gift', description: '', amountPaisa: -1000, status: 'succeeded', provider: 'test-gateway', ...o });
  it('only succeeded movements change balance', () => {
    expect(balancePaisa([tx({ kind: 'topup', amountPaisa: 50000 }), tx({}), tx({ status: 'pending' }), tx({ status: 'failed' }), tx({ status: 'refunded' })])).toBe(49000);
  });
  it('spent today and refund window', () => {
    expect(spentTodayPkr([tx({}), tx({ at: NOW - 2 * DAY })], NOW)).toBe(10);
    expect(refundable(tx({}), NOW)).toBe(true);
    expect(refundable(tx({ at: NOW - 8 * DAY }), NOW)).toBe(false);
  });
});

describe('contrast, markdown, search, automod', () => {
  it('contrast ratio', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(grade(contrast('#F2F3F5', '#18191C'))).toBe('AAA');
  });
  it('markdown is safe', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    const n = parseInline('hi **bold** @ali.h see https://example.com/x. <img>');
    expect(n.map(x => x.t)).toEqual(['text', 'bold', 'text', 'mention', 'text', 'link', 'text']);
    expect(parseInline('email me@site.com').some(x => x.t === 'mention')).toBe(false);
  });
  it('settings search tolerates a typo and matches concepts', () => {
    expect(matchScore('microphone', ['Voice & video', 'microphone input output'])).toBeGreaterThan(0);
    expect(matchScore('microphnoe', ['Voice & video', 'microphone'])).toBeGreaterThan(0);
    expect(matchScore('urdu', ['Language', 'english urdu arabic hindi'])).toBeGreaterThan(0);
    expect(matchScore('wallet', ['Language'])).toBe(0);
  });
  it('automod catches leetspeak, links and spam', () => {
    const cfg = { words: ['scam'], wordAction: 'delete' as const, blockLinks: true, allowedHosts: ['github.com'], blockInvites: true, mentionLimit: 3, spamRepeat: 3, raidJoinsPerMinute: 10, linkAction: 'delete' as const, spamAction: 'timeout' as const };
    expect(evaluate('free 5c4m here', cfg).map(v => v.rule)).toEqual(['word']);
    expect(evaluate('see https://github.com/x', cfg)).toEqual([]);
    expect(evaluate('see https://bad.example', cfg)[0]?.rule).toBe('link');
    expect(evaluate('buy', cfg, ['buy', 'buy'])[0]?.rule).toBe('spam');
  });
});

import { checkHandle, normaliseHandle, platform } from './social';
describe('social links', () => {
  it('normalises pasted profile URLs and @handles', () => {
    expect(normaliseHandle('instagram', 'https://www.instagram.com/kaif.dev/')).toBe('kaif.dev');
    expect(normaliseHandle('x', '@kaif_pk')).toBe('kaif_pk');
    expect(normaliseHandle('youtube', 'https://youtube.com/@GharTV')).toBe('GharTV');
    expect(normaliseHandle('linkedin', 'https://linkedin.com/in/kaif-ahmed')).toBe('kaif-ahmed');
    expect(normaliseHandle('website', 'https://kaif.dev/')).toBe('kaif.dev');
  });
  it('validates per platform rules', () => {
    expect(checkHandle('x', 'this_is_way_too_long_for_x')).toEqual({ ok: false, reason: 'format' });
    expect(checkHandle('x', '  ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkHandle('twitch', 'abc')).toEqual({ ok: false, reason: 'format' });
    expect(checkHandle('website', 'not a site')).toEqual({ ok: false, reason: 'format' });
    expect(checkHandle('instagram', 'kaif.dev')).toEqual({ ok: true, handle: 'kaif.dev' });
    expect(platform('youtube').url('GharTV')).toBe('https://youtube.com/@GharTV');
  });
});

import { searchMessages, NO_FILTERS, activeFilterCount, type IndexedMessage } from './chatSearch';
describe('chat search', () => {
  const base = Date.UTC(2026, 9, 10, 7, 0); // 10 Oct 2026, 12:00 Karachi
  const msgOf = (id: string, author: string, text: string, dayOffset: number, attachments: IndexedMessage['m']['attachments'] = []) =>
    ({ id, author, text, at: base + dayOffset * 86_400_000, attachments, reactions: {}, delivery: 'sent' }) as unknown as IndexedMessage['m'];
  const idx: IndexedMessage[] = [
    { m: msgOf('a', 'ayesha', 'Physics notes for chapter 6', 0, [{ kind: 'file', name: 'ch6.pdf', size: '1 MB' }]), key: 'dm:dm-ayesha', type: 'dm', label: 'Ayesha' },
    { m: msgOf('b', 'hamza', 'physics session tonight?', -2), key: 'channel:tc-general', type: 'server', label: '#general', serverId: 'tc' },
    { m: msgOf('c', 'hamza', 'meme dump', -1, [{ kind: 'image', name: 'meme.jpg', seed: 'x' }]), key: 'channel:cf-chat', type: 'room', label: '#chat', serverId: 'cf' },
    { m: msgOf('d', 'ayesha', 'Physics mock tomorrow', -5), key: 'channel:tc-general', type: 'server', label: '#general', serverId: 'tc' },
  ];
  it('returns nothing without criteria', () => { expect(searchMessages(idx, NO_FILTERS)).toEqual([]); });
  it('combines text, type, sender and date range with AND', () => {
    const r = searchMessages(idx, { ...NO_FILTERS, q: 'physics', type: 'server', sender: 'ayesha', from: '2026-10-01', to: '2026-10-08' });
    expect(r.map(h => h.m.id)).toEqual(['d']);
    expect(searchMessages(idx, { ...NO_FILTERS, q: 'physics', to: '2026-10-07' }).map(h => h.m.id)).toEqual(['d']);
  });
  it('filters by attachment kind and matches file names', () => {
    expect(searchMessages(idx, { ...NO_FILTERS, attach: 'image' }).map(h => h.m.id)).toEqual(['c']);
    expect(searchMessages(idx, { ...NO_FILTERS, attach: 'with' }).map(h => h.m.id)).toEqual(['a', 'c']);
    expect(searchMessages(idx, { ...NO_FILTERS, q: 'ch6' }).map(h => h.m.id)).toEqual(['a']);
  });
  it('restricts to one conversation and counts active filters', () => {
    const f = { ...NO_FILTERS, conv: 'channel:tc-general', sender: 'hamza' };
    expect(searchMessages(idx, f).map(h => h.m.id)).toEqual(['b']);
    expect(activeFilterCount(f)).toBe(2);
  });
});
