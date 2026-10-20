// Domain models for the Ghar frontend. Everything here is local/fictional demo data;
// none of these types imply a backend, encryption, verified identity or real payments.

export type UserId = string;
export type ServerId = string;
export type ChannelId = string;
export type MessageId = string;
export type RoleId = string;
export type ConvId = string;
export type GiftId = string;
export type BadgeId =
  | 'team' | 'dev' | 'mod' | 'beta' | 'organizer' | 'creator' | 'advisor' | 'affiliate' | 'early' | (string & {});

/* ---------------- presence, activity, network (three separate concepts) ---------------- */

/** What the current user chooses. */
export type ManualPresence = 'online' | 'idle' | 'dnd' | 'invisible';
/** What everyone else is shown as. Invisible users and disconnected users both read "offline". */
export type ShownPresence = 'online' | 'idle' | 'dnd' | 'offline';
export type IdleReason = 'manual' | 'afk';

export type ActivityKind = 'studying' | 'listening' | 'playing' | 'hosting' | 'coding';
export interface Activity {
  kind: ActivityKind;
  label: string;
  with?: UserId[];
  /** Where a "Join" button leads, if joinable. */
  join?: { serverId: ServerId; channelId: ChannelId };
  since?: number;
}

export interface CustomStatus {
  text: string;
  emoji?: string;
  /** epoch ms; undefined = never clears */
  expiresAt?: number;
}

export type NetState = 'online' | 'reconnecting' | 'offline';

/* ---------------- users and profiles ---------------- */

export type AgeGroup = 'adult' | 'minor';
export type BannerStyle = 'auto' | 'study' | 'gaming' | 'jobs' | 'fun' | 'islamic' | 'cities';

export interface User {
  id: UserId;
  name: string;
  handle: string;
  color: string;
  presence: ShownPresence;
  activity?: Activity;
  customStatus?: CustomStatus;
  lastSeenAt?: number;
  hideLastSeen?: boolean;
  titleId?: string;
  badges: BadgeId[];
  bio?: string;
  city: string;
  song?: string;
  joinedAt: string; // ISO date
  flag?: string; // e.g. 'PK' or 'Lahore'
  bot?: boolean;
  bannerStyle?: BannerStyle;
}

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  image?: string;
  icon?: string;
  animated?: boolean;
  staffOnly?: boolean;
}

export interface Title {
  id: string;
  name: string;
  source: 'earned' | 'bought';
  pricePkr?: number;
}

/* ---------------- usernames ---------------- */

export interface UsernameChange {
  oldName: string;
  newName: string;
  changedAt: number;
}
export interface UsernameHold {
  name: string;
  previousOwner: UserId;
  heldUntil: number;
}
export interface ReservedName {
  name: string;
  category: 'artist' | 'politician' | 'brand' | 'team';
  note?: string;
}

/* ---------------- social ---------------- */

export type RelationshipType = 'partner' | 'best-friend' | 'sibling' | 'friend' | 'cousin' | 'mentor';
export type RelationshipState = 'pending-out' | 'pending-in' | 'accepted' | 'declined';
export interface Relationship {
  id: string;
  type: RelationshipType;
  with: UserId;
  state: RelationshipState;
  /** my side's visibility on my profile */
  visible: boolean;
  createdAt: number;
}

export interface FriendRequest {
  userId: UserId;
  direction: 'in' | 'out';
  at: number;
  mutual?: number;
}

export type UserLogKind = 'unfriended-by' | 'left-server';
export interface UserLogEntry {
  id: string;
  kind: UserLogKind;
  ref: string; // userId or serverId
  at: number;
  resolved?: boolean;
}

export interface CallRecord {
  id: string;
  convId: ConvId;
  participants: UserId[];
  video: boolean;
  direction: 'in' | 'out';
  missed: boolean;
  startedAt: number;
  durationSec: number;
}

/* ---------------- stories ---------------- */

export type StoryAudience = 'everyone' | 'friends' | 'close' | 'custom';
export interface Story {
  id: string;
  owner: UserId;
  /** Either an in-memory object URL (own uploads, never persisted) or a generated art seed. */
  image: { kind: 'art'; seed: string; color: string; caption?: string } | { kind: 'local'; url: string; caption?: string };
  createdAt: number;
  expiresAt: number;
  audience: StoryAudience;
  customIds: UserId[];
  hiddenFrom: UserId[];
  viewers: { userId: UserId; at: number }[];
  likedBy: UserId[];
}
export interface Highlight {
  id: string;
  owner: UserId;
  name: string;
  storyIds: string[];
}

/* ---------------- communities ---------------- */

export type CommunityCategory = 'Gaming' | 'Study' | 'Jobs' | 'Local cities' | 'Islamic' | 'Fun';
export type ChannelType = 'text' | 'voice' | 'stage' | 'forum' | 'announcement';
export type ChannelIcon = { kind: 'icon'; name: import('@/ui/ChannelIcons').ChannelIconName } | { kind: 'upload'; url: string };
export type ChannelLock =
  | { kind: 'role'; roleId: RoleId }
  | { kind: 'password'; hint: string }
  | { kind: 'payment'; pricePkr: number };
export type ChannelWidget = 'cricket' | 'mood' | 'pomodoro' | 'whiteboard' | 'helplines' | 'events';

export interface Channel {
  id: ChannelId;
  serverId: ServerId;
  name: string;
  type: ChannelType;
  topic?: string;
  icon?: ChannelIcon;
  lock?: ChannelLock;
  widget?: ChannelWidget;
  live?: boolean; // stage with camera/screen stream (EVT-02)
  slowModeSec?: number;
  bridge?: { serverId: ServerId; channelId: ChannelId; serverName: string };
}

export interface ChannelCategory {
  id: string;
  name: string;
  channelIds: ChannelId[];
}

export type Permission =
  | 'manageServer' | 'manageRoles' | 'manageChannels' | 'manageDeveloperPortal' | 'kick' | 'ban' | 'timeout'
  | 'manageMessages' | 'mentionEveryone' | 'sendMessages' | 'speak' | 'stream' | 'viewAudit';

export interface RoleCategory { id: string; name: string }
export interface Role {
  id: RoleId;
  name: string;
  color1: string;
  color2?: string; // gradient end (COM-08)
  categoryId: string;
  /** lower number = higher in hierarchy; owner is 0 */
  position: number;
  permissions: Permission[];
  system?: 'owner' | 'everyone';
}

export interface Member {
  userId: UserId;
  roleIds: RoleId[];
  joinedAt: number;
  timeoutUntil?: number;
  warnings: number;
}

export interface Server {
  id: ServerId;
  name: string;
  color: string;
  category: CommunityCategory;
  city: string;
  languages: string[];
  description: string;
  owner: UserId;
  kind: 'server' | 'room';
  approved: boolean;
  e2ee?: boolean;
  members: number;
  online: number;
  xp: number;
  bannerStyle: BannerStyle;
  accent?: string;
  categories: ChannelCategory[];
  roleCategories: RoleCategory[];
  roles: Role[];
  memberList: Member[];
  emoji: CustomEmoji[];
  stickers: CustomEmoji[];
  sponsor?: { name: string; until: string };
  effectsEnabled: boolean;
  whisperEnabled: boolean;
}

export interface CustomEmoji {
  id: string;
  name: string;
  /** generated glyph or an in-memory upload */
  art: { kind: 'glyph'; glyph: string; color: string } | { kind: 'local'; url: string };
  by: UserId;
}

/* ---------------- messages ---------------- */

export type Delivery = 'sent' | 'sending' | 'queued' | 'failed';
export type Attachment =
  | { kind: 'image'; name: string; seed: string; url?: string }
  | { kind: 'file'; name: string; size: string }
  | { kind: 'voice'; seconds: number }
  | { kind: 'sticker'; id: string };

export interface Message {
  id: MessageId;
  author: UserId;
  text: string;
  at: number;
  editedAt?: number;
  attachments: Attachment[];
  reactions: Record<string, UserId[]>;
  replyTo?: MessageId;
  threadId?: string;
  pinned?: boolean;
  delivery: Delivery;
  system?: boolean;
  origin?: string; // bridged message origin server name
  link?: { host: string; title: string; description: string };
}

export interface Thread {
  id: string;
  channelId: ChannelId;
  parentId: MessageId;
  messages: Message[];
  lastReadAt: number;
}

export interface ForumPost {
  id: string;
  channelId: ChannelId;
  title: string;
  author: UserId;
  tags: string[];
  body: string;
  replies: Message[];
  at: number;
}

export interface Conversation {
  id: ConvId;
  kind: 'dm' | 'group';
  members: UserId[]; // excluding me for dm; includes everyone for group
  name?: string;
  e2ee: boolean;
  messages: Message[];
  /** DM deletion removes only from my view (MSG-08) */
  hiddenForMe: MessageId[];
  lastReadAt: number;
}

/* ---------------- calls & voice (discriminated) ---------------- */

export type CallState =
  | { phase: 'ringing'; since: number }
  | { phase: 'connecting'; since: number }
  | { phase: 'connected'; since: number }
  | { phase: 'ended'; reason: 'hangup' | 'declined' | 'no-answer' | 'failed' | 'mic-blocked'; at: number };

export interface Call {
  id: string;
  convId: ConvId;
  participants: UserId[];
  direction: 'in' | 'out';
  state: CallState;
  video: boolean;
  share: boolean;
}

export type VoiceState =
  | { phase: 'connecting'; channelId: ChannelId; since: number }
  | { phase: 'connected'; channelId: ChannelId; since: number }
  | { phase: 'reconnecting'; channelId: ChannelId; since: number };

export interface AudioState {
  micMuted: boolean;
  deafened: boolean;
  /** mic state captured when deafen was switched on, restored on undeafen */
  micBeforeDeafen: boolean | null;
  camera: boolean;
  share: boolean;
  inputDevice: string;
  outputDevice: string;
  pushToTalk: boolean;
  noiseSuppression: boolean;
}

/* ---------------- popularity & rankings ---------------- */

export type PopularitySource = 'message' | 'voice' | 'reaction' | 'event' | 'gift' | 'purchase' | 'legacy';

export interface PopularityEvent {
  id: string;
  recipient: UserId;
  sender?: UserId;
  at: number;
  source: PopularitySource;
  points: number;
  serverId?: ServerId;
  giftId?: GiftId;
  quantity?: number;
  /** true when the points originate from a payment (purchased points or paid gifts) */
  paid: boolean;
  note?: string;
}

export interface Gift {
  id: GiftId;
  name: string;
  points: number;
  pricePkr: number; // 0 = free daily gift
  art: 'chai' | 'heart' | 'rose' | 'star' | 'crown' | 'rocket';
  dailyFree?: number;
}

export interface ActivityRecord {
  userId: UserId;
  serverId: ServerId;
  day: string; // YYYY-MM-DD in Asia/Karachi
  messages: number;
  voiceMinutes: number;
  studyMinutes: number;
}

export type BoardMetric = 'popularity' | 'messages' | 'voice' | 'study';
export type BoardScope = 'global' | 'city' | 'server' | 'friends';
export type BoardPeriod = 'daily' | 'weekly' | 'all';

/* ---------------- money ---------------- */

export type PaymentOutcome = 'success' | 'failure' | 'pending' | 'cancel';
export type TxStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
export type TxKind = 'topup' | 'gift' | 'points' | 'shop' | 'plus' | 'tip' | 'donation' | 'unlock' | 'sponsor' | 'payout' | 'tip-in' | 'refund';

export interface Transaction {
  id: string;
  at: number;
  kind: TxKind;
  description: string;
  /** signed paisa (integers only); negative = money out of the wallet */
  amountPaisa: number;
  status: TxStatus;
  feePaisa?: number;
  /** what this payment grants, revoked on refund */
  grants?: Entitlement;
  provider: 'test-gateway' | 'wallet';
  /** how it was paid, e.g. "Ghar wallet" or "JazzCash (simulated)" */
  method?: string;
}

export type Entitlement =
  | { kind: 'popularity-event'; eventId: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'plus'; until: number }
  | { kind: 'channel'; channelId: ChannelId }
  | { kind: 'title'; titleId: string };

export type PaymentFlow =
  | { phase: 'idle' }
  | { phase: 'confirm' }
  | { phase: 'processing'; intentId: string }
  | { phase: 'pending'; intentId: string; txId: string }
  | { phase: 'succeeded'; txId: string }
  | { phase: 'failed'; reason: string; vars?: Record<string, string | number> }
  | { phase: 'cancelled' };

export interface ShopItem {
  id: string;
  name: string;
  kind: 'theme' | 'nameplate' | 'decoration' | 'banner' | 'effect' | 'bubble' | 'icon' | 'title' | 'name-effect';
  pricePkr: number;
  preview: string; // color or seed
}

/* ---------------- moderation & portal ---------------- */

export type ModAction = 'warn' | 'timeout' | 'kick' | 'ban' | 'remove-messages' | 'unban' | 'untimeout';
export interface ModCase {
  id: string;
  serverId: ServerId;
  memberId: UserId;
  action: ModAction;
  reason: string;
  by: UserId;
  at: number;
  detail?: string;
}

export interface AuditEntry {
  id: string;
  serverId: ServerId;
  actor: UserId;
  action: string;
  target?: string;
  at: number;
}

export type TicketState = 'open' | 'claimed' | 'closed';
export interface Ticket {
  id: string;
  serverId: ServerId;
  number: number;
  opener: UserId;
  subject: string;
  claimedBy?: UserId;
  state: TicketState;
  messages: Message[];
  createdAt: number;
  closedAt?: number;
}

export interface Snapshot {
  id: string;
  serverId: ServerId;
  at: number;
  roles: Role[];
  categories: ChannelCategory[];
  channels: Channel[];
}

/* ---------------- reports ---------------- */

export type ReportReason = 'spam' | 'harassment' | 'hate' | 'self-harm' | 'scam' | 'sexual' | 'minor-safety' | 'other';
export type ProofState = 'verified' | 'unverified' | 'not-applicable' | 'forged';
export interface Report {
  id: string;
  kind: 'user' | 'message' | 'server';
  reason: ReportReason;
  reporter: UserId;
  target: string;
  title: string;
  where: string;
  at: number;
  encrypted: boolean;
  /** fixture-specific evidence; proof outcome is a labelled simulation */
  evidence: { author: UserId; text: string; at: number; proof: ProofState; reported?: boolean }[];
  priority: boolean;
  status: 'open' | 'dismissed' | 'warned' | 'suspended' | 'banned' | 'server-removed';
}

/* ---------------- settings ---------------- */

export type SettingsSection =
  | 'account' | 'profile' | 'privacy' | 'devices' | 'appearance' | 'language' | 'voice' | 'notifications'
  | 'prayer' | 'wallet' | 'payouts' | 'plus' | 'shop' | 'titles' | 'moderator' | 'connections';

export type ServerSettingsSection =
  | 'overview' | 'roles' | 'channels' | 'members' | 'emoji' | 'invites' | 'events' | 'levels' | 'analytics' | 'bridge'
  | 'sponsor' | 'tickets' | 'welcome' | 'automod' | 'moderation' | 'antinuke' | 'logs' | 'audit' | 'bots' | 'integrations' | 'apps'
  | 'expert' | 'delete';

export type ThemeMode = 'dark' | 'light' | 'system';
export type Lang = 'en' | 'ur' | 'ar' | 'hi';

/* ---------------- async status helper ---------------- */
export type Async<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
