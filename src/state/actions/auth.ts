import { update, get } from '../store';
import { checkAge, restrictionsFor } from '@/domain/age';
import { ME } from '@/fixtures/users';
import { toast, ask, go } from './ui';
import { msg } from '@/i18n';

/** Demo authentication: nothing is sent or stored. Passwords are never written to state or storage. */
export type LoginResult = { ok: true } | { ok: false; error: 'missing' | 'wrong' | 'locked'; attemptsLeft?: number };
let fails = 0;
let lockedUntil = 0;
export function login(identifier: string, password: string): LoginResult {
  if (!identifier.trim() || !password) return { ok: false, error: 'missing' };
  if (Date.now() < lockedUntil) return { ok: false, error: 'locked' };
  if (password === 'wrong') {
    fails += 1;
    if (fails >= 5) { lockedUntil = Date.now() + 15 * 60_000; fails = 0; return { ok: false, error: 'locked' }; }
    return { ok: false, error: 'wrong', attemptsLeft: 5 - fails };
  }
  fails = 0;
  enterApp(false);
  return { ok: true };
}

export type SignupResult = { ok: true } | { ok: false; errors: Partial<Record<'email' | 'password' | 'dob', string>> } | { ok: false; underage: true };
export function signup(email: string, password: string, dob: string): SignupResult {
  const errors: Partial<Record<'email' | 'password' | 'dob', string>> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errors.email = msg('Enter a valid email address.');
  if (password.length < 8) errors.password = msg('Use at least 8 characters.');
  const age = checkAge(dob, Date.now());
  if (!age.ok && age.reason === 'invalid') errors.dob = msg('Enter your date of birth.');
  if (Object.keys(errors).length) return { ok: false, errors };
  if (!age.ok) { update(s => { s.authStep = 'young'; }); return { ok: false, underage: true }; }
  applyAgeGroup(dob);
  update(s => { s.authStep = 'verify-email'; s.emailVerified = false; });
  return { ok: true };
}

export function applyAgeGroup(dob: string) {
  const age = checkAge(dob, Date.now());
  if (!age.ok) return;
  const r = restrictionsFor(age.group);
  update(s => {
    s.dob = dob; s.ageGroup = age.group;
    s.prefs.privacy.dmsFromNonFriends = r.dmsFromNonFriendsDefault;
    s.prefs.privacy.lastSeen = r.lastSeenVisibleDefault;
    s.prefs.storyAudienceDefault = r.storyAudienceDefault;
    if (age.group === 'minor') s.relationships = s.relationships.filter(x => x.type !== 'partner');
  });
}

export function verifyEmailDemo() { update(s => { s.emailVerified = true; s.authStep = 'username'; }); }
export function setAuthStep(step: ReturnType<typeof get>['authStep']) { update(s => { s.authStep = step; }); }
export function enterApp(fresh: boolean) {
  update(s => { s.authed = true; s.authStep = fresh ? 'onboarding' : 'login'; s.route = { name: 'inbox' }; s.history = []; });
}
export function finishOnboarding() { update(s => { s.authStep = 'login'; }); go({ name: 'inbox' }, { replace: true }); }

export function confirmLogout() {
  ask({ title: msg('Log out?'), body: msg('You’ll need to sign in again on this browser. Unsent drafts are kept on this device only until you reload.'), confirmLabel: msg('Log out'), tone: 'danger', onConfirm: logout });
}
export function logout() {
  update(s => { s.authed = false; s.authStep = 'login'; s.voice = null; s.call = null; s.accountOpen = false; s.modal = null; s.staffAuthed = false; });
}

export function signOutSession(id: string) {
  const sess = get().sessions.find(x => x.id === id);
  if (!sess || sess.current) return;
  ask({ title: msg('Sign out {name}?'), vars: { name: sess.name }, body: msg('That device will need to sign in again.'), confirmLabel: msg('Sign out'), tone: 'danger', onConfirm: () => {
    update(s => { s.sessions = s.sessions.filter(x => x.id !== id); });
    toast('Signed out {name}', { vars: { name: sess.name } });
  } });
}
export function signOutOthers() {
  ask({ title: msg('Sign out all other devices?'), body: msg('Every device except this browser will need to sign in again.'), confirmLabel: msg('Sign out others'), tone: 'danger', onConfirm: () => {
    update(s => { s.sessions = s.sessions.filter(x => x.current); });
    toast('Signed out of all other devices');
  } });
}

/** Local demo export: a JSON file of this session's fictional records, clearly labelled. */
export function exportData() {
  const s = get();
  const me = s.users[ME]!;
  const data = {
    notice: 'Ghar frontend demo export. Contains fictional sample data from this browser session only. No server data exists.',
    exportedAt: new Date().toISOString(),
    profile: { name: me.name, username: me.handle, bio: me.bio, city: me.city, ageGroup: s.ageGroup },
    preferences: s.prefs,
    friends: s.friends.map(id => s.users[id]?.handle),
    relationships: s.relationships,
    usernameHistory: s.usernameHistory,
    transactions: s.transactions.map(t => ({ ...t, amountPkr: t.amountPaisa / 100 })),
    popularityEvents: s.popularity.filter(e => e.recipient === ME && e.source !== 'legacy'),
    stories: s.stories.filter(x => x.owner === ME).map(x => ({ id: x.id, createdAt: x.createdAt, audience: x.audience })),
  };
  download(`ghar-demo-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
  toast('Demo export downloaded');
}
export function download(name: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function deleteAccountDemo() {
  logout();
  toast('Demo account deleted from this browser session. Nothing existed on a server.', { tone: 'info' });
}

/** Sign-up username pick: sets the first handle without using a change from the 14-day window. */
export function pickInitialUsername(name: string) {
  const n = name.trim().replace(/^@/, '').toLowerCase();
  update(s => { const me = s.users[ME]; if (me) me.handle = n; s.authStep = 'phone'; });
}
/** Onboarding interests are kept only in session state to rank suggestions. */
export function setInterests(list: string[]) { update(s => { s.interests = list; }); }
