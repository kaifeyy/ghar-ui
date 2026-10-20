import { useEffect, useState } from 'react';
import { User, MessageSquare, Phone, Video, Gift, Copy, Flag, Pencil, CheckCheck, Hash, Settings, UserPlus, Ban, BellOff, Bell } from 'lucide-react';
import { useApp, get } from '@/state/store';
import { go, openModal, toast } from '@/state/actions/ui';
import { dmWith, sendRequest, block } from '@/state/actions/social';
import { startCall } from '@/state/actions/calls';
import { markRead } from '@/state/actions/messages';
import { canManage } from '@/state/selectors';
import { toggleChannelMute } from '@/state/actions/community';
import { useT } from '@/i18n';
import { Menu, type MenuItem } from '@/ui/Overlay';
import { ME } from '@/fixtures/users';

type Ctx = { kind: 'user' | 'conversation' | 'channel'; id: string; point: { x: number; y: number }; anchor: HTMLElement };

/** Editable fields and text selections keep the browser's own menu. */
function keepNative(e: Event): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return true;
  if (el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-native-menu]')) return true;
  const sel = getSelection();
  return !!sel && !sel.isCollapsed && sel.toString().trim().length > 0;
}

/**
 * Right-click (and Shift+F10 / Menu key) menus for users, conversations and channels.
 * Elements opt in with data-ctx="user|conversation|channel" and data-id. Message rows handle their own menu.
 */
export function ContextMenuHost() {
  const t = useT();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const authed = useApp(s => s.authed);

  useEffect(() => {
    if (!authed) return;
    const find = (target: EventTarget | null) => (target as HTMLElement | null)?.closest?.<HTMLElement>('[data-ctx]') ?? null;
    const open = (el: HTMLElement, point: { x: number; y: number }) => {
      const kind = el.dataset.ctx as Ctx['kind'];
      const id = el.dataset.id;
      if (!id || !['user', 'conversation', 'channel'].includes(kind)) return false;
      const focusable = el.closest<HTMLElement>('button, a, [tabindex]') ?? el;
      setCtx({ kind, id, point, anchor: focusable });
      return true;
    };
    const onCtx = (e: MouseEvent) => {
      if (e.defaultPrevented || keepNative(e)) return;
      const el = find(e.target);
      if (el && open(el, { x: e.clientX, y: e.clientY })) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu')) return;
      if (keepNative(e)) return;
      const el = find(document.activeElement);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (open(el, { x: r.left + 8, y: r.bottom })) e.preventDefault();
    };
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('contextmenu', onCtx); document.removeEventListener('keydown', onKey); };
  }, [authed]);

  if (!ctx) return null;
  const s = get();
  let items: (MenuItem | 'sep')[] = [];
  let label = '';

  if (ctx.kind === 'user') {
    const u = s.users[ctx.id];
    if (!u) return null;
    label = t('Actions for {name}', { name: u.name });
    const me = ctx.id === ME;
    const isFriend = s.friends.includes(ctx.id);
    const blocked = s.blocked.includes(ctx.id) || !!s.suspensions[ctx.id];
    items = me ? [
      { id: 'profile', label: t('View profile'), icon: <User size={16} />, onSelect: () => go({ name: 'profile', userId: ME }) },
      { id: 'edit', label: t('Edit profile'), icon: <Pencil size={16} />, onSelect: () => go({ name: 'settings', section: 'profile' }) },
      { id: 'copy', label: t('Copy username'), icon: <Copy size={16} />, onSelect: () => copy(`@${u.handle}`) },
    ] : [
      { id: 'profile', label: t('View profile'), icon: <User size={16} />, onSelect: () => go({ name: 'profile', userId: ctx.id }) },
      { id: 'dm', label: t('Message'), icon: <MessageSquare size={16} />, disabled: blocked || u.bot, onSelect: () => go({ name: 'dm', convId: dmWith(ctx.id) }) },
      { id: 'call', label: t('Voice call'), icon: <Phone size={16} />, disabled: blocked || u.bot, onSelect: () => { const c = dmWith(ctx.id); go({ name: 'dm', convId: c }); startCall(c); } },
      { id: 'video', label: t('Video call'), icon: <Video size={16} />, disabled: blocked || u.bot, onSelect: () => { const c = dmWith(ctx.id); go({ name: 'dm', convId: c }); startCall(c, true); } },
      'sep',
      ...(!u.bot ? [{ id: 'gift', label: t('Send gift'), icon: <Gift size={16} />, onSelect: () => openModal({ kind: 'gift', to: ctx.id }) }] : []),
      ...(!isFriend && !u.bot && !blocked ? [{ id: 'add', label: t('Add friend'), icon: <UserPlus size={16} />, onSelect: () => { sendRequest(u.handle); } }] : []),
      { id: 'copy', label: t('Copy username'), icon: <Copy size={16} />, onSelect: () => copy(`@${u.handle}`) },
      'sep',
      { id: 'report', label: t('Report'), icon: <Flag size={16} />, onSelect: () => openModal({ kind: 'report', target: { kind: 'user', userId: ctx.id } }) },
      ...(!blocked ? [{ id: 'block', label: t('Block'), icon: <Ban size={16} />, danger: true, onSelect: () => block(ctx.id) }] : []),
    ];
  } else if (ctx.kind === 'conversation') {
    const c = s.conversations[ctx.id];
    if (!c) return null;
    const other = c.kind === 'dm' ? c.members[0] : undefined;
    label = t('Conversation actions');
    items = [
      { id: 'open', label: t('Open'), icon: <MessageSquare size={16} />, onSelect: () => go({ name: 'dm', convId: ctx.id }) },
      { id: 'call', label: t('Voice call'), icon: <Phone size={16} />, onSelect: () => { go({ name: 'dm', convId: ctx.id }); startCall(ctx.id); } },
      { id: 'video', label: t('Video call'), icon: <Video size={16} />, onSelect: () => { go({ name: 'dm', convId: ctx.id }); startCall(ctx.id, true); } },
      ...(other ? [{ id: 'profile', label: t('View profile'), icon: <User size={16} />, onSelect: () => go({ name: 'profile', userId: other }) }] : [{ id: 'edit', label: t('Edit group'), icon: <Pencil size={16} />, onSelect: () => openModal({ kind: 'groupDm', convId: ctx.id }) }]),
      'sep',
      { id: 'read', label: t('Mark as read'), icon: <CheckCheck size={16} />, onSelect: () => { markRead(ctx.id); toast('Marked as read'); } },
    ];
  } else {
    const ch = s.channels[ctx.id];
    if (!ch) return null;
    const muted = !!s.prefs.mutedChannels[ctx.id];
    label = t('Channel actions');
    items = [
      { id: 'open', label: t('Open'), icon: <Hash size={16} />, onSelect: () => go({ name: 'channel', serverId: ch.serverId, channelId: ch.id }) },
      { id: 'read', label: t('Mark as read'), icon: <CheckCheck size={16} />, onSelect: () => { markRead(ch.id); toast('Marked as read'); } },
      { id: 'mute', label: muted ? t('Unmute channel') : t('Mute channel'), icon: muted ? <Bell size={16} /> : <BellOff size={16} />, onSelect: () => toggleChannelMute(ch.id) },
      { id: 'copy', label: t('Copy channel name'), icon: <Copy size={16} />, onSelect: () => copy(`#${ch.name}`) },
      ...(canManage(s, ch.serverId, 'manageChannels') ? ['sep' as const, { id: 'edit', label: t('Edit channel'), icon: <Settings size={16} />, onSelect: () => openModal({ kind: 'editChannel', channelId: ch.id }) }] : []),
    ];
  }
  return <Menu items={items} label={label} anchor={ctx.anchor} point={ctx.point} onClose={() => setCtx(null)} />;
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => toast('Couldn’t copy. Select the text instead.', { tone: 'warn' }));
}
