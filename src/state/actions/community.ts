import type { Draft } from 'immer';
import { update, get } from '../store';
import type { AppState } from '../types';
import type { Channel, ChannelType, CommunityCategory, Permission, Role, Server, ChannelLock, ChannelIcon, CustomEmoji } from '@/types/models';
import { uid } from '@/domain/rng';
import { ME } from '@/fixtures/users';
import { TEMPLATES, standardRoles, type Template } from '@/fixtures/communities';
import { defaultPortal } from '@/fixtures/portal';
import { toast, ask, go } from './ui';
import { serverChannels, myTopPosition } from '../selectors';
import { msg } from '@/i18n';

export function audit(d: Draft<AppState>, serverId: string, action: string, target?: string) {
  d.audit.unshift({ id: uid('au'), serverId, actor: ME, action, ...(target ? { target } : {}), at: Date.now() });
}

/* ---------------- membership ---------------- */
export function markServerRead(serverId: string) {
  update(d => { for (const c of serverChannels(d as unknown as AppState, serverId)) d.readAt[c.id] = Date.now(); });
  toast('Marked as read');
}
export function toggleServerMute(serverId: string) {
  let muted = false;
  update(d => { muted = !d.prefs.mutedServers[serverId]; d.prefs.mutedServers[serverId] = muted; });
  toast(muted ? 'Community muted. Mentions still reach your Inbox.' : 'Community unmuted');
}
export function toggleChannelMute(channelId: string) {
  let muted = false;
  update(d => { muted = !d.prefs.mutedChannels[channelId]; d.prefs.mutedChannels[channelId] = muted; });
  toast(muted ? 'Channel muted' : 'Channel unmuted');
}
export function leaveServer(serverId: string) {
  const sv = get().servers[serverId];
  if (!sv) return;
  ask({ title: msg('Leave {name}?'), vars: { name: sv.name }, body: sv.kind === 'room' ? msg('You’ll need a new invite to rejoin this private Room.') : msg('You can rejoin from Discover or with an invite. Your roles may not be restored.'), confirmLabel: msg('Leave'), tone: 'danger', onConfirm: () => {
    update(d => {
      d.joined = d.joined.filter(id => id !== serverId);
      d.userLogs.unshift({ id: uid('l'), kind: 'left-server', ref: serverId, at: Date.now() });
      if (d.voice && d.channels[d.voice.channelId]?.serverId === serverId) d.voice = null;
    });
    go({ name: 'communities' }, { replace: true });
    toast('You left {name}', { vars: { name: sv.name }, undo: () => update(d => { if (!d.joined.includes(serverId)) d.joined.push(serverId); d.userLogs = d.userLogs.filter(l => !(l.kind === 'left-server' && l.ref === serverId && Date.now() - l.at < 60_000)); }) });
  } });
}
export function rejoin(serverId: string) {
  const s = get();
  if (s.servers[serverId]) {
    update(d => { if (!d.joined.includes(serverId)) d.joined.push(serverId); const l = d.userLogs.find(x => x.ref === serverId); if (l) l.resolved = true; });
    toast('Rejoined {name}', { vars: { name: s.servers[serverId]!.name } });
  } else joinDirectory(serverId);
}

/** Joining a directory entry materialises a small local community (fictional content). */
export function joinDirectory(id: string) {
  const s = get();
  const e = s.directory.find(x => x.id === id);
  if (!e) return;
  if (!s.servers[id]) {
    const { roles, roleCategories } = standardRoles(id);
    const chans: Channel[] = [
      { id: `${id}-general`, serverId: id, name: 'general', type: 'text', topic: e.description },
      { id: `${id}-intro`, serverId: id, name: 'introductions', type: 'text' },
      { id: `${id}-voice`, serverId: id, name: e.liveNow ?? 'Lounge', type: 'voice' },
    ];
    const sv: Server = { id, name: e.name, color: e.color, category: e.category, city: e.city, languages: [e.language], description: e.description, owner: 'bilal', kind: 'server', approved: true, members: e.members + 1, online: e.online, xp: 6000, bannerStyle: 'auto', categories: [{ id: `${id}-c1`, name: 'Text', channelIds: chans.slice(0, 2).map(c => c.id) }, { id: `${id}-c2`, name: 'Voice', channelIds: [chans[2]!.id] }], roleCategories, roles, memberList: [{ userId: ME, roleIds: [`${id}-lvl-1`], joinedAt: Date.now(), warnings: 0 }], emoji: [], stickers: [], effectsEnabled: true, whisperEnabled: true };
    update(d => {
      d.servers[id] = sv;
      for (const c of chans) d.channels[c.id] = c;
      d.messages[`${id}-general`] = [{ id: uid('m'), author: 'system', system: true, text: `Welcome to ${e.name}. Messages here are fictional sample content.`, at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' }];
      d.portal[id] = defaultPortal(id, `${id}-general`);
      d.readAt[`${id}-general`] = Date.now();
    });
  }
  update(d => { if (!d.joined.includes(id)) d.joined.push(id); });
  toast('You joined {name}', { vars: { name: e.name }, undo: () => update(d => { d.joined = d.joined.filter(x => x !== id); }) });
}

/* ---------------- creating communities ---------------- */
export function createFromTemplate(opts: { name: string; kind: 'room' | 'server'; templateId: Template['id']; category: CommunityCategory; e2ee: boolean }) {
  const tpl = TEMPLATES.find(x => x.id === opts.templateId) ?? TEMPLATES[0]!;
  const id = uid('sv');
  const { roles: base, roleCategories } = standardRoles(id, { interests: [] });
  const extra: Role[] = tpl.roles.map((n, i) => ({ id: `${id}-tpl-${i}`, name: n, color1: ['#5AA9F5', '#3CCB91', '#E5B454'][i % 3]!, categoryId: 'interests', position: 30 + i, permissions: ['sendMessages', 'speak'] }));
  const channels: Channel[] = [];
  const categories = tpl.categories.map((cat, ci) => {
    const ids = cat.channels.map((c, i) => {
      const cid = `${id}-c${ci}-${i}`;
      channels.push({ id: cid, serverId: id, name: c.name, type: c.type, ...(c.widget ? { widget: c.widget } : {}) });
      return cid;
    });
    return { id: `${id}-cat${ci}`, name: cat.name, channelIds: ids };
  });
  const sv: Server = {
    id, name: opts.name.trim(), color: ['#5AA9F5', '#3CCB91', '#E5B454', '#F2667A', '#A78BFA'][Math.floor(Math.random() * 5)]!, category: opts.category, city: get().users[ME]!.city,
    languages: ['English', 'Urdu'], description: tpl.description, owner: ME, kind: opts.kind, approved: false, e2ee: opts.kind === 'room' && opts.e2ee, members: 1, online: 1, xp: 0,
    bannerStyle: opts.templateId === 'study' ? 'study' : opts.templateId === 'startup' ? 'jobs' : 'auto', categories, roleCategories, roles: [...base, ...extra],
    memberList: [{ userId: ME, roleIds: [`${id}-owner`], joinedAt: Date.now(), warnings: 0 }], emoji: [], stickers: [], effectsEnabled: true, whisperEnabled: true,
  };
  const firstText = channels.find(c => c.type === 'text')?.id ?? channels[0]!.id;
  update(d => {
    d.servers[id] = sv;
    for (const c of channels) { d.channels[c.id] = c; d.readAt[c.id] = Date.now(); }
    d.messages[firstText] = [{ id: uid('m'), author: 'system', system: true, text: `You created ${sv.name} from the ${tpl.name} template.`, at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' }];
    const p = defaultPortal(id, firstText);
    if (opts.templateId === 'mental-health') { p.welcome.rulesGate = true; p.automod.words.push('kill myself', 'khud ko khatam'); p.automod.wordAction = 'alert'; }
    if (opts.templateId === 'startup') p.tickets.greeting = 'Tell us what kind of mentor you need.';
    d.portal[id] = p;
    d.joined.push(id);
    audit(d, id, 'Created community from template', tpl.name);
  });
  go({ name: 'channel', serverId: id, channelId: firstText });
  toast(opts.kind === 'room' ? msg('Room created. It stays unlisted and can’t take payments until approved as a server.') : msg('Community created'));
  return id;
}

/* ---------------- channels & categories (COM-03/04/05) ---------------- */
export function createChannel(serverId: string, categoryId: string, data: { name: string; type: ChannelType; topic?: string; icon?: ChannelIcon; lock?: ChannelLock }) {
  const id = uid('ch');
  const name = data.type === 'voice' || data.type === 'stage' ? data.name.trim() : data.name.trim().toLowerCase().replace(/\s+/g, '-');
  update(d => {
    d.channels[id] = { id, serverId, name, type: data.type, ...(data.topic ? { topic: data.topic } : {}), ...(data.icon ? { icon: data.icon } : {}), ...(data.lock ? { lock: data.lock } : {}) };
    const cat = d.servers[serverId]!.categories.find(c => c.id === categoryId) ?? d.servers[serverId]!.categories[0];
    cat?.channelIds.push(id);
    d.readAt[id] = Date.now();
    audit(d, serverId, 'Created channel', name);
  });
  toast('Channel created');
  return id;
}
export function updateChannel(channelId: string, patch: Partial<Pick<Channel, 'name' | 'topic' | 'icon' | 'lock' | 'slowModeSec'>> & { clearIcon?: boolean; clearLock?: boolean }) {
  update(d => {
    const c = d.channels[channelId];
    if (!c) return;
    if (patch.name !== undefined) c.name = patch.name.trim();
    if (patch.topic !== undefined) c.topic = patch.topic;
    if (patch.icon) c.icon = patch.icon;
    if (patch.clearIcon) delete c.icon;
    if (patch.lock) c.lock = patch.lock;
    if (patch.clearLock) delete c.lock;
    if (patch.slowModeSec !== undefined) c.slowModeSec = patch.slowModeSec;
    audit(d, c.serverId, 'Edited channel', c.name);
  });
  toast('Channel saved');
}
export function deleteChannel(channelId: string) {
  const c = get().channels[channelId];
  if (!c) return;
  ask({ title: msg('Delete #{name}?'), vars: { name: c.name }, body: msg('Messages in this channel are removed for everyone. A snapshot lets owners restore channels from the anti-nuke page.'), confirmLabel: msg('Delete channel'), tone: 'danger', onConfirm: () => {
    let catId = ''; let index = -1;
    update(d => {
      for (const cat of d.servers[c.serverId]!.categories) { const i = cat.channelIds.indexOf(channelId); if (i >= 0) { catId = cat.id; index = i; cat.channelIds.splice(i, 1); } }
      audit(d, c.serverId, 'Deleted channel', c.name);
    });
    toast('Channel deleted', { undo: () => update(d => { d.servers[c.serverId]!.categories.find(x => x.id === catId)?.channelIds.splice(index, 0, channelId); }) });
  } });
}
/** Move a channel to `toIndex` within `toCategory` (drag-and-drop and keyboard both use this). */
export function moveChannel(serverId: string, channelId: string, toCategory: string, toIndex: number) {
  update(d => {
    const sv = d.servers[serverId]!;
    for (const cat of sv.categories) { const i = cat.channelIds.indexOf(channelId); if (i >= 0) cat.channelIds.splice(i, 1); }
    const target = sv.categories.find(c => c.id === toCategory);
    if (!target) return;
    target.channelIds.splice(Math.max(0, Math.min(toIndex, target.channelIds.length)), 0, channelId);
    audit(d, serverId, 'Reordered channels');
  });
}
export function moveCategory(serverId: string, categoryId: string, toIndex: number) {
  update(d => {
    const cats = d.servers[serverId]!.categories;
    const i = cats.findIndex(c => c.id === categoryId);
    if (i < 0) return;
    const [c] = cats.splice(i, 1);
    cats.splice(Math.max(0, Math.min(toIndex, cats.length)), 0, c!);
    audit(d, serverId, 'Reordered categories');
  });
}
export function createCategory(serverId: string, name: string) {
  update(d => { d.servers[serverId]!.categories.push({ id: uid('cat'), name: name.trim(), channelIds: [] }); audit(d, serverId, 'Created category', name); });
  toast('Category created');
}
export function renameCategory(serverId: string, categoryId: string, name: string) {
  update(d => { const c = d.servers[serverId]!.categories.find(x => x.id === categoryId); if (c) c.name = name.trim(); audit(d, serverId, 'Renamed category', name); });
}
export function deleteCategory(serverId: string, categoryId: string) {
  const sv = get().servers[serverId]!;
  const cat = sv.categories.find(c => c.id === categoryId);
  if (!cat) return;
  ask({ title: msg('Delete category {name}?'), vars: { name: cat.name }, body: msg('Its channels move to the first remaining category.'), confirmLabel: msg('Delete category'), tone: 'danger', onConfirm: () => {
    update(d => {
      const cats = d.servers[serverId]!.categories;
      const i = cats.findIndex(c => c.id === categoryId);
      const [removed] = cats.splice(i, 1);
      if (cats[0] && removed) cats[0].channelIds.push(...removed.channelIds);
      else if (removed) cats.push({ ...removed, name: 'Channels' });
      audit(d, serverId, 'Deleted category', cat.name);
    });
    toast('Category deleted');
  } });
}

/* ---------------- roles (COM-06/07/08) ---------------- */
export type RoleError = 'hierarchy' | 'name' | null;
export function saveRole(serverId: string, role: Role): RoleError {
  const s = get();
  const top = myTopPosition(s, serverId);
  const existing = s.servers[serverId]!.roles.find(r => r.id === role.id);
  if (!role.name.trim()) return 'name';
  if (s.servers[serverId]!.owner !== ME && (role.position <= top || (existing && existing.position <= top))) return 'hierarchy';
  update(d => {
    const roles = d.servers[serverId]!.roles;
    const i = roles.findIndex(r => r.id === role.id);
    if (i >= 0) roles[i] = role; else roles.push(role);
    roles.sort((a, b) => a.position - b.position);
    audit(d, serverId, i >= 0 ? 'Edited role' : 'Created role', role.name);
  });
  toast('Role saved');
  return null;
}
export function newRoleDraft(serverId: string): Role {
  const s = get();
  const roles = s.servers[serverId]!.roles;
  const pos = Math.max(myTopPosition(s, serverId) + 1, ...roles.filter(r => !r.system).map(r => r.position + 1));
  return { id: uid('role'), name: '', color1: '#5AA9F5', categoryId: s.servers[serverId]!.roleCategories[0]?.id ?? 'staff', position: Math.min(pos, 98), permissions: ['sendMessages', 'speak'] as Permission[] };
}
export function deleteRole(serverId: string, roleId: string) {
  const sv = get().servers[serverId]!;
  const r = sv.roles.find(x => x.id === roleId);
  if (!r || r.system) return;
  if (sv.owner !== ME && r.position <= myTopPosition(get(), serverId)) { toast('You can only manage roles below your highest role.', { tone: 'warn' }); return; }
  ask({ title: msg('Delete role {name}?'), vars: { name: r.name }, body: msg('Members lose this role and its permissions.'), confirmLabel: msg('Delete role'), tone: 'danger', onConfirm: () => {
    update(d => { const s2 = d.servers[serverId]!; s2.roles = s2.roles.filter(x => x.id !== roleId); s2.memberList.forEach(m => { m.roleIds = m.roleIds.filter(x => x !== roleId); }); audit(d, serverId, 'Deleted role', r.name); });
    toast('Role deleted');
  } });
}
export function moveRole(serverId: string, roleId: string, dir: -1 | 1) {
  const s = get();
  const sv = s.servers[serverId]!;
  const list = sv.roles.filter(r => !r.system).sort((a, b) => a.position - b.position);
  const i = list.findIndex(r => r.id === roleId);
  const j = i + dir;
  const a = list[i], b = list[j];
  if (!a || !b) return;
  const top = myTopPosition(s, serverId);
  if (sv.owner !== ME && (a.position <= top || b.position <= top)) { toast('You can only manage roles below your highest role.', { tone: 'warn' }); return; }
  update(d => { const ra = d.servers[serverId]!.roles.find(r => r.id === a.id)!, rb = d.servers[serverId]!.roles.find(r => r.id === b.id)!; const p = ra.position; ra.position = rb.position; rb.position = p; d.servers[serverId]!.roles.sort((x, y) => x.position - y.position); audit(d, serverId, 'Reordered roles'); });
}
export function addRoleCategory(serverId: string, name: string) { update(d => { d.servers[serverId]!.roleCategories.push({ id: uid('rc'), name: name.trim() }); audit(d, serverId, 'Created role category', name); }); toast('Role category added'); }
export function renameRoleCategory(serverId: string, id: string, name: string) { update(d => { const c = d.servers[serverId]!.roleCategories.find(x => x.id === id); if (c) c.name = name.trim(); }); }
export function setMemberRole(serverId: string, userId: string, roleId: string, on: boolean) {
  update(d => { const m = d.servers[serverId]!.memberList.find(x => x.userId === userId); if (!m) return; m.roleIds = on ? [...new Set([...m.roleIds, roleId])] : m.roleIds.filter(r => r !== roleId); audit(d, serverId, on ? 'Gave role' : 'Removed role', d.users[userId]?.name); });
}

/* ---------------- overview, theme, emoji ---------------- */
export function saveOverview(serverId: string, patch: Partial<Pick<Server, 'name' | 'description' | 'city' | 'category' | 'bannerStyle' | 'accent' | 'effectsEnabled' | 'whisperEnabled' | 'e2ee'>>) {
  update(d => { Object.assign(d.servers[serverId]!, patch); audit(d, serverId, 'Updated community settings'); });
}
export function addEmoji(serverId: string, type: 'emoji' | 'sticker', e: Omit<CustomEmoji, 'id' | 'by'>) {
  update(d => { const sv = d.servers[serverId]!; (type === 'emoji' ? sv.emoji : sv.stickers).push({ ...e, id: uid('e'), by: ME }); audit(d, serverId, type === 'emoji' ? 'Uploaded emoji' : 'Uploaded sticker', e.name); });
  toast(type === 'emoji' ? msg('Emoji added') : msg('Sticker added'));
}
export function renameEmoji(serverId: string, type: 'emoji' | 'sticker', id: string, name: string) {
  update(d => { const sv = d.servers[serverId]!; const e = (type === 'emoji' ? sv.emoji : sv.stickers).find(x => x.id === id); if (e) e.name = name; });
}
export function deleteEmoji(serverId: string, type: 'emoji' | 'sticker', id: string) {
  const sv = get().servers[serverId]!;
  const list = type === 'emoji' ? sv.emoji : sv.stickers;
  const e = list.find(x => x.id === id);
  update(d => { const s2 = d.servers[serverId]!; if (type === 'emoji') s2.emoji = s2.emoji.filter(x => x.id !== id); else s2.stickers = s2.stickers.filter(x => x.id !== id); audit(d, serverId, 'Deleted emoji', e?.name); });
  toast('Deleted', { undo: () => update(d => { if (e) (type === 'emoji' ? d.servers[serverId]!.emoji : d.servers[serverId]!.stickers).push(e); }) });
}

/* ---------------- events & RSVP (COM-15, EVT-01) ---------------- */
export function rsvp(eventId: string, choice: 'going' | 'interested' | null) {
  update(d => {
    const e = d.events.find(x => x.id === eventId);
    const prev = d.rsvps[eventId];
    if (!e) return;
    if (prev === 'going') e.going -= 1; if (prev === 'interested') e.interested -= 1;
    if (choice === 'going') e.going += 1; if (choice === 'interested') e.interested += 1;
    if (choice) d.rsvps[eventId] = choice; else delete d.rsvps[eventId];
  });
  toast(choice === 'going' ? msg('You’re going. Reminders 24 hours and 15 minutes before.') : choice === 'interested' ? msg('Marked interested') : msg('RSVP removed'));
}
export function createEvent(serverId: string, data: { name: string; type: 'open-mic' | 'hackathon' | 'watch-along' | 'ama' | 'meetup'; startsAt: number; channelId: string; description: string }) {
  const id = uid('ev');
  update(d => { d.events.push({ id, serverId, ...data, going: 1, interested: 0, host: ME }); d.rsvps[id] = 'going'; audit(d, serverId, 'Created event', data.name); });
  toast('Event created');
  return id;
}
export function cancelEvent(eventId: string) {
  const e = get().events.find(x => x.id === eventId);
  if (!e) return;
  ask({ title: msg('Cancel {name}?'), vars: { name: e.name }, body: msg('People who RSVPed are told it was cancelled.'), confirmLabel: msg('Cancel event'), tone: 'danger', onConfirm: () => {
    update(d => { d.events = d.events.filter(x => x.id !== eventId); delete d.rsvps[eventId]; audit(d, e.serverId, 'Cancelled event', e.name); });
    toast('Event cancelled');
  } });
}

/* ---------------- invites ---------------- */
export function createInvite(maxUses: number | null, days: number | null) {
  const code = Math.random().toString(36).slice(2, 8);
  update(d => { d.invites.unshift({ code, by: ME, uses: 0, maxUses, expiresAt: days ? Date.now() + days * 86_400_000 : null }); });
  toast('Invite created');
  return code;
}
export function revokeInvite(code: string) { update(d => { d.invites = d.invites.filter(i => i.code !== code); }); toast('Invite revoked'); }
