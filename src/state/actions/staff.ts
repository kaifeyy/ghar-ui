import { update, get } from '../store';
import type { Badge, Report } from '@/types/models';
import type { AppStatus, PlatformBan } from '@/fixtures/staff';
import { uid } from '@/domain/rng';
import { toast, ask } from './ui';
import { download } from './auth';
import { msg } from '@/i18n';
import { ME } from '@/fixtures/users';

const STAFF_ME = 'staff1';
function log(action: string, target: string) { update(d => { d.staffAudit.unshift({ id: uid('sa'), staff: STAFF_ME, action, target, at: Date.now() }); }); }

export function staffSignIn() { update(s => { s.staffAuthed = true; }); log('Signed in to staff console', 'SSO + security key (demo)'); }
export function staffSignOut() { update(s => { s.staffAuthed = false; s.route = { name: 'inbox' }; }); }

export function decideApplication(id: string, status: Exclude<AppStatus, 'pending'>, note: string) {
  const a = get().applications.find(x => x.id === id);
  if (!a) return;
  update(d => {
    const x = d.applications.find(y => y.id === id)!;
    x.status = status;
    if (note.trim()) x.notes.push({ by: STAFF_ME, text: note.trim(), at: Date.now() });
    if (x.applicant === ME) d.inbox.unshift({ id: uid('i'), kind: 'event', title: status === 'approved' ? msg('Your server application was approved') : status === 'rejected' ? msg('Your server application was not approved') : msg('The team asked for changes to your application'), preview: note.trim() || a.name, at: Date.now(), unread: true, target: { route: 'communities' } });
  });
  log(status === 'approved' ? 'Approved server application' : status === 'rejected' ? 'Rejected server application' : 'Requested changes to application', a.name);
  toast(status === 'approved' ? msg('Approved. The applicant is notified.') : status === 'rejected' ? msg('Rejected. The applicant is notified.') : msg('Changes requested. The applicant is notified.'));
}

export function decideReport(id: string, status: Report['status']) {
  const r = get().reports.find(x => x.id === id);
  if (!r) return;
  const destructive = status === 'banned' || status === 'server-removed' || status === 'suspended';
  const run = () => { update(d => { const x = d.reports.find(y => y.id === id); if (x) x.status = status; if (r.reporter === ME && status !== 'open') d.inbox.unshift({ id: uid('i'), kind: 'event', title: status === 'dismissed' ? msg('We reviewed your report and took no action') : msg('We reviewed your report and took action'), preview: r.title, at: Date.now(), unread: true, target: { route: 'communities' } }); }); log(`Report ${status}`, r.title); toast('Report updated'); };
  if (destructive) ask({ title: msg('Apply this action?'), body: msg('This is logged in the platform audit trail.'), confirmLabel: msg('Apply'), tone: 'danger', onConfirm: run }); else run();
}

export function addBan(target: string, kind: PlatformBan['kind'], reason: string, days: number | null) {
  update(d => { d.bans.unshift({ id: uid('b'), target: target.trim(), kind, reason: reason.trim(), at: Date.now(), expiresAt: days ? Date.now() + days * 86_400_000 : null }); });
  log('Added platform ban', `${kind}: ${target}`);
  toast('Ban added');
}
export function liftBan(id: string) {
  const b = get().bans.find(x => x.id === id);
  ask({ title: msg('Lift this ban?'), body: msg('The account, device or number can be used again.'), confirmLabel: msg('Lift ban'), tone: 'primary', onConfirm: () => { update(d => { d.bans = d.bans.filter(x => x.id !== id); }); log('Lifted ban', b?.target ?? id); toast('Ban lifted'); } });
}
export function decideAppeal(id: string, grant: boolean) {
  const b = get().bans.find(x => x.id === id);
  update(d => { const x = d.bans.find(y => y.id === id); if (x?.appeal) x.appeal.state = grant ? 'granted' : 'denied'; if (grant) d.bans = d.bans.filter(y => y.id !== id); });
  log(grant ? 'Granted appeal' : 'Denied appeal', b?.target ?? id);
  toast(grant ? msg('Appeal granted and ban lifted') : msg('Appeal denied'));
}

/* badges (ADM-03, BDG-12) */
export function setBadge(userId: string, badgeId: string, on: boolean) {
  update(d => { const u = d.users[userId]; if (!u) return; u.badges = on ? [...new Set([...u.badges, badgeId])] : u.badges.filter(b => b !== badgeId); });
  log(on ? 'Assigned badge' : 'Removed badge', `${badgeId} → ${get().users[userId]?.handle}`);
  toast(on ? msg('Badge assigned') : msg('Badge removed'));
}
export function saveBadgeType(b: Badge) {
  update(d => { const i = d.badgeCatalog.findIndex(x => x.id === b.id); if (i >= 0) d.badgeCatalog[i] = b; else d.badgeCatalog.push(b); });
  log('Saved badge type', b.name);
  toast('Badge catalogue updated, no release needed');
}
/** Bulk rule preview (e.g. Early Recognizer by signup date). Applying needs a second staff approval (two-person rule). */
export function bulkPreview(badgeId: string, from: string, to: string): string[] {
  const f = Date.parse(from), tt = Date.parse(to) + 86_400_000;
  return Object.values(get().users).filter(u => !u.bot && Date.parse(u.joinedAt) >= f && Date.parse(u.joinedAt) < tt && !u.badges.includes(badgeId)).map(u => u.id);
}
export function bulkApply(badgeId: string, ids: string[], approver: string) {
  update(d => { for (const id of ids) { const u = d.users[id]; if (u && !u.badges.includes(badgeId)) u.badges.push(badgeId); } });
  log(`Bulk-assigned badge (approved by ${approver})`, `${badgeId} → ${ids.length} accounts`);
  toast('Badge assigned to {n} accounts', { vars: { n: ids.length } });
}

export function reviewAssessment(id: string, pass: boolean) {
  const a = get().assessments.find(x => x.id === id);
  if (!a) return;
  update(d => { const x = d.assessments.find(y => y.id === id); if (x) x.state = pass ? 'passed' : 'failed'; if (pass) { const u = d.users[a.user]; if (u && !u.badges.includes('mod')) u.badges.push('mod'); } });
  log(pass ? 'Passed moderator assessment, granted Certified Moderator' : 'Failed moderator assessment', get().users[a.user]?.handle ?? a.user);
  toast(pass ? msg('Passed. Certified Moderator badge granted.') : msg('Marked as not passed'));
}

export function addReserved(name: string, category: 'artist' | 'politician' | 'brand' | 'team', note: string) {
  const n = name.trim().toLowerCase().replace(/^@/, '');
  update(d => { if (!d.reserved.some(r => r.name === n)) d.reserved.unshift({ name: n, category, ...(note.trim() ? { note: note.trim() } : {}) }); });
  log('Reserved username', n);
  toast('Name reserved');
}
export function releaseReserved(name: string) {
  ask({ title: msg('Release @{name}?'), vars: { name }, body: msg('It becomes claimable by its verified owner.'), confirmLabel: msg('Release'), tone: 'primary', onConfirm: () => { update(d => { d.reserved = d.reserved.filter(r => r.name !== name); }); log('Released reserved username', name); toast('Name released'); } });
}

export function assignExpert(id: string, staff: string) { update(d => { const x = d.expertTickets.find(y => y.id === id); if (x) { x.expert = staff; x.state = 'assigned'; } }); log('Assigned expert', id); toast('Expert assigned'); }
export function advanceExpert(id: string) {
  update(d => { const x = d.expertTickets.find(y => y.id === id); if (!x) return; x.state = x.state === 'assigned' ? 'in-progress' : 'completed'; });
  const x = get().expertTickets.find(y => y.id === id);
  log(x?.state === 'completed' ? 'Completed expert ticket, removed expert access' : 'Expert ticket in progress', id);
  toast(x?.state === 'completed' ? msg('Completed. Expert access removed.') : msg('Marked in progress'));
}

export function createDecoy(handle: string, staff: string) { update(d => { d.decoys.unshift({ id: uid('decoy'), handle: handle.trim(), staff, createdAt: Date.now(), reports: 0, active: true }); }); log('Created decoy account', handle); toast('Decoy created. Its badge is visible to staff only.'); }
export function toggleDecoy(id: string) { update(d => { const x = d.decoys.find(y => y.id === id); if (x) x.active = !x.active; }); log('Toggled decoy', id); }

export function decideKyc(approve: boolean) { update(d => { d.kyc = approve ? 'approved' : 'rejected'; }); log(approve ? 'Approved creator verification' : 'Rejected creator verification', 'kaif'); toast(approve ? msg('Verification approved') : msg('Verification rejected')); }

export function exportStaffAudit() {
  const s = get();
  const rows = s.staffAudit.map(a => [new Date(a.at).toISOString(), a.staff, a.action, a.target].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  download('ghar-staff-audit-demo.csv', ['time,staff,action,target', ...rows].join('\n'), 'text/csv');
  toast('Audit log exported');
}

/* ---------------- users (admin) ---------------- */
export function suspendUser(userId: string, days: number | null, reason: string) {
  const u = get().users[userId];
  if (!u) return;
  update(d => { d.suspensions[userId] = { until: days ? Date.now() + days * 86_400_000 : null, reason: reason.trim(), at: Date.now() }; });
  log(days ? `Suspended account for ${days} days` : 'Suspended account indefinitely', `@${u.handle}: ${reason.trim()}`);
  toast('@{handle} suspended', { vars: { handle: u.handle } });
}
export function liftSuspension(userId: string) {
  const u = get().users[userId];
  ask({ title: msg('Lift the suspension for @{handle}?'), vars: { handle: u?.handle ?? userId }, body: msg('They can sign in and post again straight away.'), confirmLabel: msg('Lift suspension'), tone: 'primary', onConfirm: () => {
    update(d => { delete d.suspensions[userId]; });
    log('Lifted suspension', `@${u?.handle ?? userId}`);
    toast('Suspension lifted');
  } });
}
export function warnUser(userId: string, note: string) {
  const u = get().users[userId];
  if (!u || !note.trim()) return;
  update(d => { if (userId === ME) d.inbox.unshift({ id: uid('i'), kind: 'event', title: msg('A warning from the Ghar team'), preview: note.trim(), at: Date.now(), unread: true, target: { route: 'communities' } }); });
  log('Sent account warning', `@${u.handle}: ${note.trim()}`);
  toast('Warning sent to @{handle}', { vars: { handle: u.handle } });
}

/* ---------------- integration status (admin) ---------------- */
export function runServiceCheck(id: string, ok: boolean) {
  update(d => { d.serviceChecks[id] = { at: Date.now(), ok }; });
  log('Ran service check', id);
}
