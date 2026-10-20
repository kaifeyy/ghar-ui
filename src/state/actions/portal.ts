import { update, get } from '../store';
import type { ModAction, Message } from '@/types/models';
import type { PortalConfig } from '@/fixtures/portal';
import { uid } from '@/domain/rng';
import { ME } from '@/fixtures/users';
import { toast, ask } from './ui';
import { audit } from './community';
import { download } from './auth';
import { canManage, myTopPosition } from '../selectors';
import { msg } from '@/i18n';

/** Saving a Developer Portal module keeps exactly the values chosen (DPT-01: every change logged). */
export function savePortal<K extends keyof PortalConfig>(serverId: string, module: K, value: PortalConfig[K]): boolean {
  const s = get();
  if (s.failNextSave) { update(d => { d.failNextSave = false; }); toast('Couldn’t save. Your changes are still here. Try again.', { tone: 'error' }); return false; }
  if (s.net !== 'online') { toast('You’re offline. Your changes are still here; save again when you reconnect.', { tone: 'error' }); return false; }
  update(d => { d.portal[serverId]![module] = structuredClone(value) as never; audit(d, serverId, 'Updated Developer Portal module', String(module)); });
  toast('Saved');
  return true;
}

/* ---------------- moderation (DPT-05) — applies the represented outcome locally ---------------- */
export function moderate(serverId: string, userId: string, action: ModAction, reason: string, opts: { minutes?: number; count?: number } = {}) {
  const s = get();
  const sv = s.servers[serverId]!;
  const target = sv.memberList.find(m => m.userId === userId);
  const targetTop = target ? Math.min(...sv.roles.filter(r => target.roleIds.includes(r.id)).map(r => r.position), 99) : 99;
  if (action !== 'unban' && (userId === sv.owner || (sv.owner !== ME && targetTop <= myTopPosition(s, serverId)))) { toast('You can’t moderate someone with an equal or higher role.', { tone: 'warn' }); return false; }
  const name = s.users[userId]?.name ?? userId;
  let detail = '';
  update(d => {
    const sv2 = d.servers[serverId]!;
    const m = sv2.memberList.find(x => x.userId === userId);
    if (action === 'warn' && m) { m.warnings += 1; detail = `${m.warnings} warnings`; }
    if (action === 'timeout' && m) { const mins = opts.minutes ?? 10; m.timeoutUntil = Date.now() + mins * 60_000; detail = `${mins} min`; }
    if (action === 'untimeout' && m) { delete m.timeoutUntil; }
    if (action === 'kick') { sv2.memberList = sv2.memberList.filter(x => x.userId !== userId); sv2.members -= 1; }
    if (action === 'ban') { sv2.memberList = sv2.memberList.filter(x => x.userId !== userId); sv2.members -= 1; (d.serverBans[serverId] ??= []).unshift({ userId, label: name, reason: reason.trim() || '—', at: Date.now() }); }
    if (action === 'unban') { d.serverBans[serverId] = (d.serverBans[serverId] ?? []).filter(b => b.userId !== userId); }
    if (action === 'remove-messages') {
      let n = 0; const limit = opts.count ?? 50;
      for (const c of Object.values(d.channels).filter(c => c.serverId === serverId)) {
        const list = d.messages[c.id];
        if (!list) continue;
        for (let i = list.length - 1; i >= 0 && n < limit; i--) if (list[i]!.author === userId) { list.splice(i, 1); n++; }
      }
      detail = `${n} messages`;
    }
    d.modCases.unshift({ id: uid('mc'), serverId, memberId: userId, action, reason: reason.trim() || '—', by: ME, at: Date.now(), ...(detail ? { detail } : {}) });
    audit(d, serverId, ({ warn: 'Warned a member', timeout: 'Timed out a member', untimeout: 'Removed a timeout', kick: 'Kicked a member', ban: 'Banned a member', unban: 'Unbanned a member', 'remove-messages': 'Removed messages' } as const)[action], name);
  });
  toast(({ warn: msg('{name} was warned'), timeout: msg('{name} is timed out'), untimeout: msg('Timeout removed for {name}'), kick: msg('{name} was kicked'), ban: msg('{name} was banned'), unban: msg('{name} was unbanned'), 'remove-messages': msg('Messages from {name} were removed') } as const)[action], { vars: { name } });
  return true;
}

export function removeMessageAsModerator(serverId: string, channelId: string, messageId: string) {
  if (!canManage(get(), serverId, 'manageMessages')) return;
  ask({ title: msg('Remove this message?'), body: msg('It’s removed for everyone and recorded in the audit log.'), confirmLabel: msg('Remove'), tone: 'danger', onConfirm: () => {
    let removed: Message | undefined; let at = -1;
    update(d => { const l = d.messages[channelId]; if (!l) return; at = l.findIndex(m => m.id === messageId); if (at >= 0) removed = { ...l.splice(at, 1)[0]! }; if (removed) { d.modCases.unshift({ id: uid('mc'), serverId, memberId: removed.author, action: 'remove-messages', reason: 'Removed from channel', by: ME, at: Date.now(), detail: '1 message' }); audit(d, serverId, 'Removed a message', d.users[removed.author]?.name); } });
    toast('Message removed', { undo: () => update(d => { if (removed) d.messages[channelId]?.splice(at, 0, removed); }) });
  } });
}

/* ---------------- tickets (DPT-02) ---------------- */
export function openTicket(serverId: string, subject: string, firstMessage: string): string {
  const s = get();
  const number = Math.max(0, ...s.tickets.filter(t => t.serverId === serverId).map(t => t.number)) + 1;
  const id = uid('tk');
  const greeting = s.portal[serverId]?.tickets.greeting;
  update(d => {
    d.tickets.unshift({ id, serverId, number, opener: ME, subject: subject.trim(), state: 'open', createdAt: Date.now(), messages: [
      { id: uid('m'), author: ME, text: firstMessage.trim(), at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' },
      ...(greeting ? [{ id: uid('m'), author: 'system', system: true, text: greeting, at: Date.now() + 1, attachments: [], reactions: {}, delivery: 'sent' as const }] : []),
    ] });
    audit(d, serverId, 'Opened ticket', `#${number}`);
  });
  toast('Ticket #{n} opened. Only you and staff can see it.', { vars: { n: number } });
  return id;
}
export function ticketReply(ticketId: string, text: string) {
  update(d => { const tk = d.tickets.find(x => x.id === ticketId); if (tk && text.trim() && tk.state !== 'closed') tk.messages.push({ id: uid('m'), author: ME, text: text.trim(), at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' }); });
}
export function claimTicket(ticketId: string) { update(d => { const tk = d.tickets.find(x => x.id === ticketId); if (tk) { tk.claimedBy = ME; tk.state = 'claimed'; tk.messages.push(sys(`${d.users[ME]!.name} claimed this ticket.`)); audit(d, tk.serverId, 'Claimed ticket', `#${tk.number}`); } }); toast('Ticket claimed'); }
export function closeTicket(ticketId: string) {
  update(d => { const tk = d.tickets.find(x => x.id === ticketId); if (tk) { tk.state = 'closed'; tk.closedAt = Date.now(); tk.messages.push(sys('Ticket closed. A transcript was saved.')); audit(d, tk.serverId, 'Closed ticket', `#${tk.number}`); } });
  toast('Ticket closed. Transcript saved.');
}
export function reopenTicket(ticketId: string) { update(d => { const tk = d.tickets.find(x => x.id === ticketId); if (tk) { tk.state = tk.claimedBy ? 'claimed' : 'open'; delete tk.closedAt; tk.messages.push(sys('Ticket reopened.')); audit(d, tk.serverId, 'Reopened ticket', `#${tk.number}`); } }); toast('Ticket reopened'); }
export function downloadTranscript(ticketId: string) {
  const s = get();
  const tk = s.tickets.find(x => x.id === ticketId);
  if (!tk) return;
  const lines = [`Ghar demo ticket transcript — fictional data`, `Ticket #${tk.number}: ${tk.subject}`, `Community: ${s.servers[tk.serverId]?.name}`, `State: ${tk.state}`, ''];
  for (const m of tk.messages) lines.push(`[${new Date(m.at).toISOString()}] ${m.system ? 'System' : s.users[m.author]?.name ?? m.author}: ${m.text}`);
  download(`ticket-${tk.number}-transcript.txt`, lines.join('\n'));
  toast('Transcript downloaded');
}
const sys = (text: string): Message => ({ id: uid('m'), author: 'system', system: true, text, at: Date.now(), attachments: [], reactions: {}, delivery: 'sent' });

/* ---------------- anti-nuke (DPT-06) ---------------- */
export function takeSnapshot(serverId: string) {
  const s = get();
  const sv = s.servers[serverId]!;
  update(d => { d.snapshots.unshift({ id: uid('snap'), serverId, at: Date.now(), roles: structuredClone(sv.roles), categories: structuredClone(sv.categories), channels: Object.values(s.channels).filter(c => c.serverId === serverId).map(c => structuredClone(c)) }); audit(d, serverId, 'Took a snapshot'); });
  toast('Snapshot saved');
}
/** Demo: a rogue admin deletes channels quickly; the configured threshold freezes the community. */
export function simulateNuke(serverId: string) {
  const s = get();
  const cfg = s.portal[serverId]!.antinuke;
  if (!cfg.enabled) { toast('Anti-nuke is off. Turn it on to see it stop this.', { tone: 'warn' }); return; }
  const victims = s.servers[serverId]!.categories.flatMap(c => c.channelIds).slice(0, cfg.channelDeletes + 1);
  update(d => {
    for (const cat of d.servers[serverId]!.categories) cat.channelIds = cat.channelIds.filter(id => !victims.includes(id));
    d.portal[serverId]!.antinuke.frozen = true;
    d.portal[serverId]!.antinuke.alert = `Ali Haider (Admin) deleted ${victims.length} channels in 20 seconds. Their permissions were removed and the community is frozen.`;
    const sv = d.servers[serverId]!; const ali = sv.memberList.find(m => m.userId === 'ali'); if (ali) ali.roleIds = ali.roleIds.filter(r => !r.endsWith('-admin'));
    audit(d, serverId, 'Anti-nuke triggered: permissions stripped, community frozen', 'Ali Haider');
  });
  toast('Anti-nuke stopped a mass deletion and froze the community.', { tone: 'warn' });
}
export function restoreSnapshot(serverId: string, snapId: string) {
  const snap = get().snapshots.find(x => x.id === snapId);
  if (!snap) return;
  ask({ title: msg('Restore roles and channels?'), body: msg('Roles, categories and channels go back to the snapshot. Messages sent since then stay.'), confirmLabel: msg('Restore'), tone: 'primary', onConfirm: () => {
    update(d => {
      const sv = d.servers[serverId]!;
      sv.roles = structuredClone(snap.roles);
      sv.categories = structuredClone(snap.categories);
      for (const c of snap.channels) d.channels[c.id] = structuredClone(c);
      d.portal[serverId]!.antinuke.frozen = false;
      delete d.portal[serverId]!.antinuke.alert;
      audit(d, serverId, 'Restored snapshot', new Date(snap.at).toLocaleString());
    });
    toast('Roles and channels restored');
  } });
}
export function unfreeze(serverId: string) { update(d => { d.portal[serverId]!.antinuke.frozen = false; delete d.portal[serverId]!.antinuke.alert; audit(d, serverId, 'Unfroze community'); }); toast('Community unfrozen'); }

/* ---------------- bots, webhooks, integrations, apps (DEV-01..03) — fake credentials only ---------------- */
export function toggleBot(id: string) {
  let added = false;
  update(d => { const b = d.bots.find(x => x.id === id); if (b) { b.added = !b.added; added = b.added; } });
  toast(added ? msg('Bot added with the permissions shown') : msg('Bot removed'));
}
export function setBotPerms(id: string, perms: string[]) { update(d => { const b = d.bots.find(x => x.id === id); if (b) b.perms = perms; }); toast('Bot permissions saved'); }
export function createWebhook(name: string, channelId: string) { update(d => { d.webhooks.push({ id: uid('wh'), name: name.trim(), channelId, createdAt: Date.now(), secretShown: false }); }); toast('Webhook created'); }
export function deleteWebhook(id: string) { ask({ title: msg('Delete this webhook?'), body: msg('Anything posting to it will stop working.'), confirmLabel: msg('Delete'), tone: 'danger', onConfirm: () => { update(d => { d.webhooks = d.webhooks.filter(w => w.id !== id); }); toast('Webhook deleted'); } }); }
export function createApp(name: string, redirect: string, scopes: string[], bot: boolean) {
  update(d => { d.devApps.push({ id: uid('app'), name: name.trim(), clientId: `demo-client-${Math.random().toString(36).slice(2, 8)}-fake`, redirect, scopes, bot, createdAt: Date.now() }); });
  toast('App created with demo credentials');
}
export function deleteApp(id: string) { ask({ title: msg('Delete this app?'), body: msg('Its demo credentials stop working.'), confirmLabel: msg('Delete app'), tone: 'danger', onConfirm: () => { update(d => { d.devApps = d.devApps.filter(a => a.id !== id); }); toast('App deleted'); } }); }

export function exportAudit(serverId: string) {
  const s = get();
  const rows = s.audit.filter(a => a.serverId === serverId).map(a => [new Date(a.at).toISOString(), s.users[a.actor]?.name ?? a.actor, a.action, a.target ?? ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  download(`audit-${serverId}.csv`, ['time,actor,action,target', ...rows].join('\n'), 'text/csv');
  toast('Audit log exported');
}
