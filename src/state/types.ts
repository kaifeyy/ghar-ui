import type {
  AgeGroup, AudioState, Call, CallRecord, Channel, Conversation, CustomStatus, ForumPost, FriendRequest, Highlight, Lang, ManualPresence,
  Message, ModCase, NetState, PaymentFlow, PaymentOutcome, PopularityEvent, Relationship, Report, ReservedName, Server, ServerSettingsSection,
  SettingsSection, Snapshot, Story, ThemeMode, Thread, Ticket, Transaction, User, UserLogEntry, UsernameChange, UsernameHold, VoiceState, AuditEntry,
  ActivityRecord, Badge, StoryAudience,
} from '@/types/models';
import type { InboxItem, GharEvent } from '@/fixtures/social';
import type { PortalConfig, Bot, Webhook, DevApp, Invite, BridgeLink } from '@/fixtures/portal';
import type { SocialLink } from '@/domain/social';
import type { ServerApplication, PlatformBan, ExpertTicket, Decoy, Assessment, StaffAudit } from '@/fixtures/staff';
import type { Key, Vars } from '@/i18n';
import type { DirectoryEntry } from '@/fixtures/communities';
import type { Payout } from '@/fixtures/commerce';

export type FriendsTab = 'online' | 'all' | 'pending' | 'blocked';
export type StaffSection = 'dashboard' | 'users' | 'integrations' | 'applications' | 'reports' | 'bans' | 'badges' | 'certification' | 'reserved' | 'expert' | 'decoys' | 'audit';

export type Route =
  | { name: 'inbox' }
  | { name: 'search' }
  | { name: 'friends'; tab: FriendsTab }
  | { name: 'dm'; convId: string }
  | { name: 'calls' }
  | { name: 'logs' }
  | { name: 'communities' }
  | { name: 'popularity' }
  | { name: 'leaderboards' }
  | { name: 'relationships' }
  | { name: 'channel'; serverId: string; channelId: string }
  | { name: 'events'; serverId: string }
  | { name: 'discover'; cat: string }
  | { name: 'profile'; userId: string }
  | { name: 'settings'; section: SettingsSection | null }
  | { name: 'serverSettings'; serverId: string; section: ServerSettingsSection | null }
  | { name: 'staff'; section: StaffSection };

export type RightPanel = null | 'members' | 'thread' | 'search' | 'pins';

export type ModalState =
  | { kind: 'gift'; to: string; serverId?: string }
  | { kind: 'buyPoints' }
  | { kind: 'addMoney' }
  | { kind: 'shop'; itemId: string }
  | { kind: 'plus' }
  | { kind: 'unlock'; channelId: string }
  | { kind: 'tip'; to: string }
  | { kind: 'donate'; serverId: string }
  | { kind: 'sponsor'; serverId: string }
  | { kind: 'report'; target: { kind: 'message'; scope: 'channel' | 'dm'; key: string; messageId: string } | { kind: 'user'; userId: string } | { kind: 'server'; serverId: string } }
  | { kind: 'relationship'; with?: string }
  | { kind: 'postStory' }
  | { kind: 'storyAudience'; storyId: string }
  | { kind: 'highlight'; storyId: string }
  | { kind: 'createCommunity' }
  | { kind: 'apply' }
  | { kind: 'allCommunities' }
  | { kind: 'quick' }
  | { kind: 'createChannel'; serverId: string; categoryId?: string }
  | { kind: 'editChannel'; channelId: string }
  | { kind: 'createEvent'; serverId: string }
  | { kind: 'event'; eventId: string }
  | { kind: 'newPost'; channelId: string }
  | { kind: 'post'; postId: string }
  | { kind: 'groupDm'; convId?: string }
  | { kind: 'incomingCall'; convId: string }
  | { kind: 'ipWarning'; then: 'video' | 'share' }
  | { kind: 'externalLink'; href: string }
  | { kind: 'editMessage'; scope: 'channel' | 'dm' | 'thread'; key: string; messageId: string }
  | { kind: 'profileMedia'; which: 'avatar' | 'banner' }
  | { kind: 'deleteAccount' }
  | { kind: 'password' }
  | { kind: 'verifyPhone' }
  | { kind: 'payoutKyc' }
  | { kind: 'moderate'; serverId: string; userId: string; action: 'warn' | 'timeout' | 'kick' | 'ban' | 'remove-messages' }
  | { kind: 'emojiUpload'; serverId: string; type: 'emoji' | 'sticker' }
  | { kind: 'bridgeRequest'; serverId: string }
  | { kind: 'expertRequest'; serverId: string }
  | { kind: 'joinInvite' }
  | { kind: 'memberCard'; serverId: string; userId: string }
  | { kind: 'connectSocial'; owner: string; platform: import('@/domain/social').SocialPlatform };

export interface ConfirmState {
  title: Key;
  body: Key;
  vars?: Vars;
  confirmLabel: Key;
  tone: 'danger' | 'primary';
  typed?: string;
  onConfirm: () => void;
}

export interface Toast { id: number; text: Key; vars?: Vars; tone: 'ok' | 'info' | 'warn' | 'error'; undo?: () => void }

export interface Prefs {
  theme: ThemeMode;
  lang: Lang;
  accent: string | null;
  skin: string; // shop theme id
  chatStyle: 'rows' | 'bubbles';
  bubble: string;
  appIcon: string;
  reduceMotion: boolean | null; // null = follow OS
  largeText: boolean;
  lowData: boolean;
  widths: { side: number; right: number };
  collapsed: Record<string, boolean>;
  lastSettings: SettingsSection;
  notif: Record<'mentions' | 'dms' | 'replies' | 'friends' | 'events' | 'prayer' | 'gifts', boolean>;
  mutedServers: Record<string, boolean>;
  mutedChannels: Record<string, boolean>;
  privacy: { dmsFromNonFriends: boolean; lastSeen: boolean; showConnections: boolean; flag: boolean; hideIp: boolean; warnVideo: boolean; effects: boolean };
  prayer: { city: string; method: 'karachi' | 'hanafi' | 'isna' | 'mwl'; on: Record<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', boolean>; azaan: boolean };
  storyAudienceDefault: StoryAudience;
}

export interface AppState {
  now: number;
  route: Route;
  history: Route[];
  // session & persona (demo)
  authed: boolean;
  authStep: 'login' | 'signup' | 'verify-email' | 'phone' | 'otp' | 'username' | 'young' | 'reset' | 'onboarding';
  emailVerified: boolean;
  interests: string[];
  phoneVerified: boolean;
  dob: string;
  ageGroup: AgeGroup;
  staffAuthed: boolean;
  /** global chat search filters, kept while navigating */
  chatSearch: import('@/domain/chatSearch').ChatFilters;
  /** a message to scroll to and highlight once its conversation is open */
  jump: { key: string; id: string } | null;
  /** staff-applied account suspensions (demo) */
  suspensions: Record<string, { until: number | null; reason: string; at: number }>;
  /** last simulated health check per platform service */
  serviceChecks: Record<string, { at: number; ok: boolean }>;
  sessions: { id: string; name: string; detail: string; current: boolean; lastActive: number }[];
  // presence (separate from network and activity)
  manualPresence: ManualPresence;
  lastInputAt: number;
  customStatus?: CustomStatus;
  net: NetState;
  // people
  users: Record<string, User>;
  badgeCatalog: Badge[];
  friends: string[];
  closeFriends: string[];
  requests: FriendRequest[];
  blocked: string[];
  relationships: Relationship[];
  userLogs: UserLogEntry[];
  calls: CallRecord[];
  inbox: InboxItem[];
  // usernames
  usernameHistory: UsernameChange[];
  usernameHolds: UsernameHold[];
  reserved: ReservedName[];
  // communities
  servers: Record<string, Server>;
  channels: Record<string, Channel>;
  joined: string[];
  directory: DirectoryEntry[];
  messages: Record<string, Message[]>;
  threads: Record<string, Thread>;
  forum: ForumPost[];
  conversations: Record<string, Conversation>;
  unlocked: Record<string, boolean>;
  readAt: Record<string, number>;
  events: GharEvent[];
  rsvps: Record<string, 'going' | 'interested'>;
  voiceOccupancy: Record<string, string[]>;
  stage: { speakers: string[]; queue: string[]; listeners: number; handRaised: boolean; drawers: string[] };
  // voice / calls
  voice: VoiceState | null;
  call: Call | null;
  audio: AudioState;
  ipWarningSeen: boolean;
  // popularity
  popularity: PopularityEvent[];
  activity: ActivityRecord[];
  // money
  transactions: Transaction[];
  owned: string[];
  equipped: Record<string, string>;
  titles: string[];
  plusUntil: number | null;
  payouts: Payout[];
  /** creator verification outcome only — identity document contents are never stored */
  kyc: 'none' | 'pending' | 'approved' | 'rejected';
  nextOutcome: PaymentOutcome;
  payment: PaymentFlow;
  // stories
  stories: Story[];
  highlights: Highlight[];
  storyViewer: { owner: string; index: number; highlightId?: string } | null;
  // portal
  portal: Record<string, PortalConfig>;
  tickets: Ticket[];
  modCases: ModCase[];
  serverBans: Record<string, { userId: string; label: string; reason: string; at: number }[]>;
  audit: AuditEntry[];
  snapshots: Snapshot[];
  bots: Bot[];
  webhooks: Webhook[];
  /** linked social profiles keyed by user id or `server:<id>` (demo, unverified) */
  socialLinks: Record<string, SocialLink[]>;
  devApps: DevApp[];
  invites: Invite[];
  bridges: BridgeLink[];
  // staff & applications
  applications: ServerApplication[];
  myApplicationId: string | null;
  reports: Report[];
  bans: PlatformBan[];
  expertTickets: ExpertTicket[];
  decoys: Decoy[];
  assessments: Assessment[];
  staffAudit: StaffAudit[];
  // profile media (in-memory object URLs only; never persisted)
  media: { avatar?: string; banner?: string };
  mood: { today: string | null; history: string[] };
  supportCard: Record<string, boolean>; // fictional session data, never persisted
  // ui
  prefs: Prefs;
  rightPanel: RightPanel;
  threadKey: string | null;
  drawerOpen: boolean;
  accountOpen: boolean;
  modal: ModalState | null;
  modalStack: ModalState[];
  confirm: ConfirmState | null;
  toasts: Toast[];
  drafts: Record<string, string>;
  replyTo: Record<string, string | undefined>;
  recapOpen: boolean;
  devOpen: boolean;
  settingsQuery: string;
  loading: Record<string, 'loading' | 'error' | 'ready'>;
  failNextLoad: boolean;
  failNextSave: boolean;
}
