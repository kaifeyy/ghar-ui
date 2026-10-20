import type { Draft } from 'immer';
import { update, get } from '../store';
import type { AppState } from '../types';
import type { Attachment, Message } from '@/types/models';
import { uid } from '@/domain/rng';
import { evaluate } from '@/domain/automod';
import { capActivity, DEFAULT_POLICY } from '@/domain/popularity';
import { karachiDay } from '@/domain/time';
import { ME } from '@/fixtures/users';
import { toast, ask } from './ui';
import { msg } from '@/i18n';

export type MsgScope = 'channel' | 'dm' | 'thread';
export interface MsgKey { scope: MsgScope; id: string }
export const keyStr = (k: MsgKey) => `${k.scope}:${k.id}`;
export const parseKey = (s: string): MsgKey => { const i = s.indexOf(':'); return { scope: s.slice(0, i) as MsgScope, id: s.slice(i + 1) }; };

export function listFor(s: AppState | Draft<AppState>, k: MsgKey): Message[] | undefined {
  if (k.scope === 'channel') return s.messages[k.id];
  if (k.scope === 'dm') return s.conversations[k.id]?.messages;
  return s.threads[k.id]?.messages;
}
function ensureList(s: Draft<AppState>, k: MsgKey): Message[] {
  if (k.scope === 'channel') return (s.messages[k.id] ??= []);
  if (k.scope === 'dm') return s.conversations[k.id]!.messages;
  return s.threads[k.id]!.messages;
}

export const MAX_LEN = 2000;
/** Crisis keywords (any language sample) show a support card; nothing is reported automatically. */
const CRISIS = /(hurt myself|kill myself|end it all|suicide|khud ko khatam|mar jana chahta|mar jana chahti)/i;

/** Send: online → "sending" then "sent" (or "failed"); offline → "queued" and flushed on reconnect. */
export function send(k: MsgKey, text: string, attachments: Attachment[] = []) {
  const s = get();
  const body = text.trim();
  if (!body && !attachments.length) return false;
  if (body.length > MAX_LEN) { toast('Message is too long. Shorten it to send.', { tone: 'warn' }); return false; }
  const channel = k.scope === 'channel' ? s.channels[k.id] : undefined;
  if (channel) {
    const sv = s.servers[channel.serverId]!;
    const mem = sv.memberList.find(m => m.userId === ME);
    if (mem?.timeoutUntil && mem.timeoutUntil > Date.now()) { toast('You’re timed out in this community.', { tone: 'warn' }); return false; }
    // auto-moderation runs before the message is posted (local rules demo; off for encrypted communities)
    if (!sv.e2ee) {
      const recent = (s.messages[k.id] ?? []).filter(m => m.author === ME).slice(-3).map(m => m.text).reverse();
      const v = evaluate(body, s.portal[sv.id]!.automod, recent);
      if (v.length && !(sv.owner === ME)) {
        toast('Auto-moderation blocked this message: {rule}.', { tone: 'error', vars: { rule: v[0]!.rule } });
        return false;
      }
    }
  }
  const offline = s.net !== 'online';
  const m: Message = { id: uid('m'), author: ME, text: body, at: Date.now(), attachments, reactions: {}, delivery: offline ? 'queued' : 'sending' };
  const reply = s.replyTo[keyStr(k)];
  if (reply) m.replyTo = reply;
  update(d => {
    ensureList(d, k).push(m);
    d.replyTo[keyStr(k)] = undefined;
    d.drafts[keyStr(k)] = '';
    d.readAt[k.id] = Date.now();
    if (k.scope === 'dm') d.conversations[k.id]!.lastReadAt = Date.now();
    if (k.scope === 'thread') d.threads[k.id]!.lastReadAt = Date.now();
  });
  if (!offline) deliver(k, m.id);
  if (channel && (channel.widget === 'mood' || channel.widget === 'helplines') && CRISIS.test(body)) update(d => { d.supportCard[channel.id] = true; });
  return true;
}

function deliver(k: MsgKey, id: string) {
  setTimeout(() => {
    const failed = get().net !== 'online';
    update(d => {
      const mm = ensureList(d, k).find(x => x.id === id);
      if (mm) mm.delivery = failed ? 'failed' : 'sent';
      if (!failed && k.scope === 'channel') awardActivity(d, k.id);
    });
  }, 450);
}

/** Earned popularity for sending a server message, within the daily cap (sample policy). */
function awardActivity(d: Draft<AppState>, channelId: string) {
  const serverId = d.channels[channelId]?.serverId;
  if (!serverId) return;
  const pts = capActivity(d.popularity, ME, DEFAULT_POLICY.perSource.message, Date.now());
  if (pts > 0) d.popularity.push({ id: uid('pe'), recipient: ME, at: Date.now(), source: 'message', points: pts, paid: false, serverId });
  const day = karachiDay(Date.now());
  const rec = d.activity.find(a => a.userId === ME && a.serverId === serverId && a.day === day);
  if (rec) rec.messages += 1; else d.activity.push({ userId: ME, serverId, day, messages: 1, voiceMinutes: 0, studyMinutes: 0 });
}

export function retry(k: MsgKey, id: string) {
  if (get().net !== 'online') { toast('Still offline. It will send when you reconnect.', { tone: 'info' }); update(d => { const m = ensureList(d, k).find(x => x.id === id); if (m) m.delivery = 'queued'; }); return; }
  update(d => { const m = ensureList(d, k).find(x => x.id === id); if (m) m.delivery = 'sending'; });
  deliver(k, id);
}
export function discardFailed(k: MsgKey, id: string) { update(d => { const l = ensureList(d, k); const i = l.findIndex(x => x.id === id); if (i >= 0) l.splice(i, 1); }); }

export function flushQueue() {
  const s = get();
  const keys: MsgKey[] = [
    ...Object.keys(s.messages).map(id => ({ scope: 'channel' as const, id })),
    ...Object.keys(s.conversations).map(id => ({ scope: 'dm' as const, id })),
    ...Object.keys(s.threads).map(id => ({ scope: 'thread' as const, id })),
  ];
  let n = 0;
  for (const k of keys) for (const m of listFor(s, k) ?? []) if (m.delivery === 'queued') { n++; update(d => { const x = ensureList(d, k).find(y => y.id === m.id); if (x) x.delivery = 'sending'; }); deliver(k, m.id); }
  if (n) toast('Back online. Sending {n} queued messages.', { tone: 'info', vars: { n } });
}

export function edit(k: MsgKey, id: string, text: string) {
  const body = text.trim();
  if (!body) return false;
  update(d => { const m = ensureList(d, k).find(x => x.id === id && x.author === ME); if (m) { m.text = body; m.editedAt = Date.now(); } });
  toast('Message edited');
  return true;
}

/** MSG-08: in servers your own message is removed for everyone; in DMs it is removed only from your view. */
export function remove(k: MsgKey, id: string) {
  const isDm = k.scope === 'dm';
  ask({
    title: msg('Delete message?'),
    body: isDm ? msg('This removes it from your view only. The other person keeps their copy.') : msg('This removes it for everyone in the channel.'),
    confirmLabel: msg('Delete'), tone: 'danger',
    onConfirm: () => {
      if (isDm) {
        update(d => { d.conversations[k.id]!.hiddenForMe.push(id); });
        toast('Removed from your view', { undo: () => update(d => { const c = d.conversations[k.id]!; c.hiddenForMe = c.hiddenForMe.filter(x => x !== id); }) });
      } else {
        let removed: Message | undefined; let index = -1;
        update(d => { const l = ensureList(d, k); index = l.findIndex(x => x.id === id); if (index >= 0) removed = { ...l.splice(index, 1)[0]! }; });
        toast('Message deleted', { undo: () => update(d => { if (removed) ensureList(d, k).splice(Math.max(0, index), 0, removed); }) });
      }
    },
  });
}

export function react(k: MsgKey, id: string, emoji: string) {
  update(d => {
    const m = ensureList(d, k).find(x => x.id === id);
    if (!m) return;
    const list = (m.reactions[emoji] ??= []);
    const i = list.indexOf(ME);
    if (i >= 0) list.splice(i, 1); else list.push(ME);
    if (!list.length) delete m.reactions[emoji];
  });
}
export function togglePin(k: MsgKey, id: string) {
  let pinned = false;
  update(d => { const m = ensureList(d, k).find(x => x.id === id); if (m) { m.pinned = !m.pinned; pinned = !!m.pinned; } });
  toast(pinned ? 'Message pinned' : 'Message unpinned');
}
export function setReply(k: MsgKey, id: string | undefined) { update(d => { d.replyTo[keyStr(k)] = id; }); }

/** Start (or open) a thread on a channel message; threads keep their own unread state. */
export function openThread(channelId: string, messageId: string): string {
  const s = get();
  const msgObj = s.messages[channelId]?.find(m => m.id === messageId);
  let tid = msgObj?.threadId;
  if (!tid) {
    tid = uid('th');
    const id = tid;
    update(d => {
      d.threads[id] = { id, channelId, parentId: messageId, messages: [], lastReadAt: Date.now() };
      const m = d.messages[channelId]?.find(x => x.id === messageId);
      if (m) m.threadId = id;
    });
  }
  const id = tid;
  update(d => { d.threadKey = id; d.rightPanel = 'thread'; d.threads[id]!.lastReadAt = Date.now(); });
  return id;
}

export function markRead(id: string) { update(d => { d.readAt[id] = Date.now(); const c = d.conversations[id]; if (c) c.lastReadAt = Date.now(); }); }

/** Simulated reply so conversations feel alive (clearly fictional). */
export function fakeReply(convId: string) {
  const c = get().conversations[convId];
  if (!c || c.kind !== 'dm') return;
  const from = c.members[0]!;
  setTimeout(() => {
    if (get().net !== 'online') return;
    update(d => { d.conversations[convId]?.messages.push({ id: uid('m'), author: from, text: ['Haha theek hai', 'Sure, 10 baje?', 'Okay 👍', 'Shukriya!'][Math.floor(Math.random() * 4)]!, at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' }); });
  }, 2200);
}

export function postForum(channelId: string, title: string, body: string, tags: string[]) {
  const id = uid('p');
  update(d => { d.forum.unshift({ id, channelId, title: title.trim(), body: body.trim(), tags, author: ME, at: Date.now(), replies: [] }); });
  toast('Post published');
  return id;
}
export function replyForum(postId: string, text: string) {
  update(d => { const p = d.forum.find(x => x.id === postId); p?.replies.push({ id: uid('m'), author: ME, text: text.trim(), at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' }); });
}
