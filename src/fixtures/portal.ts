import type { AuditEntry, ModCase, Ticket, Message } from '@/types/models';
import type { AutomodConfig } from '@/domain/automod';
import { DAY, HOUR, MIN } from '@/domain/time';
import { rng } from '@/domain/rng';
import { ago } from './users';

export interface TicketConfig { enabled: boolean; panelChannelId: string; staffRoleId: string; transcripts: boolean; greeting: string }
export interface WelcomeConfig { enabled: boolean; channelId: string; message: string; dm: boolean; dmMessage: string; autoRoleId: string; rulesGate: boolean; rules: string }
export interface LogsConfig { channelId: string; events: Record<'joins' | 'leaves' | 'edits' | 'deletes' | 'roles' | 'channels' | 'voice' | 'moderation', boolean> }
export interface AntiNukeConfig { enabled: boolean; channelDeletes: number; bans: number; windowSec: number; exemptAdmins: boolean; frozen: boolean; alert?: string }
export interface PortalConfig { tickets: TicketConfig; welcome: WelcomeConfig; automod: AutomodConfig; logs: LogsConfig; antinuke: AntiNukeConfig }

export function defaultPortal(serverId: string, firstText: string): PortalConfig {
  return {
    tickets: { enabled: true, panelChannelId: firstText, staffRoleId: `${serverId}-mod`, transcripts: true, greeting: 'Thanks for reaching out. A moderator will reply here soon.' },
    welcome: { enabled: true, channelId: firstText, message: 'Welcome {user}! Read #rules and say salam.', dm: false, dmMessage: 'Welcome to {server}. Rules are pinned in #rules.', autoRoleId: `${serverId}-lvl-1`, rulesGate: true, rules: 'Be kind. No spam. No exam leaks. Report problems.' },
    automod: { words: ['scam', 'bakwas link'], wordAction: 'delete', blockLinks: false, allowedHosts: ['github.com', 'youtube.com'], blockInvites: true, mentionLimit: 5, spamRepeat: 3, raidJoinsPerMinute: 15, linkAction: 'delete', spamAction: 'timeout' },
    logs: { channelId: firstText, events: { joins: true, leaves: true, edits: true, deletes: true, roles: true, channels: true, voice: false, moderation: true } },
    antinuke: { enabled: true, channelDeletes: 5, bans: 10, windowSec: 60, exemptAdmins: false, frozen: false },
  };
}

const tmsg = (author: string, text: string, minsAgo: number): Message => ({ id: `tm_${author}_${minsAgo}`, author, text, at: ago(minsAgo * MIN), attachments: [], reactions: {}, delivery: 'sent' });
export const TICKETS: Ticket[] = [
  { id: 'tk142', serverId: 'tc', number: 142, opener: 'ayesha', subject: 'Can’t unlock #premium-notes', claimedBy: 'bilal', state: 'claimed', createdAt: ago(5 * HOUR), messages: [tmsg('ayesha', 'Payment says failed but money was cut from JazzCash.', 300), tmsg('bilal', 'Checking. Can you share the transaction time?', 290)] },
  { id: 'tk141', serverId: 'tc', number: 141, opener: 'omar', subject: 'Wrong role after joining', state: 'open', createdAt: ago(9 * HOUR), messages: [tmsg('omar', 'I got Newcomer but I was Regular before I left.', 540)] },
  { id: 'tk139', serverId: 'tc', number: 139, opener: 'sana', subject: 'Report: spam DMs', claimedBy: 'hamza', state: 'closed', createdAt: ago(3 * DAY), closedAt: ago(2 * DAY), messages: [tmsg('sana', 'Account spam.account22 keeps DMing links.', 3 * 1440), tmsg('hamza', 'Banned and reported to Ghar safety. Closing.', 2 * 1440)] },
];

export const MOD_CASES: ModCase[] = [
  { id: 'mc1', serverId: 'tc', memberId: 'saad', action: 'warn', reason: 'Spamming #general', by: 'ayesha', at: ago(3 * DAY) },
  { id: 'mc2', serverId: 'tc', memberId: 'usman', action: 'timeout', reason: 'Heated argument, 10 min cool-off', by: 'ayesha', at: ago(6 * DAY), detail: '10 minutes' },
];

const AUDIT_ACTIONS: [string, string, string][] = [
  ['bilal', 'Updated welcome message', 'Welcome'], ['ayesha', 'Timed out a member', 'usman'], ['bilal', 'Created channel', '#poets-corner'], ['me', 'Edited role colours', 'Moderators'],
  ['ali', 'Linked a social profile', 'Instagram'], ['bilal', 'Changed auto-moderation words', 'Auto-moderation'], ['ayesha', 'Warned a member', 'saad'], ['bilal', 'Pinned a message', '#general'],
];
export const AUDIT: AuditEntry[] = AUDIT_ACTIONS.map(([actor, action, target], i) => ({ id: `au${i}`, serverId: 'tc', actor, action, target, at: ago((i * 7 + 2) * HOUR) }));

export interface Bot { id: string; name: string; by: string; description: string; perms: string[]; added: boolean; listed: boolean }
export const BOTS: Bot[] = [
  { id: 'quiz', name: 'Quiz Bot', by: 'ali', description: 'Daily quizzes and study streaks.', perms: ['Read messages', 'Send messages', 'Add reactions'], added: true, listed: true },
  { id: 'cricket', name: 'Score Bot', by: 'hamza', description: 'Posts sample match scores into a channel.', perms: ['Send messages', 'Embed links'], added: false, listed: true },
  { id: 'remind', name: 'Remind Me', by: 'sana', description: 'Personal and channel reminders.', perms: ['Send messages'], added: false, listed: true },
];

export interface Webhook { id: string; name: string; channelId: string; createdAt: number; secretShown: boolean }
export const WEBHOOKS: Webhook[] = [{ id: 'wh1', name: 'Deploy notices', channelId: 'kd-feed', createdAt: ago(20 * DAY), secretShown: false }];

/** Linked social profiles, keyed by user id or `server:<id>`. Demo links: public handles only, never verified. */
export const SOCIAL_LINKS: Record<string, import('@/domain/social').SocialLink[]> = {
  me: [{ platform: 'instagram', handle: 'kaif.builds', linkedAt: ago(40 * DAY), showOnProfile: true }, { platform: 'x', handle: 'kaif_pk', linkedAt: ago(12 * DAY), showOnProfile: false }],
  ayesha: [{ platform: 'instagram', handle: 'ayesha.studies', linkedAt: ago(60 * DAY), showOnProfile: true }, { platform: 'youtube', handle: 'AyeshaMDCAT', linkedAt: ago(30 * DAY), showOnProfile: true }],
  ali: [{ platform: 'website', handle: 'alihaider.dev', linkedAt: ago(20 * DAY), showOnProfile: true }],
  'server:tc': [{ platform: 'instagram', handle: 'theclub.lhr', linkedAt: ago(90 * DAY), showOnProfile: true }, { platform: 'youtube', handle: 'TheClubOpenMic', linkedAt: ago(45 * DAY), showOnProfile: true }],
  'server:cf': [],
};

export interface DevApp { id: string; name: string; clientId: string; redirect: string; scopes: string[]; bot: boolean; createdAt: number }
export const DEV_APPS: DevApp[] = [{ id: 'app1', name: 'Club Helper', clientId: 'demo-client-0000-fake', redirect: 'https://example.com/callback', scopes: ['identify', 'guilds'], bot: true, createdAt: ago(15 * DAY) }];

export interface Invite { code: string; by: string; uses: number; maxUses: number | null; expiresAt: number | null }
export const INVITES: Invite[] = [
  { code: 'club-fri', by: 'bilal', uses: 214, maxUses: null, expiresAt: null },
  { code: 'mic-9pm', by: 'ayesha', uses: 12, maxUses: 50, expiresAt: ago(-2 * DAY) },
];

export interface BridgeLink { id: string; fromChannel: string; toServer: string; toChannel: string; state: 'requested' | 'incoming' | 'active' }
export const BRIDGES: BridgeLink[] = [{ id: 'br1', fromChannel: 'tc-cricket', toServer: 'Lahore Gamers', toChannel: 'match-chat', state: 'incoming' }];

/** 14-day owner analytics series (DIS-03), deterministic. */
export function analyticsSeries(serverId: string) {
  const r = rng('an' + serverId);
  return Array.from({ length: 14 }, (_, i) => ({
    day: ago((13 - i) * DAY),
    messages: Math.round(800 + r() * 900 + i * 25),
    voiceHours: Math.round(60 + r() * 80 + i * 3),
    joins: Math.round(20 + r() * 40),
    leaves: Math.round(5 + r() * 15),
  }));
}
