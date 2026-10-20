import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Undo2, CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { useApp } from '@/state/store';
import { closeConfirm, dismissToast } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { Button, IconButton } from './Button';
import { TextField } from './Form';

/* ---------------- Modal dialog (native <dialog>: focus containment, inert page, Escape) ---------------- */
export interface DialogProps {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** called on Enter-submit when the dialog body is a form */
  onSubmit?: () => void;
  busy?: boolean;
  className?: string;
  hideClose?: boolean;
  role?: 'dialog' | 'alertdialog';
}

export function Dialog({ title, description, onClose, children, footer, size = 'md', onSubmit, busy, className = '', hideClose, role = 'dialog' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const t = useT();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    opener.current = document.activeElement;
    if (!d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } }
    const af = d.querySelector<HTMLElement>('[autofocus],[data-autofocus]');
    af?.focus();
    const onCancel = (e: Event) => { e.preventDefault(); if (!busyRef.current) onCloseRef.current(); };
    d.addEventListener('cancel', onCancel);
    return () => {
      d.removeEventListener('cancel', onCancel);
      if (d.open) d.close();
      const o = opener.current as HTMLElement | null;
      if (o && document.contains(o)) requestAnimationFrame(() => o.focus({ preventScroll: true }));
    };
  }, []);

  const titleId = useRef(`dlg-${Math.random().toString(36).slice(2)}`).current;
  const body = (
    <>
      <header className="dlg-head">
        <div className="grow">
          <h2 id={titleId} className="dlg-title">{title}</h2>
          {description && <p className="dlg-desc" id={`${titleId}-d`}>{description}</p>}
        </div>
        {!hideClose && <IconButton icon={X} label={t('Close')} onClick={() => !busy && onClose()} size="sm" disabled={busy} />}
      </header>
      <div className="dlg-body">{children}</div>
      {footer && <footer className="dlg-foot">{footer}</footer>}
    </>
  );
  return (
    <dialog ref={ref} className={`dlg dlg-${size} ${className}`} aria-labelledby={titleId} aria-describedby={description ? `${titleId}-d` : undefined} role={role} aria-modal="true"
      onClick={e => { if (e.target === ref.current && !busy) onClose(); }}>
      {onSubmit ? <form method="dialog" className="dlg-in" noValidate onSubmit={e => { e.preventDefault(); if (!busy) onSubmit(); }}>{body}</form> : <div className="dlg-in">{body}</div>}
    </dialog>
  );
}

/* ---------------- Confirm (destructive actions) ---------------- */
export function ConfirmHost() {
  const c = useApp(s => s.confirm);
  const t = useT();
  const [typed, setTyped] = useState('');
  useEffect(() => setTyped(''), [c]);
  if (!c) return null;
  const ok = !c.typed || typed.trim() === c.typed;
  return (
    <Dialog title={t(c.title, c.vars)} onClose={closeConfirm} size="sm" role="alertdialog" onSubmit={() => { if (ok) { closeConfirm(); c.onConfirm(); } }}
      footer={<><Button onClick={closeConfirm} data-autofocus>{t('Cancel')}</Button><Button type="submit" variant={c.tone === 'danger' ? 'danger' : 'primary'} disabled={!ok}>{t(c.confirmLabel, c.vars)}</Button></>}>
      <p className="muted">{t(c.body, c.vars)}</p>
      {c.typed && <TextField className="mt16" label={t('Type {word} to confirm', { word: c.typed })} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" />}
    </Dialog>
  );
}

/* ---------------- Toasts ---------------- */
export function ToastHost() {
  const toasts = useApp(s => s.toasts);
  const t = useT();
  const icon = { ok: CheckCircle2, info: Info, warn: AlertTriangle, error: AlertCircle } as const;
  return (
    <div className="toasts" role="region" aria-label={t('Notifications')}>
      <div aria-live="polite" aria-atomic="false" className="toasts-in">
        {toasts.map(x => {
          const I = icon[x.tone];
          return (
            <div key={x.id} className={`toast toast-${x.tone}`}>
              <I size={18} aria-hidden="true" />
              <span className="grow">{t(x.text, x.vars)}</span>
              {x.undo && <Button size="sm" variant="ghost" icon={Undo2} onClick={() => { x.undo?.(); dismissToast(x.id); }}>{t('Undo')}</Button>}
              <IconButton icon={X} size="sm" label={t('Dismiss')} onClick={() => dismissToast(x.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Tooltip host: data-tip on hover and keyboard focus ---------------- */
export function TooltipHost() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  useEffect(() => {
    let cur: Element | null = null;
    const show = (el: Element) => {
      const text = el.getAttribute('data-tip');
      if (!text) return;
      cur = el;
      const r = el.getBoundingClientRect();
      const below = r.top < 56;
      setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
    };
    const hide = () => { cur = null; setTip(null); };
    const over = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; const el = (e.target as Element).closest?.('[data-tip]'); if (el) { if (el !== cur) show(el); } else if (cur) hide(); };
    const focus = (e: FocusEvent) => { const el = (e.target as Element).closest?.('[data-tip]'); if (el && (e.target as Element).matches(':focus-visible')) show(el); else hide(); };
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('pointerover', over);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', hide);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', hide);
    return () => {
      document.removeEventListener('pointerover', over); document.removeEventListener('focusin', focus); document.removeEventListener('focusout', hide);
      document.removeEventListener('scroll', hide, true); document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', hide);
    };
  }, []);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !tip) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, tip.x - w / 2)) + 'px';
    el.style.top = (tip.below ? tip.y : tip.y - h) + 'px';
  }, [tip]);
  if (!tip) return null;
  return createPortal(<div ref={ref} className="tooltip" role="tooltip">{tip.text}</div>, document.body);
}

/* ---------------- Anchored non-modal popover ---------------- */
export function usePopoverDismiss(open: boolean, onClose: () => void, panel: RefObject<HTMLElement | null>, trigger: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || trigger.current?.contains(t)) return;
      onClose();
    };
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { e.stopPropagation(); onClose(); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [open, onClose, panel, trigger]);
}

export interface MenuItem { id: string; label: string; icon?: ReactNode; danger?: boolean; disabled?: boolean; onSelect: () => void; hint?: ReactNode; checked?: boolean }

/** ARIA menu (only actions, never forms). Arrow keys / Home / End, Escape returns focus to the trigger. */
export function Menu({ items, label, onClose, anchor, align = 'end', point }: { items: (MenuItem | 'sep')[]; label: string; onClose: () => void; anchor: HTMLElement | null; align?: 'start' | 'end'; point?: { x: number; y: number } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const trig = useRef<HTMLElement | null>(anchor);
  trig.current = anchor;
  usePopoverDismiss(true, onClose, ref, trig);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || (!anchor && !point)) return;
    try { if (!el.matches(':popover-open')) el.showPopover(); } catch { /* fallback: fixed + z-index */ }
    const w = el.offsetWidth, h = el.offsetHeight;
    let x: number, y: number;
    if (point) {
      x = point.x; y = point.y;
      if (x + w > innerWidth - 8) x = point.x - w;
      if (y + h > innerHeight - 8) y = point.y - h;
    } else {
      const r = anchor!.getBoundingClientRect();
      const rtl = document.documentElement.dir === 'rtl';
      const endAlign = (align === 'end') !== rtl;
      x = endAlign ? r.right - w : r.left;
      y = r.bottom + 4;
      if (y + h > innerHeight - 8) y = r.top - h - 4;
    }
    x = Math.max(8, Math.min(innerWidth - w - 8, x));
    y = Math.max(8, Math.min(innerHeight - h - 8, y));
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.querySelector<HTMLElement>('[role^=menuitem]:not([aria-disabled=true])')?.focus();
  }, [anchor, align, point]);
  const onKey = (e: KeyboardEvent) => {
    const list = [...(ref.current?.querySelectorAll<HTMLElement>('[role^=menuitem]:not([aria-disabled=true])') ?? [])];
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1]?.focus(); }
    else if (e.key === 'Tab') { onClose(); }
  };
  return createPortal(
    <div ref={ref} className="menu" role="menu" aria-label={label} onKeyDown={onKey} popover="manual">
      {items.map((it, i) => it === 'sep' ? <div key={'s' + i} role="separator" className="menu-sep" /> : (
        <button key={it.id} type="button" role={it.checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={it.checked} className={`menu-item ${it.danger ? 'is-danger' : ''}`} aria-disabled={it.disabled || undefined} tabIndex={-1}
          onClick={() => { if (it.disabled) return; onClose(); anchor?.focus(); it.onSelect(); }}>
          {it.icon}<span className="grow">{it.label}</span>{it.hint && <span className="meta">{it.hint}</span>}{it.checked && <Check size={16} aria-hidden="true" className="menu-check" />}
        </button>
      ))}
    </div>, document.body);
}

/** Small helper: trigger + menu state. */
export function useMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return { anchor, open: (el: HTMLElement) => setAnchor(el), close: () => setAnchor(null), isOpen: !!anchor };
}
