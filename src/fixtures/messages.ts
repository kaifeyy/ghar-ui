import type { Attachment, Conversation, ForumPost, Message, Thread } from '@/types/models';
import { DAY, HOUR, MIN } from '@/domain/time';
import { ago } from './users';

let n = 0;
const m = (author: string, text: string, minsAgo: number, o: Partial<Message> = {}): Message => ({
  id: `m${++n}`, author, text, at: ago(minsAgo * MIN), attachments: [], reactions: {}, delivery: 'sent', ...o,
});
const sys = (text: string, minsAgo: number): Message => m('system', text, minsAgo, { system: true });
const att = (...a: Attachment[]) => ({ attachments: a });

export const CHANNEL_MESSAGES: Record<string, Message[]> = {
  'tc-general': [
    m('hamza', 'Anyone up for a study session tonight? FSc physics, chapter 6.', 64, { reactions: { '👍': ['ayesha', 'zainab', 'me'], '😂': ['usman'] }, threadId: 'th1' }),
    m('ayesha', 'Count me in. Study Room at 10?', 63, att({ kind: 'image', name: 'chapter6-notes.jpg', seed: 'notes6' }, { kind: 'file', name: 'Physics_Ch6_PastPapers.pdf', size: 'PDF · 2.4 MB' })),
    m('ayesha', 'Uploaded the 2023 paper too.', 62, { editedAt: ago(60 * MIN) }),
    m('bilal', 'Friday open mic sign-ups are open. Rules and form:', 61, { pinned: true, link: { host: 'docs.example.com', title: 'Friday Open Mic — rules and sign-up', description: 'Five minutes each. Original work only. Sign up before Thursday 11 PM.' } }),
    sys('Sana Javed joined the server.', 60),
    m('zainab', '@kaif tum bhi aa jao, Usman bhi aa raha hai', 60, { reactions: { '❤️': ['hamza'] } }),
    m('usman', 'Light gayi hui hai, sending a voice note', 59, att({ kind: 'voice', seconds: 24 })),
    m('yusuf', 'میں بھی آؤں گا، chapter 6 کے نوٹس بھی لاؤں گا', 40),
    m('areeba', 'Long display names test the layout: hello from Karachi :chai:', 22),
  ],
  'tc-ann': [
    m('bilal', '@everyone Open mic this Friday at 9 PM in #open-mic. Sign-ups close Thursday night.', 26 * 60, { pinned: true, reactions: { '🔥': ['ayesha', 'hamza', 'zainab', 'fatima'] } }),
    m('bilal', 'AMA with Dr. Sara Malik on MDCAT prep, Wednesday 8 PM in AMA Live.', 6 * 60),
  ],
  'tc-rules': [m('bilal', '1. Be kind. 2. No spam or self-promo outside #memes. 3. Job posts go to Karachi Devs. 4. No exam leaks, ever. 5. Report problems, don’t reply to them.', 280 * 24 * 60, { pinned: true })],
  'tc-events': [m('bilal', 'Upcoming events are listed above. RSVP so you get reminders 24 hours and 15 minutes before.', 3 * 24 * 60)],
  'tc-memes': [m('usman', 'When the teacher says “this won’t come in the paper” and it comes', 200, { ...att({ kind: 'image', name: 'meme.jpg', seed: 'meme1' }), reactions: { '😂': ['hamza', 'ali', 'me', 'fatima'] } })],
  'tc-cricket': [m('hamza', 'Woh SIX. Match ab hamara hai', 180, { reactions: { '🔥': ['usman', 'me', 'ali'] } }), m('usman', 'Jaldi mat bolo yaar, 47 abhi bhi chahiye', 179)],
  'tc-premium': [m('fatima', 'Biology 2024 fully solved, with marking-scheme notes.', 3000, att({ kind: 'file', name: 'Bio_2024_Solved_Notes.pdf', size: 'PDF · 6.3 MB' }))],
  'tc-staff': [m('ayesha', 'Reminder: Friday open mic needs two mods in voice.', 500)],
  'tc-poets': [m('zainab', 'Aaj ki ghazal draft, feedback chahiye.', 800)],
  'kd-general': [m('sana', 'Anyone hiring junior React devs in Karachi? Remote is fine too.', 300), m('omar', 'We are. Check #jobs, posted it this morning.', 297)],
  'kd-feed': [m('bot:deploy', 'Staging updated: voice reconnect on slow 3G is fixed.', 420), m('bot:deploy', 'Reminder: Karachi Devs meetup sign-ups close Friday.', 360)],
  'fp-papers': [m('hira', 'Biology 2024 solved paper is up. Check pins.', 400, { ...att({ kind: 'file', name: 'Bio_2024_Solved.pdf', size: 'PDF · 5.1 MB' }), pinned: true })],
  'cc-guide': [m('sara', 'This is a peer-support space, not a crisis service. Be kind. No advice unless asked. Moderators are trained volunteers.', 9000, { pinned: true })],
  'cc-check': [m('hira', 'Exam stress is a lot this week. Sleeping maybe 4 hours.', 120, { reactions: { '❤️': ['ayesha', 'sara'] } }), m('ayesha', 'Thank you for sharing, Hira. Want to join Quiet Room? A few of us are just studying together.', 117)],
  'cc-good': [m('usman', 'Passed my driving test today!', 600, { reactions: { '🎉': ['ayesha', 'hira', 'me'] } })],
  'cf-chat': [m('sana', 'Saturday plan: food street, then chai at 11?', 240), m('omar', 'I am in. Booking a car for 4.', 237)],
  'sp-res': [m('ali', 'Pitch deck template and company registration guide are pinned.', 3 * 24 * 60, { pinned: true })],
};

export const THREADS: Thread[] = [{
  id: 'th1', channelId: 'tc-general', parentId: 'm1', lastReadAt: ago(50 * MIN), messages: [
    m('fatima', 'Use v = rω first, then find the tension.', 55), m('ali', 'The answer key says 24 N, I got 23.8', 50), m('hamza', 'Got it now, shukriya @fatima.m', 30),
  ],
}];

const post = (id: string, channelId: string, title: string, author: string, tags: string[], replies: number, hAgo: number, body: string): ForumPost => ({
  id, channelId, title, author, tags, at: ago(hAgo * HOUR), body,
  replies: Array.from({ length: Math.min(replies, 3) }, (_, i) => m(['ayesha', 'fatima', 'ali', 'hira'][i % 4]!, ['Same question here.', 'Check the pinned notes, page 4.', 'I made a summary sheet, sharing below.'][i % 3]!, hAgo * 60 - 10 * (i + 1))),
});
export const FORUM_POSTS: ForumPost[] = [
  post('p1', 'tc-help', 'Q14 circular motion, anyone?', 'hamza', ['Physics', 'FSc'], 8, 0.1, 'Stuck on Q14 from the 2022 paper. Where does the 24 N come from?'),
  post('p2', 'tc-help', 'Best way to revise organic chemistry in 2 weeks', 'fatima', ['Chemistry'], 21, 1, 'Sharing my plan. Add yours.'),
  post('p3', 'tc-help', 'MDCAT mock 3 discussion', 'ayesha', ['MDCAT'], 54, 24, 'Post your scores and tricky questions.'),
  post('p4', 'kd-jobs', 'Junior React Developer · Remote · Rs 150k', 'omar', ['Hiring', 'Remote'], 12, 2, 'Template: role, salary, location, how to apply. DM me your GitHub.'),
  post('p5', 'kd-jobs', 'Looking for internship, Flutter', 'sana', ['Looking'], 4, 26, 'Third-year CS student, Flutter and Firebase.'),
  post('p6', 'fp-doubts', 'Why does a pendulum period not depend on mass?', 'usman', ['Physics'], 6, 0.3, 'Intuition please, not formulas.'),
  post('p7', 'fp-doubts', 'Krebs cycle trick to remember', 'ayesha', ['Biology'], 31, 3, 'Citrate Is Krebs Starting Substrate For Making Oxaloacetate.'),
  post('p8', 'sp-pitch', 'Tutoring marketplace for small cities', 'sana', ['Edtech'], 14, 2, 'Problem, solution, traction so far. Roast it.'),
  post('p9', 'sp-cofounder', 'Looking for a tech co-founder: tutoring marketplace', 'sana', ['Tech co-founder', 'Lahore'], 14, 2, 'Equity split open to discussion.'),
  post('p10', 'sp-cofounder', 'Agritech idea for small farmers in Punjab, need a business partner', 'danish', ['Business'], 22, 72, 'Cold storage marketplace.'),
];

const dm = (id: string, other: string, msgs: Message[], readMinsAgo: number): Conversation => ({ id, kind: 'dm', members: [other], e2ee: true, messages: msgs, hiddenForMe: [], lastReadAt: ago(readMinsAgo * MIN) });

export const CONVERSATIONS: Conversation[] = [
  dm('dm-ayesha', 'ayesha', [m('ayesha', 'Did you get the MDCAT mock results?', 100), m('ayesha', 'Mine came in, 168 out of 200', 100), m('me', 'Not yet, they said by tonight', 92), m('me', '168 is solid though, mubarak ho', 92, { reactions: { '❤️': ['ayesha'] } }), m('ayesha', 'Shukriya. Biology pulled me up, physics still needs work', 5)], 30),
  dm('dm-hamza', 'hamza', [m('hamza', 'Valorant at 11?', 140), m('me', 'After the study session', 135)], 130),
  dm('dm-zainab', 'zainab', [m('zainab', 'Read my new shayari in Open Mic Friday', 26 * 60)], 26 * 60),
  dm('dm-fatima', 'fatima', [m('fatima', 'Notes are up in #study-help', 3 * 24 * 60)], 3 * 24 * 60),
  dm('dm-ali', 'ali', [m('ali', 'Quiz Bot v2 is live, try /quiz', 4 * 24 * 60)], 4 * 24 * 60),
  dm('dm-usman', 'usman', [], 0),
  { id: 'g-study', kind: 'group', name: 'MDCAT squad', members: ['me', 'ayesha', 'hira', 'zainab'], e2ee: true, hiddenForMe: [], lastReadAt: ago(80 * MIN), messages: [m('hira', 'Mock 4 on Sunday, everyone in?', 90), m('zainab', 'Yes. Biology first.', 85), m('ayesha', 'Group call at 9 to plan?', 20)] },
];

export const VOICE_OCCUPANCY: Record<string, string[]> = {
  'tc-lounge': ['ayesha', 'hamza', 'zainab', 'usman'], 'tc-study': ['hamza', 'ayesha'], 'fp-focus': ['ayesha', 'hira'], 'tc-mic': ['bilal', 'zainab', 'ayesha'],
  'cc-quiet': ['hira'], 'kd-voice': ['ali', 'sana'], 'tc-ama': ['sara', 'bilal'],
};
export const STAGE = { speakers: ['bilal', 'zainab', 'ayesha'], queue: ['ali', 'hira', 'danish'], listeners: 61 };
export const TYPING: Record<string, string[]> = { 'tc-general': ['zainab', 'ali'] };
export const _days = DAY; // keep import used in some builds
