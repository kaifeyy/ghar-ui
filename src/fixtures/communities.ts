import type { Channel, ChannelCategory, CommunityCategory, Member, Role, RoleCategory, Server } from '@/types/models';
import { DAY } from '@/domain/time';
import { ago } from './users';

const ALL_PERMS: Role['permissions'] = ['manageServer', 'manageRoles', 'manageChannels', 'manageDeveloperPortal', 'kick', 'ban', 'timeout', 'manageMessages', 'mentionEveryone', 'sendMessages', 'speak', 'stream', 'viewAudit'];

export function standardRoles(serverId: string, extra: Partial<Record<'mods' | 'levels' | 'interests', string[]>> = {}): { roles: Role[]; roleCategories: RoleCategory[] } {
  const roleCategories: RoleCategory[] = [{ id: 'staff', name: 'Staff' }, { id: 'levels', name: 'Levels' }, { id: 'interests', name: 'Interests' }];
  const roles: Role[] = [
    { id: `${serverId}-owner`, name: 'Owner', color1: '#F5B544', color2: '#F2667A', categoryId: 'staff', position: 0, permissions: ALL_PERMS, system: 'owner' },
    { id: `${serverId}-admin`, name: 'Admin', color1: '#F07878', categoryId: 'staff', position: 1, permissions: ALL_PERMS.filter(p => p !== 'manageServer') },
    { id: `${serverId}-mod`, name: 'Moderators', color1: '#5AA9F5', color2: '#A78BFA', categoryId: 'staff', position: 2, permissions: ['kick', 'timeout', 'manageMessages', 'sendMessages', 'speak', 'viewAudit'] },
    ...(extra.levels ?? ['Regular', 'Newcomer']).map((n, i) => ({ id: `${serverId}-lvl-${i}`, name: n, color1: i === 0 ? '#9CC3F5' : '#B5BAC5', categoryId: 'levels', position: 10 + i, permissions: ['sendMessages', 'speak'] as Role['permissions'] })),
    ...(extra.interests ?? []).map((n, i) => ({ id: `${serverId}-int-${i}`, name: n, color1: ['#FB923C', '#2DD4BF', '#E879F9', '#FACC15'][i % 4]!, categoryId: 'interests', position: 20 + i, permissions: [] as Role['permissions'] })),
    { id: `${serverId}-everyone`, name: '@everyone', color1: '#949BA8', categoryId: 'levels', position: 99, permissions: ['sendMessages', 'speak'], system: 'everyone' },
  ];
  return { roles, roleCategories };
}

const ch = (serverId: string, id: string, name: string, type: Channel['type'], o: Partial<Channel> = {}): Channel => ({ id, serverId, name, type, ...o });
const cat = (id: string, name: string, chans: Channel[]): [ChannelCategory, Channel[]] => [{ id, name, channelIds: chans.map(c => c.id) }, chans];

function members(serverId: string, owner: string, list: [string, string[]][]): Member[] {
  return [[owner, [`${serverId}-owner`]] as [string, string[]], ...list].map(([userId, roleIds], i) => ({ userId, roleIds, joinedAt: ago((60 - i * 3) * DAY), warnings: 0 }));
}

interface Built { server: Server; channels: Channel[] }

function server(base: Omit<Server, 'categories' | 'roles' | 'roleCategories' | 'memberList' | 'emoji' | 'stickers' | 'effectsEnabled' | 'whisperEnabled'> & Partial<Pick<Server, 'emoji' | 'stickers'>>, cats: [ChannelCategory, Channel[]][], mem: [string, string[]][], interests: string[] = []): Built {
  const { roles, roleCategories } = standardRoles(base.id, { interests });
  return {
    server: { emoji: [], stickers: [], effectsEnabled: true, whisperEnabled: true, ...base, categories: cats.map(c => c[0]), roles, roleCategories, memberList: members(base.id, base.owner, mem) },
    channels: cats.flatMap(c => c[1]),
  };
}

const TC = 'tc', KD = 'kd', FP = 'fp', CC = 'cc', SP = 'sp', CF = 'cf';

const built: Built[] = [
  server({ id: TC, name: 'The Club', color: '#D4D4D8', category: 'Study', city: 'Lahore', languages: ['English', 'Urdu'], description: 'Study rooms, open mics and late-night chats for students across Pakistan.', owner: 'bilal', kind: 'server', approved: true, members: 12480, online: 3206, xp: 18400, bannerStyle: 'study', sponsor: { name: 'Chai Point Lahore', until: '2026-12-31' },
    emoji: [{ id: 'e1', name: 'chai', art: { kind: 'glyph', glyph: '☕', color: '#F5B544' }, by: 'bilal' }, { id: 'e2', name: 'shabash', art: { kind: 'glyph', glyph: '👏', color: '#3CCB91' }, by: 'bilal' }, { id: 'e3', name: 'load_shedding', art: { kind: 'glyph', glyph: '🕯', color: '#949BA8' }, by: 'usman' }],
    stickers: [{ id: 's1', name: 'Chai time', art: { kind: 'glyph', glyph: '☕', color: '#F5B544' }, by: 'bilal' }] },
    [
      cat('tc-info', 'Information', [ch(TC, 'tc-ann', 'announcements', 'announcement', { topic: 'Only staff can post here.', icon: { kind: 'icon', name: 'megaphone' } }), ch(TC, 'tc-rules', 'rules', 'text', { topic: 'Read before posting.', icon: { kind: 'icon', name: 'rules' } }), ch(TC, 'tc-events', 'events', 'text', { topic: 'Open mics, AMAs, watch-alongs.', widget: 'events' })]),
      cat('tc-gen', 'General', [ch(TC, 'tc-general', 'general', 'text', { topic: 'Lahore, Karachi, everywhere. Keep it friendly.' }), ch(TC, 'tc-help', 'study-help', 'forum', { topic: 'Ask, share notes, help each other.' }), ch(TC, 'tc-cricket', 'cricket', 'text', { widget: 'cricket', topic: 'Match chat. Scores here are sample data.', icon: { kind: 'icon', name: 'trophy' } }), ch(TC, 'tc-memes', 'memes', 'text', { topic: 'Desi memes only.' }), ch(TC, 'tc-premium', 'premium-notes', 'text', { lock: { kind: 'payment', pricePkr: 250 }, topic: 'Solved past papers by top students.' }), ch(TC, 'tc-staff', 'staff-room', 'text', { lock: { kind: 'role', roleId: 'tc-mod' } }), ch(TC, 'tc-poets', 'poets-corner', 'text', { lock: { kind: 'password', hint: 'Ask a mod. Demo password: chai123' } })]),
      cat('tc-voice', 'Voice', [ch(TC, 'tc-lounge', 'Lounge', 'voice'), ch(TC, 'tc-study', 'Study Room', 'voice', { widget: 'whiteboard' }), ch(TC, 'tc-mic', 'Open Mic', 'stage', { topic: 'Friday Open Mic' }), ch(TC, 'tc-ama', 'AMA Live', 'stage', { live: true, topic: 'AMA with Dr. Sara Malik' })]),
    ],
    [['ayesha', ['tc-mod', 'tc-lvl-0']], ['hamza', ['tc-lvl-0', 'tc-int-0']], ['zainab', ['tc-lvl-0', 'tc-int-1']], ['usman', ['tc-lvl-1']], ['fatima', ['tc-lvl-0']], ['ali', ['tc-admin']], ['sana', ['tc-lvl-1']], ['sara', ['tc-mod']], ['me', ['tc-admin', 'tc-lvl-0']], ['hira', ['tc-lvl-0']], ['mahnoor', ['tc-lvl-0', 'tc-int-1']], ['saad', ['tc-lvl-1']], ['areeba', ['tc-lvl-1']], ['yusuf', ['tc-lvl-1']]],
    ['Cricket', 'Poetry', 'Coding']),
  server({ id: KD, name: 'Karachi Devs', color: '#5AA9F5', category: 'Jobs', city: 'Karachi', languages: ['English'], description: 'Developers from Karachi sharing jobs, code reviews and meetups.', owner: 'omar', kind: 'server', approved: true, members: 6087, online: 892, xp: 9200, bannerStyle: 'jobs' },
    [cat('kd-text', 'Text', [ch(KD, 'kd-general', 'general', 'text', { topic: 'Say salam.' }), ch(KD, 'kd-jobs', 'jobs', 'forum', { topic: 'Job posts only. Use the template.' }), ch(KD, 'kd-feed', 'dev-feed', 'text', { topic: 'Notices posted by the community’s webhook.' })]), cat('kd-voice', 'Voice', [ch(KD, 'kd-voice', 'Pair Programming', 'voice')])],
    [['ali', ['kd-mod']], ['sana', ['kd-lvl-1']], ['me', ['kd-lvl-0']], ['hamza', ['kd-lvl-1']]]),
  server({ id: FP, name: 'FSc Pre-Med 2026', color: '#F5B544', category: 'Study', city: 'All cities', languages: ['English', 'Urdu'], description: 'Daily study rooms, past papers and MDCAT prep for the 2026 batch.', owner: 'hira', kind: 'server', approved: true, members: 9450, online: 2104, xp: 12800, bannerStyle: 'study' },
    [cat('fp-study', 'Study', [ch(FP, 'fp-doubts', 'doubts', 'forum', { topic: 'One doubt per post.' }), ch(FP, 'fp-papers', 'past-papers', 'text', { topic: 'Solved papers, 2019 to 2025.' })]), cat('fp-focus', 'Focus rooms', [ch(FP, 'fp-focus', 'Focus Room 1', 'voice', { widget: 'pomodoro' }), ch(FP, 'fp-focus2', 'Focus Room 2', 'voice', { widget: 'pomodoro' })])],
    [['ayesha', ['fp-mod']], ['me', ['fp-lvl-0']], ['usman', ['fp-lvl-1']], ['zainab', ['fp-lvl-0']]]),
  server({ id: CC, name: 'Calm Corner', color: '#A78BFA', category: 'Fun', city: 'All cities', languages: ['English', 'Urdu'], description: 'A quiet place to talk about how you feel. Trained moderators.', owner: 'sara', kind: 'server', approved: true, members: 2140, online: 312, xp: 4100, bannerStyle: 'fun' },
    [cat('cc-start', 'Start here', [ch(CC, 'cc-guide', 'guidelines', 'announcement', { topic: 'Be kind. No advice unless asked.' }), ch(CC, 'cc-help', 'helplines', 'text', { widget: 'helplines', topic: 'Support resources.' })]), cat('cc-talk', 'Talk', [ch(CC, 'cc-check', 'check-in', 'text', { widget: 'mood', topic: 'How are you today?' }), ch(CC, 'cc-good', 'good-news', 'text')]), cat('cc-voice', 'Voice', [ch(CC, 'cc-quiet', 'Quiet Room', 'voice')])],
    [['hira', ['cc-lvl-1']], ['ayesha', ['cc-mod']], ['me', ['cc-lvl-1']]]),
  server({ id: SP, name: 'Startup Pakistan', color: '#FB923C', category: 'Jobs', city: 'All cities', languages: ['English'], description: 'Founders, co-founder search, pitch feedback and hiring threads.', owner: 'ali', kind: 'server', approved: true, members: 3980, online: 415, xp: 6100, bannerStyle: 'jobs' },
    [cat('sp-build', 'Build', [ch(SP, 'sp-pitch', 'pitch', 'forum', { topic: 'Post your pitch, get feedback.' }), ch(SP, 'sp-cofounder', 'cofounder-finder', 'forum', { topic: 'Find your co-founder.' }), ch(SP, 'sp-res', 'resources', 'text'), ch(SP, 'sp-feedback', 'feedback', 'text')]), cat('sp-voice', 'Voice', [ch(SP, 'sp-lounge', 'Founders Lounge', 'voice')])],
    [['sana', ['sp-lvl-1']], ['danish', ['sp-lvl-1']], ['me', ['sp-lvl-0']]]),
  server({ id: CF, name: 'Close Friends', color: '#F2667A', category: 'Fun', city: 'Lahore', languages: ['Urdu'], description: 'Private Room. Encryption is shown as a label in this demo.', owner: 'me', kind: 'room', approved: false, e2ee: true, members: 6, online: 3, xp: 400, bannerStyle: 'fun' },
    [cat('cf-text', 'Text', [ch(CF, 'cf-chat', 'chat', 'text'), ch(CF, 'cf-plans', 'plans', 'text')]), cat('cf-voice', 'Voice', [ch(CF, 'cf-voice', 'Hangout', 'voice')])],
    [['sana', []], ['omar', []], ['ayesha', []], ['hamza', []], ['zainab', []]]),
];

export const SERVERS: Server[] = built.map(b => b.server);
export const CHANNELS: Channel[] = built.flatMap(b => b.channels);
export const JOINED: string[] = [TC, KD, FP, CC, SP, CF];

export interface DirectoryEntry {
  id: string; name: string; category: CommunityCategory; color: string; description: string; online: number; members: number; city: string;
  language: string; growth: number; activity: number; createdAt: number; liveNow?: string; listed: boolean;
}
export const DIRECTORY: DirectoryEntry[] = ([
  ['lg', 'Lahore Gamers', 'Gaming', '#5AA9F5', 'Weekend scrims, LAN meetups at Liberty and a chill voice lounge.', 1341, 4812, 'Lahore', 'Urdu', 12, 71, 40, 'Scrim Lobby'],
  ['mf', 'Meme Factory PK', 'Fun', '#F2667A', 'Desi memes only. Original content, no reposts, keep it clean.', 3870, 15640, 'All cities', 'Urdu', 8, 92, 200],
  ['qc', 'Quran Circle', 'Islamic', '#3CCB91', 'Tajweed classes, weekly halaqa in voice and Ramadan study plans.', 540, 3302, 'All cities', 'Urdu', 5, 64, 300, 'Halaqa'],
  ['if', 'Islamabad Food Walks', 'Local cities', '#FB923C', 'Where to eat in Islamabad and Rawalpindi, plus monthly food walks.', 310, 2215, 'Islamabad', 'English', 3, 38, 90],
  ['pc', 'Peshawar Chess Club', 'Gaming', '#A78BFA', 'Daily puzzles, rated club games and Sunday blitz in voice.', 128, 1077, 'Peshawar', 'Pashto', 15, 41, 25],
  ['ve', 'Valley Esports', 'Gaming', '#2DD4BF', 'Team finder and tournaments for players across the north.', 760, 5210, 'Gilgit', 'Urdu', 22, 66, 15],
  ['op', 'O Level Physics Help', 'Study', '#F5B544', 'Ask questions, share notes and join timed paper practice.', 655, 4130, 'All cities', 'English', 9, 58, 120, 'Paper Practice'],
  ['mb', 'Multan Book Club', 'Study', '#E879F9', 'One Urdu and one English book a month, discussed in voice.', 96, 840, 'Multan', 'Urdu', 2, 22, 400],
  ['kw', 'Karachi Weekend', 'Local cities', '#38BDF8', 'Events, beach trips and things to do in Karachi this weekend.', 1020, 7760, 'Karachi', 'English', 11, 61, 60],
  ['lr', 'Lahore Rain Watch', 'Local cities', '#60A5FA', 'Weather updates, road closures and power cuts across Lahore.', 2330, 11900, 'Lahore', 'Urdu', 18, 80, 10],
  ['ln', 'Late Night Ludo', 'Fun', '#FACC15', 'Ludo, carrom and card games every night after 11.', 1210, 6540, 'All cities', 'Urdu', 6, 77, 150, 'Ludo Table 3'],
  ['sm', 'Shayari Mehfil', 'Fun', '#FB7185', 'Share your own shayari, open mic every Friday night.', 488, 3060, 'All cities', 'Urdu', 7, 52, 210],
] as const).map(([id, name, category, color, description, online, members, city, language, growth, activity, ageDays, live]) => ({
  id, name, category: category as CommunityCategory, color, description, online, members, city, language, growth, activity, createdAt: ago(ageDays * DAY), liveNow: live, listed: true,
}));

/** Community templates (COM-10, LOC-03/04/05). Each lists channels, roles and Developer Portal presets. */
export interface Template {
  id: 'blank' | 'study' | 'startup' | 'mental-health' | 'gaming';
  name: string;
  description: string;
  categories: { name: string; channels: { name: string; type: Channel['type']; widget?: Channel['widget'] }[] }[];
  roles: string[];
  portal: string[];
}
export const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Blank', description: 'One text and one voice channel.', categories: [{ name: 'Text', channels: [{ name: 'general', type: 'text' }] }, { name: 'Voice', channels: [{ name: 'Lounge', type: 'voice' }] }], roles: ['Member'], portal: [] },
  { id: 'study', name: 'Study Zone', description: 'Focus voice rooms with a Pomodoro timer and study-hour tracking.', categories: [{ name: 'Study', channels: [{ name: 'general', type: 'text' }, { name: 'doubts', type: 'forum' }, { name: 'notes', type: 'text' }] }, { name: 'Focus', channels: [{ name: 'Focus Room', type: 'voice', widget: 'pomodoro' }, { name: 'Group Study', type: 'voice', widget: 'whiteboard' }] }], roles: ['Mentor', 'Student'], portal: ['Welcome message with study rules', 'Auto-moderation: spam and links', 'Study-hour leaderboard'] },
  { id: 'startup', name: 'Startup Room', description: 'Pitch, co-founder finder, resources and feedback channels.', categories: [{ name: 'Build', channels: [{ name: 'pitch', type: 'forum' }, { name: 'cofounder-finder', type: 'forum' }, { name: 'resources', type: 'text' }, { name: 'feedback', type: 'text' }] }, { name: 'Voice', channels: [{ name: 'Founders Lounge', type: 'voice' }] }], roles: ['Founder', 'Mentor', 'Investor'], portal: ['Ticket panel for mentor requests', 'Welcome DM with posting templates'] },
  { id: 'mental-health', name: 'Mental Health', description: 'Pinned guidelines, private mood check-ins, support resources and trained moderators.', categories: [{ name: 'Start here', channels: [{ name: 'guidelines', type: 'announcement' }, { name: 'helplines', type: 'text', widget: 'helplines' }] }, { name: 'Talk', channels: [{ name: 'check-in', type: 'text', widget: 'mood' }, { name: 'good-news', type: 'text' }] }, { name: 'Voice', channels: [{ name: 'Quiet Room', type: 'voice' }] }], roles: ['Trained moderator', 'Member'], portal: ['Rules acceptance gate', 'Crisis keywords show a support card', 'Content logs limited to moderators'] },
  { id: 'gaming', name: 'Gaming', description: 'Team finder, clips and squad voice rooms.', categories: [{ name: 'Text', channels: [{ name: 'general', type: 'text' }, { name: 'team-finder', type: 'forum' }, { name: 'clips', type: 'text' }] }, { name: 'Voice', channels: [{ name: 'Squad 1', type: 'voice' }, { name: 'Squad 2', type: 'voice' }] }], roles: ['Captain', 'Player'], portal: ['Auto-moderation: mention spam'] },
];

/** Server levels (COM-12) — sample thresholds and perks. */
export const LEVELS = [
  { level: 1, xp: 0, perks: ['50 emoji slots', 'Basic banner'] },
  { level: 2, xp: 5000, perks: ['Donations unlocked', '100 emoji slots'] },
  { level: 3, xp: 12000, perks: ['Animated banner', '150 emoji slots', 'Server bridge'] },
  { level: 4, xp: 25000, perks: ['Custom invite link', '250 emoji slots'] },
] as const;
export const DONATION_LEVEL = 2;
export const BRIDGE_LEVEL = 3;
export function levelFor(xp: number) { let l: (typeof LEVELS)[number] = LEVELS[0]; for (const x of LEVELS) if (xp >= x.xp) l = x; return l; }
export function emojiSlots(xp: number) { const l = levelFor(xp).level; return [50, 100, 150, 250][l - 1] ?? 50; }
