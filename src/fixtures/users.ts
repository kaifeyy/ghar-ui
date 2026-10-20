import type { Badge, ReservedName, Title, User, UsernameChange, UsernameHold } from '@/types/models';
import { DAY, HOUR, MIN } from '@/domain/time';

/** Fixture clock: everything is placed relative to page load so the demo always looks current. */
export const BOOT = Date.now();
export const ago = (ms: number) => BOOT - ms;

export const ME = 'me';

export const BADGES: Badge[] = [
  { id: 'team', name: 'Ghar Team', description: 'Member of the main Ghar development team.', icon: 'home' },
  { id: 'dev', name: 'Verified Developer', description: 'Developer verified by the Ghar team.', icon: 'code' },
  { id: 'mod', name: 'Certified Moderator', description: 'Passed the moderation qualification and staff review.', icon: 'shield-check' },
  { id: 'beta', name: 'Beta Tester', description: 'Tested Ghar before launch.', icon: 'flask' },
  { id: 'organizer', name: 'Verified Event Organizer', description: 'Hosts events on Ghar’s behalf.', icon: 'calendar' },
  { id: 'creator', name: 'Creator Program Member', description: 'Content creator on other platforms.', icon: 'video' },
  { id: 'advisor', name: 'Community Advisor', description: 'Expert new users can ask for advice.', icon: 'lightbulb' },
  { id: 'affiliate', name: 'Community Affiliate', description: 'Owner of a large, well-run community, or a sponsor.', icon: 'link' },
  { id: 'early', name: 'Early Recognizer', description: 'Joined in the first six months after launch.', icon: 'clock', animated: true },
  { id: 'undercover', name: 'Platform Safety', description: 'Staff-only marker on decoy accounts. Never shown to users.', icon: 'eye', staffOnly: true },
];

export const TITLES: Title[] = [
  { id: 'night-owl', name: 'Night Owl', source: 'earned' },
  { id: 'study-machine', name: 'Study Machine', source: 'earned' },
  { id: 'shayar', name: 'Shayar', source: 'earned' },
  { id: 'host', name: 'Host', source: 'earned' },
  { id: 'chai-lover', name: 'Chai Lover', source: 'bought', pricePkr: 150 },
  { id: 'open-mic-legend', name: 'Open Mic Legend', source: 'bought', pricePkr: 400 },
];

const u = (o: Omit<User, 'badges'> & { badges?: User['badges'] }): User => ({ badges: [], ...o });

export const USERS: User[] = [
  u({ id: ME, name: 'Kaif', handle: 'kaif', color: '#3CCB91', presence: 'online', titleId: 'night-owl', badges: ['team', 'beta', 'early'], bio: 'Building Ghar. Chai over coffee, always.', city: 'Lahore', song: 'Shehar ki Raat', joinedAt: '2026-01-02', flag: 'PK' }),
  u({ id: 'ayesha', name: 'Ayesha Khan', handle: 'ayesha.k', color: '#F2667A', presence: 'online', activity: { kind: 'studying', label: 'Chemistry', since: ago(2 * HOUR), join: { serverId: 'fp', channelId: 'fp-focus' } }, titleId: 'night-owl', badges: ['mod', 'beta', 'early'], bio: 'Pre-med, Lahore. MDCAT 2026. Usually in Study Room after Isha.', city: 'Lahore', song: 'Shehar ki Raat', joinedAt: '2026-03-14', flag: 'PK' }),
  u({ id: 'hamza', name: 'Hamza Qureshi', handle: 'hamza.q', color: '#5AA9F5', presence: 'online', activity: { kind: 'playing', label: 'Valorant', with: ['usman'] }, titleId: 'study-machine', badges: ['early'], bio: 'Physics nerd. Valorant after 11.', city: 'Karachi', joinedAt: '2026-04-02' }),
  u({ id: 'zainab', name: 'Zainab Raza', handle: 'zainab.r', color: '#A78BFA', presence: 'dnd', activity: { kind: 'studying', label: 'MDCAT' }, titleId: 'shayar', badges: ['organizer'], bio: 'Shayari, chai, and too many tabs open.', city: 'Islamabad', joinedAt: '2026-02-20', flag: 'Islamabad' }),
  u({ id: 'bilal', name: 'Bilal Ahmed', handle: 'bilal', color: '#F5B544', presence: 'online', activity: { kind: 'hosting', label: 'Friday Open Mic', join: { serverId: 'tc', channelId: 'tc-mic' } }, titleId: 'host', badges: ['affiliate', 'organizer', 'team'], bio: 'Owner of The Club. Open mic every Friday.', city: 'Lahore', joinedAt: '2026-01-02' }),
  u({ id: 'usman', name: 'Usman Tariq', handle: 'usman.t', color: '#2DD4BF', presence: 'idle', bio: 'Multan. Load-shedding survivor.', city: 'Multan', joinedAt: '2026-06-09' }),
  u({ id: 'fatima', name: 'Fatima Malik', handle: 'fatima.m', color: '#FB923C', presence: 'online', activity: { kind: 'listening', label: 'Shehar ki Raat' }, badges: ['creator'], bio: 'Notes queen. Ask me for chapter 6.', city: 'Lahore', joinedAt: '2026-05-01' }),
  u({ id: 'ali', name: 'Ali Haider', handle: 'ali.h', color: '#E879F9', presence: 'online', activity: { kind: 'coding', label: 'a side project' }, badges: ['dev'], bio: 'Builds bots. Made Quiz Bot.', city: 'Karachi', joinedAt: '2026-01-11' }),
  u({ id: 'sana', name: 'Sana Javed', handle: 'sana.j', color: '#38BDF8', presence: 'online', bio: 'React dev, Karachi.', city: 'Karachi', joinedAt: '2026-10-15' }),
  u({ id: 'omar', name: 'Omar Farooq', handle: 'omar.f', color: '#FACC15', presence: 'offline', lastSeenAt: ago(26 * HOUR), city: 'Karachi', joinedAt: '2026-03-03' }),
  u({ id: 'danish', name: 'Danish Iqbal', handle: 'danish.i', color: '#34D399', presence: 'offline', lastSeenAt: ago(2 * HOUR), city: 'Peshawar', joinedAt: '2026-08-08' }),
  u({ id: 'hira', name: 'Hira Siddiqui', handle: 'hira.s', color: '#FB7185', presence: 'online', activity: { kind: 'studying', label: 'Chemistry', since: ago(48 * MIN) }, titleId: 'study-machine', city: 'Multan', joinedAt: '2026-02-06' }),
  u({ id: 'sara', name: 'Dr. Sara Malik', handle: 'dr.sara', color: '#4ADE80', presence: 'online', badges: ['advisor', 'mod'], bio: 'Psychiatrist. AMA on exam stress tonight.', city: 'Lahore', joinedAt: '2026-02-01' }),
  u({ id: 'mahnoor', name: 'Mahnoor Ali', handle: 'mahnoor.a', color: '#C084FC', presence: 'online', titleId: 'open-mic-legend', city: 'Lahore', joinedAt: '2026-01-04' }),
  u({ id: 'saad', name: 'Saad Butt', handle: 'saad.b', color: '#60A5FA', presence: 'idle', titleId: 'night-owl', city: 'Lahore', joinedAt: '2026-01-09' }),
  u({ id: 'areeba', name: 'Areeba Noor Muhammad Chaudhry-Siddiqui', handle: 'areeba.noor', color: '#F472B6', presence: 'offline', hideLastSeen: true, city: 'Karachi', joinedAt: '2026-07-21', bio: 'Long names are a lifestyle.' }),
  u({ id: 'yusuf', name: 'یوسف خان', handle: 'yusuf.k', color: '#93C5FD', presence: 'online', city: 'Peshawar', joinedAt: '2026-05-30', bio: 'اردو شاعری اور چائے' }),
  u({ id: 'bot:deploy', name: 'Deploy notices', handle: 'deploy.notices', color: '#949BA8', presence: 'online', bot: true, city: '', joinedAt: '2026-01-01', bio: 'Incoming webhook. Posts notices from the community’s own tools. Not a person.' }),
  u({ id: 'bot:Quiz', name: 'Quiz Bot', handle: 'quizbot', color: '#949BA8', presence: 'online', bot: true, city: '', joinedAt: '2026-01-01', bio: 'Bot by Ali Haider.' }),
];

export const USERNAME_HISTORY: UsernameChange[] = [
  { oldName: 'kaif.dev', newName: 'kaif', changedAt: ago(9 * DAY) },
];
export const USERNAME_HOLDS: UsernameHold[] = [
  { name: 'kaif.dev', previousOwner: ME, heldUntil: ago(9 * DAY) + 30 * DAY },
  { name: 'hamza', previousOwner: 'hamza', heldUntil: ago(3 * DAY) + 30 * DAY },
];
export const RESERVED_NAMES: ReservedName[] = [
  { name: 'atifaslam', category: 'artist' },
  { name: 'aliazafar', category: 'artist' },
  { name: 'pti', category: 'politician' },
  { name: 'jazzcash', category: 'brand' },
  { name: 'easypaisa', category: 'brand' },
  { name: 'ghar', category: 'team', note: 'Platform name' },
  { name: 'support', category: 'team' },
  { name: 'babarazam', category: 'artist', note: 'Athlete — public figure category' },
];
