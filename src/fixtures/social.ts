import type { CallRecord, FriendRequest, Highlight, Relationship, Story, UserLogEntry } from '@/types/models';
import { DAY, HOUR, MIN } from '@/domain/time';
import { ago, ME } from './users';
import { msg, type Key } from '@/i18n/keys';

export const FRIENDS = ['ayesha', 'hamza', 'zainab', 'fatima', 'ali', 'usman', 'omar', 'danish', 'hira', 'areeba', 'yusuf'];
export const CLOSE_FRIENDS = ['ayesha', 'hamza'];
export const FRIEND_REQUESTS: FriendRequest[] = [
  { userId: 'sana', direction: 'in', at: ago(100 * MIN), mutual: 3 },
  { userId: 'mahnoor', direction: 'out', at: ago(2 * DAY) },
];
export const BLOCKED = ['saad'];

export const RELATIONSHIPS: Relationship[] = [
  { id: 'r1', type: 'best-friend', with: 'hamza', state: 'accepted', visible: true, createdAt: ago(40 * DAY) },
  { id: 'r2', type: 'sibling', with: 'fatima', state: 'pending-in', visible: true, createdAt: ago(5 * HOUR) },
];
/** Other people's accepted relationships, for their profiles. */
export const OTHER_RELATIONSHIPS: Record<string, { type: Relationship['type']; with: string }[]> = {
  ayesha: [{ type: 'best-friend', with: 'zainab' }, { type: 'sibling', with: 'sara' }],
};

export const USER_LOGS: UserLogEntry[] = [
  { id: 'l1', kind: 'unfriended-by', ref: 'saad', at: ago(6 * DAY) },
  { id: 'l2', kind: 'left-server', ref: 'lg', at: ago(12 * DAY) },
];

export const CALLS: CallRecord[] = [
  { id: 'c1', convId: 'dm-ayesha', participants: [ME, 'ayesha'], video: true, direction: 'out', missed: false, startedAt: ago(200 * MIN), durationSec: 24 * 60 },
  { id: 'c2', convId: 'dm-hamza', participants: [ME, 'hamza'], video: false, direction: 'in', missed: true, startedAt: ago(5 * HOUR), durationSec: 0 },
  { id: 'c3', convId: 'g-study', participants: [ME, 'ayesha', 'hira', 'zainab'], video: false, direction: 'in', missed: false, startedAt: ago(26 * HOUR), durationSec: 38 * 60 },
  { id: 'c4', convId: 'dm-zainab', participants: [ME, 'zainab'], video: false, direction: 'in', missed: false, startedAt: ago(30 * HOUR), durationSec: 6 * 60 },
  { id: 'c5', convId: 'dm-fatima', participants: [ME, 'fatima'], video: false, direction: 'out', missed: true, startedAt: ago(32 * HOUR), durationSec: 0 },
];

export type InboxKind = 'mention' | 'reply' | 'dm' | 'friend-request' | 'event' | 'gift' | 'relationship';
export interface InboxItem {
  id: string; kind: InboxKind; from?: string; title: Key; vars?: Record<string, string | number>; preview: string; where?: string; at: number; unread: boolean;
  encrypted?: boolean;
  target?: { route: 'channel'; serverId: string; channelId: string } | { route: 'dm'; convId: string } | { route: 'popularity' } | { route: 'friends' } | { route: 'relationships' } | { route: 'communities' } | { route: 'events'; serverId: string };
}
export const INBOX: InboxItem[] = [
  { id: 'i1', kind: 'mention', from: 'zainab', title: msg('mentioned you in {channel}'), vars: { channel: '#general' }, preview: '@kaif tum bhi aa jao, Usman bhi aa raha hai', where: 'The Club', at: ago(60 * MIN), unread: true, target: { route: 'channel', serverId: 'tc', channelId: 'tc-general' } },
  { id: 'i2', kind: 'dm', from: 'ayesha', title: msg('sent you a message'), preview: '', encrypted: true, at: ago(5 * MIN), unread: true, target: { route: 'dm', convId: 'dm-ayesha' } },
  { id: 'i3', kind: 'reply', from: 'fatima', title: msg('replied to you in {channel}'), vars: { channel: '#study-help' }, preview: 'Chapter 6 notes are up, check the pinned post.', where: 'The Club', at: ago(90 * MIN), unread: true, target: { route: 'channel', serverId: 'tc', channelId: 'tc-help' } },
  { id: 'i4', kind: 'friend-request', from: 'sana', title: msg('sent you a friend request'), preview: '@sana.j · 3 mutual friends', at: ago(100 * MIN), unread: true, target: { route: 'friends' } },
  { id: 'i5', kind: 'relationship', from: 'fatima', title: msg('wants to add you as {type}'), vars: { type: 'Sibling' }, preview: 'Both people must accept before it shows.', at: ago(5 * HOUR), unread: true, target: { route: 'relationships' } },
  { id: 'i6', kind: 'event', title: msg('{event} starts in 24 hours'), vars: { event: 'Friday Open Mic' }, preview: 'You marked Going · The Club', at: ago(20 * HOUR), unread: false, target: { route: 'events', serverId: 'tc' } },
  { id: 'i7', kind: 'mention', from: 'bilal', title: msg('mentioned @everyone in {channel}'), vars: { channel: '#announcements' }, preview: 'Open mic this Friday at 9 PM.', where: 'The Club', at: ago(26 * HOUR), unread: false, target: { route: 'channel', serverId: 'tc', channelId: 'tc-ann' } },
  { id: 'i8', kind: 'gift', from: 'hamza', title: msg('sent you {gift}'), vars: { gift: '3 × Heart' }, preview: '+150 popularity · paid gift (Boosted)', at: ago(28 * HOUR), unread: false, target: { route: 'popularity' } },
];

const art = (seed: string, color: string, caption?: string): Story['image'] => ({ kind: 'art', seed, color, ...(caption ? { caption } : {}) });
const story = (id: string, owner: string, hAgo: number, image: Story['image'], o: Partial<Story> = {}): Story => ({
  id, owner, image, createdAt: ago(hAgo * HOUR), expiresAt: ago(hAgo * HOUR) + DAY, audience: 'friends', customIds: [], hiddenFrom: [], viewers: [], likedBy: [], ...o,
});
export const STORIES: Story[] = [
  story('st1', 'ayesha', 2, art('ayesha-1', '#F2667A', 'Study Room at 10, come'), { viewers: [{ userId: ME, at: ago(HOUR) }] }),
  story('st2', 'ayesha', 6, art('ayesha-2', '#F5B544', 'Chai break')),
  story('st3', 'hamza', 3, art('hamza-1', '#5AA9F5', 'New keyboard')),
  story('st4', 'ali', 9, art('ali-1', '#E879F9', 'Quiz Bot v2 shipped')),
  story('st5', ME, 4, art('me-1', '#3CCB91', 'Late night build'), { audience: 'everyone', viewers: [{ userId: 'ayesha', at: ago(3 * HOUR) }, { userId: 'hamza', at: ago(2 * HOUR) }, { userId: 'zainab', at: ago(HOUR) }], likedBy: ['ayesha'] }),
  // expired stories kept only because they belong to highlights
  story('st6', ME, 24 * 20, art('me-old-1', '#5AA9F5', 'Ghar beta day 1')),
  story('st7', ME, 24 * 19, art('me-old-2', '#F5B544', 'First open mic')),
];
export const HIGHLIGHTS: Highlight[] = [{ id: 'h1', owner: ME, name: 'Beta days', storyIds: ['st6', 'st7'] }];

export interface GharEvent {
  id: string; serverId: string; channelId: string; name: string; type: 'open-mic' | 'hackathon' | 'watch-along' | 'ama' | 'meetup';
  startsAt: number; description: string; going: number; interested: number; host: string;
}
export const EVENTS: GharEvent[] = [
  { id: 'ev1', serverId: 'tc', channelId: 'tc-mic', name: 'Friday Open Mic', type: 'open-mic', startsAt: ago(-26 * HOUR), description: 'Five minutes each. Original work only. Speaker queue opens at 8:45 PM.', going: 84, interested: 132, host: 'bilal' },
  { id: 'ev2', serverId: 'tc', channelId: 'tc-ama', name: 'AMA: MDCAT stress with Dr. Sara Malik', type: 'ama', startsAt: ago(-5 * DAY), description: 'Questions in chat; raise your hand to ask on stage.', going: 40, interested: 210, host: 'sara' },
  { id: 'ev3', serverId: 'kd', channelId: 'kd-voice', name: 'Weekend Hackathon', type: 'hackathon', startsAt: ago(-3 * DAY), description: '24 hours, teams of up to 4. Theme announced at kickoff.', going: 56, interested: 90, host: 'omar' },
  { id: 'ev4', serverId: 'tc', channelId: 'tc-cricket', name: 'PAK vs AUS watch-along', type: 'watch-along', startsAt: ago(-50 * MIN), description: 'Commentary voice room and match chat. Scores shown are sample data.', going: 120, interested: 300, host: 'hamza' },
];
export const RSVPS: Record<string, 'going' | 'interested'> = { ev1: 'going', ev3: 'going' };
