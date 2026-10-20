import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, Search, X } from 'lucide-react';
import { useT, useLocale } from '@/i18n';
import { matchScore } from '@/domain/search';

/* ------------------------------------------------------------------
   Floating layer: uses the Popover API (top layer, so it sits above
   modal <dialog>s) and positions itself next to an anchor, flipping
   to stay inside the viewport.
   ------------------------------------------------------------------ */
export function useFloating(open: boolean, anchor: RefObject<HTMLElement | null>, layer: RefObject<HTMLElement | null>, opts: { matchWidth?: boolean; point?: { x: number; y: number } | null } = {}) {
  useLayoutEffect(() => {
    const el = layer.current;
    if (!el) return;
    if (!open) { try { if (el.matches(':popover-open')) el.hidePopover(); } catch { /* no popover api */ } return; }
    try { if (!el.matches(':popover-open')) el.showPopover(); } catch { /* fallback: fixed + z-index */ }
    const place = () => {
      const w0 = opts.matchWidth && anchor.current ? anchor.current.getBoundingClientRect().width : 0;
      if (w0) el.style.minWidth = w0 + 'px';
      const w = el.offsetWidth, h = el.offsetHeight;
      let x: number, y: number;
      if (opts.point) { x = opts.point.x; y = opts.point.y; if (x + w > innerWidth - 8) x = x - w; if (y + h > innerHeight - 8) y = y - h; }
      else {
        const r = anchor.current?.getBoundingClientRect();
        if (!r) return;
        const rtl = document.documentElement.dir === 'rtl';
        x = rtl ? r.right - w : r.left;
        y = r.bottom + 4;
        if (y + h > innerHeight - 8 && r.top - h - 4 > 8) y = r.top - h - 4;
      }
      el.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px';
      el.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + 'px';
    };
    place();
    const onMove = (e?: Event) => { if (e && el.contains(e.target as Node)) return; place(); };
    addEventListener('resize', onMove);
    document.addEventListener('scroll', onMove, true);
    return () => { removeEventListener('resize', onMove); document.removeEventListener('scroll', onMove, true); };
  });
}

/** Close on outside pointer. Escape is handled by each component so focus can return to its trigger. */
export function useDismiss(open: boolean, close: (refocus: boolean) => void, refs: RefObject<HTMLElement | null>[]) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!refs.some(r => r.current?.contains(e.target as Node))) closeRef.current(false); };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------------- Select (listbox) ---------------- */
export interface SelectProps<V extends string> {
  label?: ReactNode; srLabel?: boolean; hint?: ReactNode; error?: string | null; className?: string; id?: string;
  value: V; options: readonly (readonly [V, string])[]; onValue: (v: V) => void;
  disabled?: boolean; searchable?: boolean; placeholder?: string; required?: boolean; 'aria-label'?: string;
}
export function Select<V extends string>({ label, srLabel, hint, error, className = '', id: idProp, value, options, onValue, disabled, searchable, placeholder, required, ...aria }: SelectProps<V>) {
  const t = useT();
  const auto = useId();
  const id = idProp ?? auto;
  const listId = `${id}-list`;
  const btn = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const typed = useRef({ s: '', at: 0 });
  const withSearch = searchable ?? options.length > 8;
  const shown = useMemo(() => (q.trim() ? options.filter(([, l]) => matchScore(q, [l]) > 0) : options), [options, q]);
  const current = options.find(([v]) => v === value);

  const doOpen = () => { if (disabled) return; setQ(''); setActive(Math.max(0, options.findIndex(([v]) => v === value))); setOpen(true); };
  const close = (refocus: boolean) => { setOpen(false); if (refocus) btn.current?.focus(); };
  const pick = (v: V) => { onValue(v); close(true); };
  useFloating(open, btn, layer, { matchWidth: true });
  useDismiss(open, close, [btn, layer]);
  useEffect(() => { if (open) requestAnimationFrame(() => (withSearch ? search.current : layer.current?.querySelector<HTMLElement>('[role=listbox]'))?.focus()); }, [open, withSearch]);
  useEffect(() => { document.getElementById(`${id}-o${active}`)?.scrollIntoView?.({ block: "nearest" }); }, [active, open, id]);
  useEffect(() => setActive(0), [q]);

  const onListKey = (e: KeyboardEvent) => {
    const n = shown.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(n - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(n - 1); }
    else if (e.key === 'Enter' || (e.key === ' ' && !withSearch)) { e.preventDefault(); const o = shown[active]; if (o) pick(o[0]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') close(false);
    else if (!withSearch && e.key.length === 1) typeahead(e.key, i => setActive(i));
  };
  const typeahead = (ch: string, go: (i: number) => void) => {
    const now = Date.now();
    typed.current = { s: (now - typed.current.at < 700 ? typed.current.s : '') + ch.toLowerCase(), at: now };
    const i = options.findIndex(([, l]) => l.toLowerCase().startsWith(typed.current.s));
    if (i >= 0) go(i);
  };
  const onBtnKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); doOpen(); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) typeahead(e.key, i => { const o = options[i]; if (o) onValue(o[0]); });
  };
  const activeId = shown[active] ? `${id}-o${active}` : undefined;

  return (
    <div className={`field is-select ${className}`}>
      {label && <label className={`flabel ${srLabel ? 'sr' : ''}`} htmlFor={id} onClick={e => { e.preventDefault(); btn.current?.focus(); }}>{label}{required && <span className="mut"> *</span>}</label>}
      <button ref={btn} id={id} type="button" className={`fbox sel-trigger ${error ? 'is-err' : ''} ${open ? 'is-open' : ''}`} disabled={disabled}
        role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} aria-label={aria['aria-label']}
        onClick={() => (open ? close(false) : doOpen())} onKeyDown={onBtnKey}>
        <span className={`grow ellip ${current ? '' : 'mut'}`}>{current ? current[1] : placeholder ?? t('Choose…')}</span>
        <ChevronDown size={16} aria-hidden="true" className="mut sel-chev" />
      </button>
      {error ? <span className="ferr" id={`${id}-e`} role="alert">{error}</span> : hint ? <span className="fhint" id={`${id}-h`}>{hint}</span> : null}
      <div ref={layer} popover="manual" className="pop sel-pop" hidden={!open}>
        {withSearch && (
          <div className="sel-search fbox">
            <Search size={15} aria-hidden="true" className="mut" />
            <input ref={search} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onListKey} placeholder={t('Search')} aria-label={t('Search options')}
              role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={activeId} aria-autocomplete="list" />
            {q && <button type="button" className="sel-clear" aria-label={t('Clear search')} onClick={() => { setQ(''); search.current?.focus(); }}><X size={14} /></button>}
          </div>
        )}
        <ul id={listId} role="listbox" tabIndex={withSearch ? -1 : 0} aria-labelledby={id} aria-activedescendant={withSearch ? undefined : activeId} onKeyDown={withSearch ? undefined : onListKey} className="sel-list">
          {shown.map(([v, l], i) => (
            <li key={v} id={`${id}-o${i}`} role="option" aria-selected={v === value} className={`sel-opt ${i === active ? 'is-active' : ''} ${v === value ? 'is-sel' : ''}`}
              onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(v)}>
              <span className="grow">{l}</span>{v === value && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
          {!shown.length && <li className="sel-empty meta" role="presentation">{t('No matches')}</li>}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Date picker (calendar grid) ---------------- */
const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s: string | undefined) => { const m = s && /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? { y: +m[1]!, m: +m[2]! - 1, d: +m[3]! } : null; };
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export interface DatePickerProps { label?: ReactNode; hint?: ReactNode; error?: string | null; className?: string; value: string; onChange: (iso: string) => void; min?: string; max?: string; required?: boolean; placeholder?: string; id?: string }
export function DatePicker({ label, hint, error, className = '', value, onChange, min, max, required, placeholder, id: idProp }: DatePickerProps) {
  const t = useT();
  const locale = useLocale();
  const auto = useId();
  const id = idProp ?? auto;
  const btn = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const today = new Date();
  const sel = parse(value);
  const init = sel ?? parse(max && max < toIso(today.getFullYear(), today.getMonth(), today.getDate()) ? max : undefined) ?? { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
  const [view, setView] = useState({ y: init.y, m: init.m });
  const [focus, setFocus] = useState(init.d);
  const [mode, setMode] = useState<'days' | 'years' | 'months'>('days');
  const minP = parse(min), maxP = parse(max);
  const iso = (d: number) => toIso(view.y, view.m, d);
  const allowed = (s: string) => (!min || s >= min) && (!max || s <= max);
  const close = (refocus: boolean) => { setOpen(false); setMode('days'); if (refocus) btn.current?.focus(); };
  useFloating(open, btn, layer);
  useDismiss(open, close, [btn, layer]);
  useEffect(() => { if (open && mode === 'days') requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()); }, [open, view, focus, mode]);

  const doOpen = () => { const s = sel ?? init; setView({ y: s.y, m: s.m }); setFocus(s.d); setMode('days'); setOpen(true); };
  const shiftMonth = (k: number) => setView(v => { const d = new Date(Date.UTC(v.y, v.m + k, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const moveFocus = (delta: number) => {
    const d = new Date(Date.UTC(view.y, view.m, focus + delta));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); setFocus(d.getUTCDate());
  };
  const onGridKey = (e: KeyboardEvent) => {
    const rtl = document.documentElement.dir === 'rtl';
    const map: Record<string, number> = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in map) { e.preventDefault(); moveFocus(map[e.key]!); }
    else if (e.key === 'PageUp') { e.preventDefault(); shiftMonth(e.shiftKey ? -12 : -1); }
    else if (e.key === 'PageDown') { e.preventDefault(); shiftMonth(e.shiftKey ? 12 : 1); }
    else if (e.key === 'Home') { e.preventDefault(); setFocus(1); }
    else if (e.key === 'End') { e.preventDefault(); setFocus(daysIn(view.y, view.m)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const s = iso(Math.min(focus, daysIn(view.y, view.m))); if (allowed(s)) { onChange(s); close(true); } }
  };
  const onLayerKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); } };

  const fmt = (o: Intl.DateTimeFormatOptions, y: number, m: number, d = 1) => new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, d)));
  const weekdays = Array.from({ length: 7 }, (_, i) => fmt({ weekday: 'narrow' }, 2024, 0, 7 + i)); // 7 Jan 2024 is a Sunday
  const lead = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const n = daysIn(view.y, view.m);
  const fd = Math.min(focus, n);
  const yNow = today.getFullYear();
  const yMin = minP?.y ?? yNow - 100, yMax = maxP?.y ?? yNow + 10;
  const [yPage, setYPage] = useState(0);
  const yStart = Math.min(yMax - 11, Math.max(yMin, view.y - 5 + yPage * 12));
  const canPrev = !minP || toIso(view.y, view.m, 1) > (min ?? '');
  const canNext = !maxP || toIso(view.y, view.m, n) < (max ?? '9');

  return (
    <div className={`field ${className}`}>
      {label && <label className="flabel" htmlFor={id} onClick={e => { e.preventDefault(); btn.current?.focus(); }}>{label}{required && <span className="mut"> *</span>}</label>}
      <button ref={btn} id={id} type="button" className={`fbox sel-trigger ${error ? 'is-err' : ''}`} aria-haspopup="dialog" aria-expanded={open}
        aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} onClick={() => (open ? close(false) : doOpen())}>
        <CalendarDays size={16} aria-hidden="true" className="mut" />
        <span className={`grow ellip ${sel ? '' : 'mut'}`}>{sel ? fmt({ dateStyle: 'medium' }, sel.y, sel.m, sel.d) : placeholder ?? t('Pick a date')}</span>
        <ChevronDown size={16} aria-hidden="true" className="mut" />
      </button>
      {error ? <span className="ferr" id={`${id}-e`} role="alert">{error}</span> : hint ? <span className="fhint" id={`${id}-h`}>{hint}</span> : null}
      <div ref={layer} popover="manual" className="pop cal-pop" hidden={!open} role="dialog" aria-label={t('Choose a date')} onKeyDown={onLayerKey}>
        <div className="cal-head">
          <button type="button" className="cal-nav" aria-label={mode === 'years' ? t('Earlier years') : t('Previous month')} disabled={mode === 'days' && !canPrev} onClick={() => (mode === 'years' ? setYPage(p => p - 1) : shiftMonth(-1))}><ChevronLeft size={18} className="flip" aria-hidden="true" /></button>
          <button type="button" className="cal-title" aria-live="polite" onClick={() => { setYPage(0); setMode(m => (m === 'days' ? 'years' : 'days')); }}>
            {mode === 'years' ? `${yStart} – ${yStart + 11}` : fmt({ month: 'long', year: 'numeric' }, view.y, view.m)}<ChevronDown size={14} aria-hidden="true" />
          </button>
          <button type="button" className="cal-nav" aria-label={mode === 'years' ? t('Later years') : t('Next month')} disabled={mode === 'days' && !canNext} onClick={() => (mode === 'years' ? setYPage(p => p + 1) : shiftMonth(1))}><ChevronRight size={18} className="flip" aria-hidden="true" /></button>
        </div>
        {mode === 'years' && (
          <div className="cal-yg" role="group" aria-label={t('Year')}>
            {Array.from({ length: 12 }, (_, i) => yStart + i).map(y => (
              <button key={y} type="button" className={`cal-cell ${y === view.y ? 'is-sel' : ''}`} disabled={y < yMin || y > yMax} aria-pressed={y === view.y} onClick={() => { setView(v => ({ y, m: v.m })); setMode('months'); }}>{y}</button>
            ))}
          </div>
        )}
        {mode === 'months' && (
          <div className="cal-yg" role="group" aria-label={t('Month')}>
            {Array.from({ length: 12 }, (_, m) => m).map(m => {
              const off = (min && toIso(view.y, m, daysIn(view.y, m)) < min) || (max && toIso(view.y, m, 1) > max);
              return <button key={m} type="button" className={`cal-cell ${m === view.m ? 'is-sel' : ''}`} disabled={!!off} aria-pressed={m === view.m} onClick={() => { setView(v => ({ y: v.y, m })); setMode('days'); }}>{fmt({ month: 'short' }, view.y, m)}</button>;
            })}
          </div>
        )}
        {mode === 'days' && (
          <div ref={grid} role="grid" aria-label={fmt({ month: 'long', year: 'numeric' }, view.y, view.m)} onKeyDown={onGridKey}>
            <div role="row" className="cal-row cal-wd">{weekdays.map((w, i) => <span key={i} role="columnheader" className="cal-wdc">{w}</span>)}</div>
            {Array.from({ length: Math.ceil((lead + n) / 7) }, (_, r) => (
              <div role="row" className="cal-row" key={r}>
                {Array.from({ length: 7 }, (_, c) => {
                  const d = r * 7 + c - lead + 1;
                  if (d < 1 || d > n) return <span key={c} role="gridcell" className="cal-day is-blank" />;
                  const s = iso(d);
                  const ok = allowed(s);
                  const isSel = value === s;
                  const isToday = s === toIso(yNow, today.getMonth(), today.getDate());
                  return (
                    <span key={c} role="gridcell" aria-selected={isSel}>
                      <button type="button" tabIndex={d === fd ? 0 : -1} className={`cal-day ${isSel ? 'is-sel' : ''} ${isToday ? 'is-today' : ''}`} disabled={!ok}
                        aria-label={fmt({ dateStyle: 'full' }, view.y, view.m, d)} onClick={() => { onChange(s); close(true); }} onFocus={() => setFocus(d)}>{d}</button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div className="cal-foot">
          {allowed(toIso(yNow, today.getMonth(), today.getDate())) && <button type="button" className="linkish" onClick={() => { onChange(toIso(yNow, today.getMonth(), today.getDate())); close(true); }}>{t('Today')}</button>}
          {value && !required && <button type="button" className="linkish" onClick={() => { onChange(''); close(true); }}>{t('Clear')}</button>}
        </div>
      </div>
    </div>
  );
}

/** Date + time (30-minute steps). Value is "YYYY-MM-DDTHH:mm". */
export function DateTimeField({ label, value, onChange, min, error }: { label: ReactNode; value: string; onChange: (v: string) => void; min?: string; error?: string | null }) {
  const t = useT();
  const locale = useLocale();
  const [d = '', tm = '18:00'] = value.split('T');
  const times = useMemo(() => Array.from({ length: 48 }, (_, i) => { const hh = pad(Math.floor(i / 2)), mm = i % 2 ? '30' : '00'; return [`${hh}:${mm}`, new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1, +hh, +mm)))] as const; }), [locale]);
  return (
    <fieldset className="dt-field">
      <legend className="flabel">{label}</legend>
      <div className="row g8 wrap">
        <DatePicker label={<span className="sr">{t('Date')}</span>} value={d} min={min} onChange={v => onChange(v ? `${v}T${tm}` : '')} className="grow" error={error} />
        <Select label={t('Time')} srLabel value={tm} options={times} onValue={v => onChange(`${d}T${v}`)} className="dt-time" searchable />
      </div>
    </fieldset>
  );
}

/* ---------------- Colour field (presets + validated hex) ---------------- */
export const PRESET_COLOURS = ['#3CCB91', '#2DD4BF', '#5AA9F5', '#9CC3F5', '#A78BFA', '#E879F9', '#F2667A', '#F07878', '#FB923C', '#F5B544', '#FACC15', '#B5BAC5'];
export function ColorField({ label, value, onChange, hint }: { label: ReactNode; value: string; onChange: (hex: string) => void; hint?: ReactNode }) {
  const t = useT();
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const valid = /^#[0-9a-fA-F]{6}$/.test(text);
  return (
    <fieldset className="color-field">
      <legend className="flabel">{label}</legend>
      <div className="row g8 wrap">
        <div className="swatches" role="radiogroup" aria-label={typeof label === 'string' ? label : t('Colour')}>
          {PRESET_COLOURS.map(c => (
            <button key={c} type="button" role="radio" aria-checked={value.toLowerCase() === c.toLowerCase()} aria-label={c} className={`swatch ${value.toLowerCase() === c.toLowerCase() ? 'is-on' : ''}`} style={{ background: c }} onClick={() => onChange(c)} />
          ))}
        </div>
        <div className={`fbox hex-box ${valid ? '' : 'is-err'}`}>
          <span className="swatch sm" style={{ background: valid ? text : 'transparent' }} aria-hidden="true" />
          <label className="sr" htmlFor={id}>{t('Hex colour')}</label>
          <input id={id} value={text} maxLength={7} dir="ltr" spellCheck={false} aria-invalid={!valid || undefined} aria-describedby={`${id}-m`}
            onChange={e => { const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value; setText(v); if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase()); }} />
        </div>
      </div>
      <span id={`${id}-m`} className={valid ? 'fhint' : 'ferr'}>{valid ? hint : t('Use a 6-digit hex colour, like #3CCB91.')}</span>
    </fieldset>
  );
}
