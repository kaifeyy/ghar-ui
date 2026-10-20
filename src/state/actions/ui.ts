import { update, get } from '../store';
import type { ConfirmState, ModalState, Route } from '../types';
import type { Key, Vars } from '@/i18n';

let toastId = 0;
export interface ToastOpts { tone?: 'ok' | 'info' | 'warn' | 'error'; undo?: () => void; vars?: Vars }
/** Toasts store a catalogue key and are translated at render time. Call only after the operation succeeded. */
export function toast(key: Key, opts: ToastOpts = {}) {
  const id = ++toastId;
  update(s => { s.toasts.push({ id, text: key, tone: opts.tone ?? 'ok', ...(opts.undo ? { undo: opts.undo } : {}), ...(opts.vars ? { vars: opts.vars } : {}) }); if (s.toasts.length > 4) s.toasts.shift(); });
  setTimeout(() => dismissToast(id), opts.undo ? 7000 : 4200);
}
export function dismissToast(id: number) { update(s => { s.toasts = s.toasts.filter(t => t.id !== id); }); }

export function openModal(m: ModalState) {
  update(s => { if (s.modal) s.modalStack.push(s.modal); s.modal = m; s.accountOpen = false; s.payment = { phase: 'idle' }; });
}
export function closeModal() {
  update(s => { s.modal = s.modalStack.pop() ?? null; s.payment = { phase: 'idle' }; });
}
export function replaceModal(m: ModalState | null) { update(s => { s.modal = m; s.payment = { phase: 'idle' }; }); }

export function ask(c: ConfirmState) { update(s => { s.confirm = c; }); }
export function closeConfirm() { update(s => { s.confirm = null; }); }

/* ---------- navigation ---------- */
const sameRoute = (a: Route, b: Route) => JSON.stringify(a) === JSON.stringify(b);
export function go(r: Route, opts: { replace?: boolean } = {}) {
  const cur = get().route;
  if (sameRoute(cur, r)) { update(s => { s.drawerOpen = false; }); return; }
  update(s => {
    if (!opts.replace) s.history.push(cur);
    if (s.history.length > 50) s.history.shift();
    s.route = r;
    s.drawerOpen = false;
    s.accountOpen = false;
    if (r.name !== 'channel' && r.name !== 'dm') { s.rightPanel = null; s.threadKey = null; }
    if (r.name === 'settings' && r.section) s.prefs.lastSettings = r.section;
  });
}
export function back() {
  const h = get().history;
  const prev = h[h.length - 1];
  if (!prev) return go({ name: 'inbox' }, { replace: true });
  update(s => { s.history.pop(); s.route = prev; s.drawerOpen = false; });
}
export const setDrawer = (open: boolean) => update(s => { s.drawerOpen = open; });
export const setAccount = (open: boolean) => update(s => { s.accountOpen = open; });
export const setRightPanel = (p: ReturnType<typeof get>['rightPanel']) => update(s => { s.rightPanel = s.rightPanel === p ? null : p; if (s.rightPanel !== 'thread') s.threadKey = null; });
export const setDraft = (key: string, v: string) => update(s => { s.drafts[key] = v; });
export const setDev = (open: boolean) => update(s => { s.devOpen = open; });
