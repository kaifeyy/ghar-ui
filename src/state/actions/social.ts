import { update, get } from '../store';
import type { RelationshipType } from '@/types/models';
import { uid } from '@/domain/rng';
import { relationshipAllowed } from '@/domain/age';
import { normalize } from '@/domain/username';
import { platform, type SocialLink, type SocialPlatform } from '@/domain/social';
import { toast, ask } from './ui';
import { msg } from '@/i18n';

const name = (id: string) => get().users[id]?.name ?? id;

/* ---------------- inbox ---------------- */
export function markInboxRead(id: string) { update(s => { const i = s.inbox.find(x => x.id === id); if (i) i.unread = false; }); }
export function markAllInboxRead() {
  const prev = get().inbox.filter(i => i.unread).map(i => i.id);
  if (!prev.length) return;
  update(s => { s.inbox.forEach(i => { i.unread = false; }); });
  toast('All caught up', { undo: () => update(s => { s.inbox.forEach(i => { if (prev.includes(i.id)) i.unread = true; }); }) });
}
export function dismissInbox(id: string) {
  const s0 = get();
  const idx = s0.inbox.findIndex(i => i.id === id);
  const item = s0.inbox[idx];
  if (!item) return;
  update(s => { s.inbox.splice(idx, 1); });
  toast('Removed from Inbox', { undo: () => update(s => { s.inbox.splice(idx, 0, item); }) });
}

/* ---------------- friends (SOC-02) ---------------- */
export function acceptRequest(userId: string) {
  update(s => { s.requests = s.requests.filter(r => r.userId !== userId); if (!s.friends.includes(userId)) s.friends.push(userId); s.inbox.forEach(i => { if (i.kind === 'friend-request' && i.from === userId) i.unread = false; }); });
  toast('You and {name} are now friends', { vars: { name: name(userId) } });
}
export function declineRequest(userId: string) {
  const r = get().requests.find(x => x.userId === userId);
  update(s => { s.requests = s.requests.filter(x => x.userId !== userId); s.inbox = s.inbox.filter(i => !(i.kind === 'friend-request' && i.from === userId)); });
  toast('Request declined', { undo: () => update(s => { if (r) s.requests.push(r); }) });
}
export function cancelRequest(userId: string) { update(s => { s.requests = s.requests.filter(x => x.userId !== userId); }); toast('Request cancelled'); }

export type AddFriendResult = { ok: true } | { ok: false; error: 'empty' | 'self' | 'unknown' | 'already' | 'pending' | 'blocked'; suggestion?: string };
export function sendRequest(raw: string): AddFriendResult {
  const s = get();
  const handle = normalize(raw);
  if (!handle) return { ok: false, error: 'empty' };
  if (handle === s.users.me!.handle) return { ok: false, error: 'self' };
  const u = Object.values(s.users).find(x => x.handle === handle && !x.bot);
  if (!u) {
    const near = Object.values(s.users).find(x => !x.bot && x.id !== 'me' && !s.blocked.includes(x.id) && (x.handle.startsWith(handle.slice(0, 3)) || handle.startsWith(x.handle.slice(0, 3))));
    return { ok: false, error: 'unknown', ...(near ? { suggestion: near.handle } : {}) };
  }
  if (s.blocked.includes(u.id)) return { ok: false, error: 'blocked' };
  if (s.friends.includes(u.id)) return { ok: false, error: 'already' };
  if (s.requests.some(r => r.userId === u.id)) return { ok: false, error: 'pending' };
  update(d => { d.requests.push({ userId: u.id, direction: 'out', at: Date.now() }); });
  toast('Friend request sent to {name}', { vars: { name: u.name } });
  return { ok: true };
}
export function removeFriend(userId: string) {
  ask({ title: msg('Remove {name} as a friend?'), vars: { name: name(userId) }, body: msg('They won’t be notified. You can send a new request later.'), confirmLabel: msg('Remove friend'), tone: 'danger', onConfirm: () => {
    update(s => { s.friends = s.friends.filter(f => f !== userId); s.closeFriends = s.closeFriends.filter(f => f !== userId); });
    toast('Removed {name}', { vars: { name: name(userId) }, undo: () => update(s => { s.friends.push(userId); }) });
  } });
}
export function block(userId: string) {
  ask({ title: msg('Block {name}?'), vars: { name: name(userId) }, body: msg('They can’t message you, see your stories or find you in search. They aren’t told.'), confirmLabel: msg('Block'), tone: 'danger', onConfirm: () => {
    update(s => { s.blocked.push(userId); s.friends = s.friends.filter(f => f !== userId); s.requests = s.requests.filter(r => r.userId !== userId); s.closeFriends = s.closeFriends.filter(f => f !== userId); });
    toast('Blocked {name}', { vars: { name: name(userId) } });
  } });
}
export function unblock(userId: string) { update(s => { s.blocked = s.blocked.filter(b => b !== userId); }); toast('Unblocked {name}', { vars: { name: name(userId) } }); }
export function toggleCloseFriend(userId: string) { update(s => { s.closeFriends = s.closeFriends.includes(userId) ? s.closeFriends.filter(x => x !== userId) : [...s.closeFriends, userId]; }); }

/** Open or create a 1:1 conversation. */
export function dmWith(userId: string): string {
  const s = get();
  const existing = Object.values(s.conversations).find(c => c.kind === 'dm' && c.members[0] === userId);
  if (existing) return existing.id;
  const id = 'dm-' + userId;
  update(d => { d.conversations[id] = { id, kind: 'dm', members: [userId], e2ee: true, messages: [], hiddenForMe: [], lastReadAt: Date.now() }; });
  return id;
}
export function createGroup(name: string, members: string[]): string {
  const id = uid('g');
  update(d => { d.conversations[id] = { id, kind: 'group', name: name.trim() || members.map(m => d.users[m]?.name.split(' ')[0]).join(', '), members: ['me', ...members], e2ee: true, messages: [{ id: uid('m'), author: 'system', system: true, text: 'Group created.', at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' }], hiddenForMe: [], lastReadAt: Date.now() }; });
  toast('Group created');
  return id;
}
export function updateGroup(id: string, name: string, members: string[]) {
  update(d => { const c = d.conversations[id]; if (!c) return; c.name = name.trim() || c.name; c.members = ['me', ...members.filter(m => m !== 'me')]; c.messages.push({ id: uid('m'), author: 'system', system: true, text: 'Group updated.', at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' }); });
  toast('Group updated');
}
export function leaveGroup(id: string) {
  ask({ title: msg('Leave this group?'), body: msg('You won’t get new messages unless someone adds you back.'), confirmLabel: msg('Leave group'), tone: 'danger', onConfirm: () => {
    update(d => { delete d.conversations[id]; d.route = { name: 'inbox' }; });
    toast('You left the group');
  } });
}

/* ---------------- relationships (SOC-09) ---------------- */
export type RelResult = { ok: true } | { ok: false; error: 'minor' | 'exists' | 'none' };
export function requestRelationship(withId: string, type: RelationshipType): RelResult {
  const s = get();
  if (!withId) return { ok: false, error: 'none' };
  if (!relationshipAllowed(s.ageGroup, type)) return { ok: false, error: 'minor' };
  if (s.relationships.some(r => r.with === withId && r.state !== 'declined')) return { ok: false, error: 'exists' };
  update(d => { d.relationships.push({ id: uid('rel'), type, with: withId, state: 'pending-out', visible: true, createdAt: Date.now() }); });
  toast('Request sent. It shows on profiles only after {name} accepts.', { vars: { name: name(withId) } });
  return { ok: true };
}
export function respondRelationship(id: string, accept: boolean) {
  const r = get().relationships.find(x => x.id === id);
  if (!r) return;
  if (accept && !relationshipAllowed(get().ageGroup, r.type)) { toast('Partner relationships aren’t available for under-18 accounts.', { tone: 'warn' }); return; }
  update(d => { const x = d.relationships.find(y => y.id === id); if (x) x.state = accept ? 'accepted' : 'declined'; d.inbox.forEach(i => { if (i.kind === 'relationship' && i.from === r.with) i.unread = false; }); });
  toast(accept ? msg('Relationship added to your profile') : msg('Request declined'));
}
/** Demo only: the other person answers your request. */
export function simulateTheirAnswer(id: string, accept: boolean) {
  update(d => { const x = d.relationships.find(y => y.id === id); if (x && x.state === 'pending-out') x.state = accept ? 'accepted' : 'declined'; });
}
export function removeRelationship(id: string) {
  const r = get().relationships.find(x => x.id === id);
  if (!r) return;
  ask({ title: msg('Remove this relationship?'), body: msg('It disappears from both profiles. {name} isn’t notified.'), vars: { name: name(r.with) }, confirmLabel: msg('Remove'), tone: 'danger', onConfirm: () => {
    update(d => { d.relationships = d.relationships.filter(x => x.id !== id); });
    toast('Relationship removed', { undo: () => update(d => { d.relationships.push(r); }) });
  } });
}
export function setRelationshipVisible(id: string, visible: boolean) { update(d => { const x = d.relationships.find(y => y.id === id); if (x) x.visible = visible; }); }

/* ---------------- user logs (SOC-08) ---------------- */
export function resendFromLog(logId: string) {
  const l = get().userLogs.find(x => x.id === logId);
  if (!l) return;
  const u = get().users[l.ref];
  if (!u) return;
  const r = sendRequest(u.handle);
  if (r.ok) update(d => { const x = d.userLogs.find(y => y.id === logId); if (x) x.resolved = true; });
  else if (r.error === 'blocked') toast('You blocked this person. Unblock them first.', { tone: 'warn' });
}

/* ---------------- social profile links (demo: no OAuth, handles shown as unverified) ---------------- */
let linking = false;
/** Simulates the connect step. Resolves after a short wait; nothing leaves the browser. */
export function linkSocial(owner: string, link: Omit<SocialLink, 'linkedAt'>): Promise<void> {
  if (linking) return Promise.resolve();
  linking = true;
  return new Promise(res => setTimeout(() => {
    linking = false;
    update(d => {
      const list = (d.socialLinks[owner] ??= []);
      const i = list.findIndex(x => x.platform === link.platform);
      const next = { ...link, linkedAt: Date.now() };
      if (i >= 0) list[i] = next; else list.push(next);
    });
    toast('{platform} linked (demo, not verified)', { vars: { platform: platform(link.platform).name } });
    res();
  }, 900));
}
export function unlinkSocial(owner: string, p: SocialPlatform) {
  ask({ title: msg('Disconnect {platform}?'), vars: { platform: platform(p).name }, body: msg('The link is removed from this profile. You can connect it again any time.'), confirmLabel: msg('Disconnect'), tone: 'danger', onConfirm: () => {
    update(d => { d.socialLinks[owner] = (d.socialLinks[owner] ?? []).filter(x => x.platform !== p); });
    toast('{platform} disconnected', { vars: { platform: platform(p).name } });
  } });
}
export function setSocialVisible(owner: string, p: SocialPlatform, visible: boolean) {
  update(d => { const x = d.socialLinks[owner]?.find(y => y.platform === p); if (x) x.showOnProfile = visible; });
}
