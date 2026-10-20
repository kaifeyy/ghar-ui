import type { Message } from '@/types/models';
import { matchScore } from './search';
import { karachiDay } from './time';

export type ConvType = 'dm' | 'room' | 'server';
export type AttachmentFilter = 'any' | 'with' | 'image' | 'file' | 'voice' | 'none';
export interface ChatFilters {
  q: string;
  type: ConvType | 'all';
  /** "<scope>:<id>" of one conversation or channel, or '' for all */
  conv: string;
  sender: string;
  /** inclusive Asia/Karachi calendar days, YYYY-MM-DD, '' for open-ended */
  from: string;
  to: string;
  attach: AttachmentFilter;
}
export const NO_FILTERS: ChatFilters = { q: '', type: 'all', conv: '', sender: '', from: '', to: '', attach: 'any' };

export interface IndexedMessage { m: Message; key: string; type: ConvType; label: string; serverId?: string }
export interface SearchHit extends IndexedMessage { score: number }

export const activeFilterCount = (f: ChatFilters) =>
  (f.type !== 'all' ? 1 : 0) + (f.conv ? 1 : 0) + (f.sender ? 1 : 0) + (f.from ? 1 : 0) + (f.to ? 1 : 0) + (f.attach !== 'any' ? 1 : 0);
export const hasCriteria = (f: ChatFilters) => !!f.q.trim() || activeFilterCount(f) > 0;

function attachOk(m: Message, a: AttachmentFilter): boolean {
  const list = (m.attachments ?? []).filter(x => x.kind !== 'sticker');
  switch (a) {
    case 'any': return true;
    case 'with': return list.length > 0;
    case 'none': return list.length === 0;
    default: return list.some(x => x.kind === a);
  }
}

/** All filters combine with AND. Results: best text match first, then newest; ties broken by id for stable order. */
export function searchMessages(index: readonly IndexedMessage[], f: ChatFilters): SearchHit[] {
  if (!hasCriteria(f)) return [];
  const q = f.q.trim();
  const out: SearchHit[] = [];
  for (const it of index) {
    const { m } = it;
    if (m.system) continue;
    if (f.type !== 'all' && it.type !== f.type) continue;
    if (f.conv && it.key !== f.conv) continue;
    if (f.sender && m.author !== f.sender) continue;
    if (f.from || f.to) {
      const d = karachiDay(m.at);
      if (f.from && d < f.from) continue;
      if (f.to && d > f.to) continue;
    }
    if (!attachOk(m, f.attach)) continue;
    let score = 1;
    if (q) {
      const names = (m.attachments ?? []).flatMap(a => (a.kind === 'image' || a.kind === 'file' ? [a.name] : []));
      score = matchScore(q, [m.text, ...names]);
      if (score <= 0) continue;
    }
    out.push({ ...it, score });
  }
  return out.sort((a, b) => (q ? b.score - a.score : 0) || b.m.at - a.m.at || a.m.id.localeCompare(b.m.id));
}
