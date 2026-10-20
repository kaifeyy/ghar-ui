import { NO_FILTERS } from '@/domain/chatSearch';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Draft } from 'immer';
import type { AppState, Prefs } from './types';
import { USERS, BADGES, USERNAME_HISTORY, USERNAME_HOLDS, RESERVED_NAMES, BOOT } from '@/fixtures/users';
import { SERVERS, CHANNELS, JOINED, DIRECTORY } from '@/fixtures/communities';
import { CHANNEL_MESSAGES, THREADS, FORUM_POSTS, CONVERSATIONS, VOICE_OCCUPANCY, STAGE } from '@/fixtures/messages';
import { FRIENDS, CLOSE_FRIENDS, FRIEND_REQUESTS, BLOCKED, RELATIONSHIPS, USER_LOGS, CALLS, INBOX, STORIES, HIGHLIGHTS, EVENTS, RSVPS } from '@/fixtures/social';
import { POPULARITY_EVENTS, ACTIVITY_RECORDS } from '@/fixtures/popularity';
import { TRANSACTIONS, OWNED, PAYOUTS } from '@/fixtures/commerce';
import { TICKETS, MOD_CASES, AUDIT, BOTS, WEBHOOKS, SOCIAL_LINKS, DEV_APPS, INVITES, BRIDGES, defaultPortal } from '@/fixtures/portal';
import { APPLICATIONS, REPORTS, BANS, EXPERT_TICKETS, DECOYS, ASSESSMENTS, STAFF_AUDIT } from '@/fixtures/staff';
import { HOUR, DAY } from '@/domain/time';

const clone = <T,>(x: T): T => structuredClone(x);

export const DEFAULT_PREFS: Prefs = {
  theme: 'dark', lang: 'en', accent: null, skin: 'th-graphite', chatStyle: 'rows', bubble: 'default', appIcon: 'ic-mono',
  reduceMotion: null, largeText: false, lowData: false, widths: { side: 288, right: 272 }, collapsed: {}, lastSettings: 'account',
  notif: { mentions: true, dms: true, replies: true, friends: true, events: true, prayer: true, gifts: false },
  mutedServers: {}, mutedChannels: { 'tc-memes': true },
  privacy: { dmsFromNonFriends: true, lastSeen: true, showConnections: true, flag: true, hideIp: false, warnVideo: true, effects: true },
  prayer: { city: 'Lahore', method: 'karachi', on: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: false }, azaan: true },
  storyAudienceDefault: 'friends',
};

function initialReadAt(): Record<string, number> {
  // everything read except a few channels, so unread and mention states are visible
  const r: Record<string, number> = {};
  for (const c of CHANNELS) r[c.id] = BOOT;
  r['tc-general'] = BOOT - 70 * 60_000;
  r['tc-ann'] = BOOT - 8 * HOUR;
  r['kd-feed'] = BOOT - 8 * HOUR;
  r['tc-help'] = BOOT - 2 * HOUR;
  return r;
}

function initialState(): AppState {
  const servers = Object.fromEntries(SERVERS.map(s => [s.id, clone(s)]));
  const channels = Object.fromEntries(CHANNELS.map(c => [c.id, clone(c)]));
  const portal = Object.fromEntries(SERVERS.map(s => {
    const firstText = CHANNELS.find(c => c.serverId === s.id && c.type === 'text')?.id ?? '';
    return [s.id, defaultPortal(s.id, firstText)];
  }));
  const snapshots = SERVERS.filter(s => s.id === 'tc').map(s => ({
    id: 'snap-' + s.id, serverId: s.id, at: BOOT - 2 * HOUR, roles: clone(s.roles), categories: clone(s.categories),
    channels: CHANNELS.filter(c => c.serverId === s.id).map(clone),
  }));
  return {
    now: Date.now(),
    route: { name: 'inbox' },
    history: [],
    authed: false,
    authStep: 'login',
    emailVerified: true,
    interests: [],
    phoneVerified: false,
    dob: '2001-04-12',
    ageGroup: 'adult',
    staffAuthed: false,
    chatSearch: { ...NO_FILTERS },
    jump: null,
    suspensions: {},
    serviceChecks: {},
    sessions: [
      { id: 's1', name: 'This browser', detail: 'Chrome on Windows · Lahore', current: true, lastActive: BOOT },
      { id: 's2', name: 'Android phone', detail: 'Ghar for Android · Lahore', current: false, lastActive: BOOT - 2 * DAY },
      { id: 's3', name: 'Old laptop', detail: 'Safari on macOS · Karachi', current: false, lastActive: BOOT - 21 * DAY },
    ],
    manualPresence: 'online',
    lastInputAt: Date.now(),
    customStatus: { text: 'Exams till Friday', emoji: '📚' },
    net: 'online',
    users: Object.fromEntries(USERS.map(u => [u.id, clone(u)])),
    badgeCatalog: clone(BADGES),
    friends: [...FRIENDS], closeFriends: [...CLOSE_FRIENDS], requests: clone(FRIEND_REQUESTS), blocked: [...BLOCKED],
    relationships: clone(RELATIONSHIPS), userLogs: clone(USER_LOGS), calls: clone(CALLS), inbox: clone(INBOX),
    usernameHistory: clone(USERNAME_HISTORY), usernameHolds: clone(USERNAME_HOLDS), reserved: clone(RESERVED_NAMES),
    servers, channels, joined: [...JOINED], directory: clone(DIRECTORY),
    messages: clone(CHANNEL_MESSAGES), threads: Object.fromEntries(THREADS.map(t => [t.id, clone(t)])), forum: clone(FORUM_POSTS),
    conversations: Object.fromEntries(CONVERSATIONS.map(c => [c.id, clone(c)])),
    unlocked: {}, readAt: initialReadAt(), events: clone(EVENTS), rsvps: { ...RSVPS }, voiceOccupancy: clone(VOICE_OCCUPANCY),
    stage: { ...clone(STAGE), handRaised: false, drawers: ['bilal'] },
    voice: null, call: null,
    audio: { micMuted: false, deafened: false, micBeforeDeafen: null, camera: false, share: false, inputDevice: 'Default microphone', outputDevice: 'Default speakers', pushToTalk: false, noiseSuppression: true },
    ipWarningSeen: false,
    popularity: clone(POPULARITY_EVENTS), activity: clone(ACTIVITY_RECORDS),
    transactions: clone(TRANSACTIONS), owned: [...OWNED], equipped: { theme: 'th-graphite', nameplate: 'np-minimal', icon: 'ic-mono' },
    titles: ['night-owl', 'study-machine'], plusUntil: null, payouts: clone(PAYOUTS), kyc: 'none', nextOutcome: 'success', payment: { phase: 'idle' },
    stories: clone(STORIES), highlights: clone(HIGHLIGHTS), storyViewer: null,
    portal, tickets: clone(TICKETS), modCases: clone(MOD_CASES), serverBans: { tc: [{ userId: 'spam.account22', label: 'spam.account22', reason: 'Scam links', at: BOOT - 5 * DAY }] }, audit: clone(AUDIT), snapshots,
    bots: clone(BOTS), webhooks: clone(WEBHOOKS), socialLinks: clone(SOCIAL_LINKS), devApps: clone(DEV_APPS), invites: clone(INVITES), bridges: clone(BRIDGES),
    applications: clone(APPLICATIONS), myApplicationId: null, reports: clone(REPORTS), bans: clone(BANS), expertTickets: clone(EXPERT_TICKETS),
    decoys: clone(DECOYS), assessments: clone(ASSESSMENTS), staffAudit: clone(STAFF_AUDIT),
    media: {}, mood: { today: null, history: ['meh', 'low', 'meh', 'okay', 'good', 'great'] }, supportCard: {},
    prefs: loadPrefs(),
    rightPanel: null, threadKey: null, drawerOpen: false, accountOpen: false, modal: null, modalStack: [], confirm: null, toasts: [],
    drafts: {}, replyTo: {}, recapOpen: false, devOpen: false, settingsQuery: '', loading: {}, failNextLoad: false, failNextSave: false,
  };
}

/* ---------- persistence: preferences and presence choice only ---------- */
const KEY = 'ghar.ts.v1';
const memory: Record<string, string> = {};
function read(): string | null { try { return localStorage.getItem(KEY); } catch { return memory[KEY] ?? null; } }
function write(v: string) { try { localStorage.setItem(KEY, v); } catch { memory[KEY] = v; } }

function loadPrefs(): Prefs {
  try {
    const raw = read();
    if (!raw) return clone(DEFAULT_PREFS);
    const parsed = JSON.parse(raw) as { prefs?: Partial<Prefs> };
    return { ...clone(DEFAULT_PREFS), ...(parsed.prefs ?? {}) } as Prefs;
  } catch { return clone(DEFAULT_PREFS); }
}
function loadPresence(): Pick<AppState, 'manualPresence' | 'customStatus'> | null {
  try { const raw = read(); if (!raw) return null; const p = JSON.parse(raw) as { presence?: Pick<AppState, 'manualPresence' | 'customStatus'> }; return p.presence ?? null; } catch { return null; }
}

export const useApp = create<AppState>()(immer(() => {
  const s = initialState();
  const p = loadPresence();
  if (p) { s.manualPresence = p.manualPresence; s.customStatus = p.customStatus; }
  return s;
}));

let saveTimer: ReturnType<typeof setTimeout> | undefined;
useApp.subscribe((s, prev) => {
  if (s.prefs === prev.prefs && s.manualPresence === prev.manualPresence && s.customStatus === prev.customStatus) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // Only preferences and the presence choice. Demo records reset on reload by design.
    write(JSON.stringify({ prefs: s.prefs, presence: { manualPresence: s.manualPresence, customStatus: s.customStatus } }));
  }, 150);
});

export function update(fn: (draft: Draft<AppState>) => void) { useApp.setState(fn); }
export const get = () => useApp.getState();
export function resetDemo() { useApp.setState(() => ({ ...initialState(), prefs: get().prefs, authed: true })); }
export const EMPTY: never[] = [];
