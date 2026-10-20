import { useMemo, useState, type ReactNode } from 'react';
import { Search, X, RotateCcw, Paperclip, Image as ImageIcon, FileText, Mic, Hash, MessageSquare, Users, Lock, SlidersHorizontal } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { go } from '@/state/actions/ui';
import { useT, useLocale, type Key, msg } from '@/i18n';
import { searchMessages, activeFilterCount, hasCriteria, NO_FILTERS, type ChatFilters, type IndexedMessage, type ConvType, type AttachmentFilter } from '@/domain/chatSearch';
import { formatKarachi } from '@/domain/time';
import { ScreenHeader } from '@/shell/Shell';
import { Button } from '@/ui/Button';
import { RadioList } from '@/ui/Form';
import { Select, DatePicker } from '@/ui/Pickers';
import { Avatar } from '@/ui/Avatar';
import { Empty, Note, Tag } from '@/ui/Misc';
import { usePhone } from '@/hooks/useMedia';
import type { AppState } from '@/state/types';

const PAGE = 30;
const TYPE_LABEL: Record<ConvType, Key> = { dm: msg('Direct messages'), room: msg('Rooms'), server: msg('Servers') };
const ATTACH_LABEL: Record<AttachmentFilter, Key> = { any: msg('Any'), with: msg('Has attachments'), image: msg('Images'), file: msg('Files'), voice: msg('Voice notes'), none: msg('No attachments') };

/** Builds the searchable index from every conversation this device holds. Encrypted communities are left out. */
function buildIndex(s: AppState, t: (k: Key, v?: Record<string, string | number>) => string): { index: IndexedMessage[]; skipped: number } {
  const index: IndexedMessage[] = [];
  let skipped = 0;
  for (const c of Object.values(s.conversations)) {
    const label = c.kind === 'group' ? c.name ?? t('Group') : s.users[c.members[0]!]?.name ?? '';
    for (const m of c.messages) if (!c.hiddenForMe.includes(m.id)) index.push({ m, key: `dm:${c.id}`, type: 'dm', label });
  }
  for (const id of s.joined) {
    const sv = s.servers[id];
    if (!sv) continue;
    const channels = sv.categories.flatMap(cat => cat.channelIds).map(cid => s.channels[cid]).filter(Boolean);
    if (sv.e2ee) { skipped += 1; continue; }
    for (const ch of channels) {
      for (const m of s.messages[ch!.id] ?? []) index.push({ m, key: `channel:${ch!.id}`, type: sv.kind === 'room' ? 'room' : 'server', label: `${sv.name} › #${ch!.name}`, serverId: sv.id });
    }
  }
  return { index, skipped };
}

/** Highlights query words inside plain text. Never renders HTML from messages. */
function Highlight({ text, q }: { text: string; q: string }) {
  const words = q.trim().split(/\s+/).filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'gi'));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}</>;
}

export function ChatSearchPage() {
  const t = useT();
  const locale = useLocale();
  const phone = usePhone();
  const f = useApp(s => s.chatSearch);
  const conversations = useApp(s => s.conversations);
  const messages = useApp(s => s.messages);
  const servers = useApp(s => s.servers);
  const channels = useApp(s => s.channels);
  const joined = useApp(s => s.joined);
  const users = useApp(s => s.users);
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(!phone);
  const set = (p: Partial<ChatFilters>) => { setLimit(PAGE); update(s => { Object.assign(s.chatSearch, p); }); };

  const { index, skipped } = useMemo(() => buildIndex({ conversations, messages, servers, channels, joined, users } as AppState, t), [conversations, messages, servers, channels, joined, users, t]);
  const hits = useMemo(() => searchMessages(index, f), [index, f]);

  // Option lists narrow to what the other filters allow, so impossible combinations aren't offered.
  const convOptions = useMemo(() => {
    const seen = new Map<string, { label: string; type: ConvType }>();
    for (const it of index) if (!seen.has(it.key)) seen.set(it.key, { label: it.label, type: it.type });
    return [...seen].filter(([, v]) => f.type === 'all' || v.type === f.type).sort((a, b) => a[1].label.localeCompare(b[1].label)).map(([k, v]) => [k, v.label] as const);
  }, [index, f.type]);
  const senderOptions = useMemo(() => {
    const ids = new Set(index.filter(it => (f.type === 'all' || it.type === f.type) && (!f.conv || it.key === f.conv)).map(it => it.m.author));
    return [...ids].filter(id => users[id]).sort((a, b) => users[a]!.name.localeCompare(users[b]!.name)).map(id => [id, id === 'me' ? t('You') : users[id]!.name] as const);
  }, [index, f.type, f.conv, users, t]);

  const chips: { label: ReactNode; clear: () => void }[] = [];
  if (f.type !== 'all') chips.push({ label: t(TYPE_LABEL[f.type]), clear: () => set({ type: 'all' }) });
  if (f.conv) chips.push({ label: convOptions.find(o => o[0] === f.conv)?.[1] ?? t('Conversation'), clear: () => set({ conv: '' }) });
  if (f.sender) chips.push({ label: t('From {name}', { name: users[f.sender]?.name ?? f.sender }), clear: () => set({ sender: '' }) });
  if (f.from) chips.push({ label: t('From {date}', { date: formatKarachi(Date.parse(f.from), { dateStyle: 'medium' }, locale) }), clear: () => set({ from: '' }) });
  if (f.to) chips.push({ label: t('Until {date}', { date: formatKarachi(Date.parse(f.to), { dateStyle: 'medium' }, locale) }), clear: () => set({ to: '' }) });
  if (f.attach !== 'any') chips.push({ label: t(ATTACH_LABEL[f.attach]), clear: () => set({ attach: 'any' }) });
  const nFilters = activeFilterCount(f);

  const open = (h: (typeof hits)[number]) => {
    update(s => { s.jump = { key: h.key, id: h.m.id }; });
    const [scope, id] = [h.key.slice(0, h.key.indexOf(':')), h.key.slice(h.key.indexOf(':') + 1)];
    if (scope === 'dm') go({ name: 'dm', convId: id });
    else go({ name: 'channel', serverId: h.serverId!, channelId: id });
  };

  return (
    <>
      <ScreenHeader icon={<Search size={20} />} title={t('Search messages')} subtitle={t('Direct messages, rooms and servers on this device')} backTo />
      <div className="scroll">
        <div className="page page-wide chat-search">
          <form className="row g8" role="search" onSubmit={e => e.preventDefault()}>
            <div className="field grow">
              <label className="sr" htmlFor="cs-q">{t('Search messages')}</label>
              <div className="fbox"><Search size={16} aria-hidden="true" className="mut" />
                <input id="cs-q" type="search" value={f.q} onChange={e => set({ q: e.target.value })} placeholder={t('Words, names or file names')} autoFocus />
                {f.q && <button type="button" className="sel-clear" aria-label={t('Clear search')} onClick={() => set({ q: '' })}><X size={14} /></button>}
              </div>
            </div>
            <Button icon={SlidersHorizontal} aria-expanded={showFilters} aria-controls="cs-filters" onClick={() => setShowFilters(v => !v)}>{t('Filters')}{nFilters ? ` (${nFilters})` : ''}</Button>
          </form>

          {showFilters && (
            <section id="cs-filters" className="cs-filters" aria-label={t('Filters')}>
              <RadioList name="cs-type" legend={t('Conversation type')} variant="segmented" value={f.type} onChange={v => set({ type: v, conv: '', sender: '' })}
                options={[{ value: 'all', label: t('All') }, { value: 'dm', label: t('Direct messages') }, { value: 'room', label: t('Rooms') }, { value: 'server', label: t('Servers') }]} />
              <div className="cs-grid">
                <Select label={t('Conversation or channel')} value={f.conv} onValue={v => set({ conv: v, sender: '' })} options={[['', t('Any')] as const, ...convOptions]} searchable />
                <Select label={t('Sender')} value={f.sender} onValue={v => set({ sender: v })} options={[['', t('Anyone')] as const, ...senderOptions]} searchable />
                <DatePicker label={t('From date')} value={f.from} onChange={v => set({ from: v })} max={f.to || undefined} />
                <DatePicker label={t('To date')} value={f.to} onChange={v => set({ to: v })} min={f.from || undefined} />
                <Select<AttachmentFilter> label={t('Attachments')} value={f.attach} onValue={v => set({ attach: v })} options={(Object.keys(ATTACH_LABEL) as AttachmentFilter[]).map(k => [k, t(ATTACH_LABEL[k])] as const)} />
              </div>
            </section>
          )}

          {(chips.length > 0 || f.q) && (
            <div className="row g8 wrap cs-active" aria-label={t('Active filters')}>
              {chips.map((c, i) => <span key={i} className="filter-chip">{c.label}<button type="button" onClick={c.clear} aria-label={t('Remove filter')}><X size={14} aria-hidden="true" /></button></span>)}
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { setLimit(PAGE); update(s => { s.chatSearch = { ...NO_FILTERS }; }); }}>{t('Reset all')}</Button>
            </div>
          )}

          <p className="meta" role="status" aria-live="polite">{hasCriteria(f) ? t('{n} results', { n: hits.length }) : ''}</p>
          {skipped > 0 && <Note tone="info">{t('{n} encrypted communities aren’t searched.', { n: skipped })}</Note>}

          {!hasCriteria(f) ? (
            <Empty icon={Search} title={t('Search across your chats')}>{t('Type a word, or pick filters like sender, date or attachments.')}</Empty>
          ) : hits.length === 0 ? (
            <Empty icon={Search} title={t('No messages match')} action={<Button icon={RotateCcw} onClick={() => update(s => { s.chatSearch = { ...NO_FILTERS, q: s.chatSearch.q }; })}>{t('Clear filters')}</Button>}>{t('Try fewer filters, a wider date range or different words.')}</Empty>
          ) : (
            <ul className="cs-results">
              {hits.slice(0, limit).map(h => {
                const TypeIcon = h.type === 'dm' ? (conversations[h.key.slice(3)]?.kind === 'group' ? Users : MessageSquare) : Hash;
                const atts = (h.m.attachments ?? []).filter(a => a.kind !== 'sticker');
                return (
                  <li key={h.key + h.m.id}>
                    <button type="button" className="cs-hit" onClick={() => open(h)}>
                      <Avatar userId={h.m.author} size={36} />
                      <span className="grow cs-body">
                        <span className="row g8 wrap cs-meta"><b dir="auto">{users[h.m.author]?.name ?? h.m.author}</b>
                          <span className="row g4 meta cs-where"><TypeIcon size={13} aria-hidden="true" /><span className="ellip" dir="auto">{h.label}</span></span>
                          <span className="meta">{formatKarachi(h.m.at, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }, locale)}</span>
                        </span>
                        {h.m.text && <span className="cs-text clamp2" dir="auto"><Highlight text={h.m.text} q={f.q} /></span>}
                        {atts.length > 0 && <span className="row g4 wrap">{atts.map((a, i) => <Tag key={i} tone="outline" icon={a.kind === 'image' ? ImageIcon : a.kind === 'voice' ? Mic : a.kind === 'file' ? FileText : Paperclip}>{a.kind === 'voice' ? t('Voice note') : 'name' in a ? a.name : ''}</Tag>)}</span>}
                      </span>
                      {h.type === 'dm' && <Lock size={14} aria-label={t('Encrypted conversation, searched on this device')} className="mut" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {hits.length > limit && <div className="center-row row"><Button onClick={() => setLimit(l => l + PAGE)}>{t('Show more results ({n} left)', { n: hits.length - limit })}</Button></div>}
        </div>
      </div>
    </>
  );
}
