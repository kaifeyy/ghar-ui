import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Activity, Coffee, Leaf, Lightbulb, Plane, Search, Smile, Sparkles, Sticker as StickerIcon, X } from 'lucide-react';
import type { CustomEmoji } from '@/types/models';
import { matchScore } from '@/domain/search';
import { useT, type Key } from '@/i18n';
import { useDismiss, useFloating } from './Pickers';
import { PLATFORM_EMOJI, type EmojiCategory } from './emojiData';

export type EmojiPickerSelection =
  | { kind: 'unicode'; emoji: string }
  | { kind: 'custom'; emoji: CustomEmoji }
  | { kind: 'sticker'; sticker: CustomEmoji };

interface EmojiPickerProps {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  onSelect: (selection: EmojiPickerSelection) => void;
  customEmoji?: CustomEmoji[];
  stickers?: CustomEmoji[];
}

type Tab = 'all' | EmojiCategory | 'custom' | 'stickers';
type Item =
  | { id: string; kind: 'unicode'; emoji: string; label: string; category: EmojiCategory }
  | { id: string; kind: 'custom'; emoji: CustomEmoji; label: string }
  | { id: string; kind: 'sticker'; sticker: CustomEmoji; label: string };

const CATEGORIES: { id: EmojiCategory; label: Key; icon: typeof Smile }[] = [
  { id: 'people', label: 'People', icon: Smile },
  { id: 'nature', label: 'Nature', icon: Leaf },
  { id: 'food', label: 'Food', icon: Coffee },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'objects', label: 'Objects', icon: Lightbulb },
  { id: 'symbols', label: 'Symbols', icon: Sparkles },
];

function customArt(emoji: CustomEmoji) {
  return emoji.art.kind === 'glyph' ? emoji.art.glyph : <img src={emoji.art.url} alt="" />;
}

export function EmojiPicker({ open, anchor, onClose, onSelect, customEmoji = [], stickers = [] }: EmojiPickerProps) {
  const t = useT();
  const pickerId = useId();
  const trigger = useRef<HTMLElement>(anchor);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  trigger.current = anchor;

  const close = (refocus: boolean) => {
    onClose();
    if (refocus) trigger.current?.focus();
  };

  useFloating(open, trigger, panel);
  useDismiss(open, close, [trigger, panel]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTab('all');
    requestAnimationFrame(() => search.current?.focus());
  }, [open]);

  const allItems = useMemo<Item[]>(() => [
    ...PLATFORM_EMOJI.map(e => ({ id: e.emoji, kind: 'unicode' as const, emoji: e.emoji, label: e.name, category: e.category })),
    ...customEmoji.map(e => ({ id: `custom-${e.id}`, kind: 'custom' as const, emoji: e, label: `:${e.name}:` })),
    ...stickers.map(e => ({ id: `sticker-${e.id}`, kind: 'sticker' as const, sticker: e, label: t('Sticker: {name}', { name: e.name }) })),
  ], [customEmoji, stickers, t]);

  const items = useMemo(() => allItems.filter(item => {
    const matchesSearch = !query.trim() || matchScore(query, [item.label, item.kind === 'unicode' ? item.emoji : '']) > 0;
    if (!matchesSearch) return false;
    if (query.trim() || tab === 'all') return true;
    if (tab === 'custom') return item.kind === 'custom';
    if (tab === 'stickers') return item.kind === 'sticker';
    return item.kind === 'unicode' && item.category === tab;
  }), [allItems, query, tab]);

  const pick = (item: Item) => {
    close(true);
    if (item.kind === 'unicode') onSelect({ kind: 'unicode', emoji: item.emoji });
    else if (item.kind === 'custom') onSelect({ kind: 'custom', emoji: item.emoji });
    else onSelect({ kind: 'sticker', sticker: item.sticker });
  };

  const onPickerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
  };

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(e.currentTarget.querySelectorAll<HTMLButtonElement>('.emoji-option'))];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const columns = 7;
    const rtl = document.documentElement.dir === 'rtl';
    const next = e.key === 'ArrowRight' ? current + (rtl ? -1 : 1)
      : e.key === 'ArrowLeft' ? current + (rtl ? 1 : -1)
      : e.key === 'ArrowDown' ? current + columns
      : e.key === 'ArrowUp' ? current - columns
      : e.key === 'Home' ? 0
      : e.key === 'End' ? buttons.length - 1
      : current;
    if (next !== current) { e.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus(); }
  };

  const labelForTab = (id: Tab) => id === 'all' ? t('All') : id === 'custom' ? t('Community emoji') : id === 'stickers' ? t('Stickers') : t(CATEGORIES.find(c => c.id === id)!.label);
  const tabs: Tab[] = ['all', ...CATEGORIES.map(c => c.id), ...(customEmoji.length ? ['custom' as const] : []), ...(stickers.length ? ['stickers' as const] : [])];
  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const rtl = document.documentElement.dir === 'rtl';
    const next = e.key === 'ArrowRight' ? current + (rtl ? -1 : 1)
      : e.key === 'ArrowLeft' ? current + (rtl ? 1 : -1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? buttons.length - 1
      : current;
    if (next !== current) { e.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus(); buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.click(); }
  };

  return (
    <div ref={panel} className="emoji-picker pop" popover="manual" hidden={!open} role="dialog" aria-modal="false" aria-label={t('Emoji picker')} onKeyDown={onPickerKey}>
      <div className="emoji-picker-search fbox">
        <Search size={16} aria-hidden="true" className="mut" />
        <input ref={search} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Search emoji')} aria-label={t('Search emoji')} />
        {query && <button type="button" className="sel-clear" aria-label={t('Clear search')} onClick={() => { setQuery(''); search.current?.focus(); }}><X size={14} aria-hidden="true" /></button>}
      </div>
      <div className="emoji-tabs" role="tablist" aria-label={t('Emoji categories')} onKeyDown={onTabsKey}>
        {tabs.map(id => {
          const C = CATEGORIES.find(c => c.id === id);
          const Icon = id === 'custom' ? Smile : id === 'stickers' ? StickerIcon : C?.icon;
          return <button key={id} id={`${pickerId}-${id}`} type="button" role="tab" aria-controls={`${pickerId}-panel`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className={tab === id ? 'is-on' : ''} onClick={() => { setTab(id); setQuery(''); }}>
            {Icon && <Icon size={15} aria-hidden="true" />}<span>{labelForTab(id)}</span>
          </button>;
        })}
      </div>
      <div id={`${pickerId}-panel`} className="emoji-grid-wrap" role="tabpanel" aria-labelledby={`${pickerId}-${tab}`}>
        {items.length ? (
          <div className="emoji-grid" role="group" aria-label={labelForTab(query ? 'all' : tab)} onKeyDown={onGridKey}>
            {items.map(item => (
              <button key={item.id} type="button" className="emoji-option" aria-label={item.label} title={item.label} onClick={() => pick(item)}>
                {item.kind === 'unicode' ? item.emoji : item.kind === 'custom' ? customArt(item.emoji) : customArt(item.sticker)}
              </button>
            ))}
          </div>
        ) : <p className="emoji-empty meta">{t('No emoji found')}</p>}
      </div>
    </div>
  );
}
