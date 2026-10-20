import type { CommunityCategory, Report } from '@/types/models';
import { DAY, HOUR, MIN } from '@/domain/time';
import { ago } from './users';

export type AppStatus = 'pending' | 'approved' | 'rejected' | 'changes-requested';
export interface ServerApplication {
  id: string; name: string; category: CommunityCategory; applicant: string; purpose: string; moderationPlan: string; samples: string;
  submittedAt: number; status: AppStatus; notes: { by: string; text: string; at: number }[]; phoneVerified: boolean;
}
export const APPLICATIONS: ServerApplication[] = [
  { id: 'ap1', name: 'Hyderabad Coders', category: 'Jobs', applicant: 'sana', purpose: 'Meetups and job posts for Hyderabad developers.', moderationPlan: 'Three mods across time zones; automod for links.', samples: 'Weekly code review threads.', submittedAt: ago(2 * DAY), status: 'pending', notes: [], phoneVerified: true },
  { id: 'ap2', name: 'Multan Book Club', category: 'Study', applicant: 'hira', purpose: 'Monthly book discussions in Urdu and English.', moderationPlan: 'Owner plus two moderators.', samples: 'Reading schedule pinned.', submittedAt: ago(26 * HOUR), status: 'pending', notes: [], phoneVerified: true },
  { id: 'ap3', name: 'Peshawar Chess Club', category: 'Gaming', applicant: 'danish', purpose: 'Rated club games and puzzles.', moderationPlan: 'Owner moderates; looking for help.', samples: '—', submittedAt: ago(20 * HOUR), status: 'changes-requested', notes: [{ by: 'staff1', text: 'Please add at least one more moderator and sample rules.', at: ago(10 * HOUR) }], phoneVerified: false },
  { id: 'ap4', name: 'Valley Esports', category: 'Gaming', applicant: 'ali', purpose: 'Tournaments for northern players.', moderationPlan: 'Five mods, ticket panel for disputes.', samples: 'Tournament rules doc.', submittedAt: ago(6 * HOUR), status: 'pending', notes: [], phoneVerified: true },
];

export const REPORTS: Report[] = [
  { id: 'rp1', kind: 'message', reason: 'scam', reporter: 'decoy:nida', target: 'spam.account22', title: 'Scam DM sent to 40 users', where: 'Direct message (encrypted)', at: ago(12 * MIN), encrypted: true, priority: true, status: 'open',
    evidence: [
      { author: 'spam.account22', text: 'Congrats! You won Rs 50,000. Send your JazzCash PIN to claim.', at: ago(14 * MIN), proof: 'verified', reported: true },
      { author: 'spam.account22', text: 'Hurry, offer ends in 10 minutes.', at: ago(13 * MIN), proof: 'verified' },
    ] },
  { id: 'rp2', kind: 'message', reason: 'harassment', reporter: 'ayesha', target: 'saad', title: 'Harassment in #general', where: 'The Club · #general', at: ago(30 * MIN), encrypted: false, priority: false, status: 'open',
    evidence: [{ author: 'saad', text: '[message removed by moderator — kept for the report]', at: ago(35 * MIN), proof: 'not-applicable', reported: true }] },
  { id: 'rp3', kind: 'server', reason: 'other', reporter: 'hamza', target: 'Leak Hub', title: 'Server sharing exam leaks', where: 'Server · Leak Hub', at: ago(HOUR), encrypted: false, priority: false, status: 'open',
    evidence: [{ author: 'leakhub.owner', text: 'MDCAT 2026 paper available, DM for price.', at: ago(2 * HOUR), proof: 'not-applicable', reported: true }] },
  { id: 'rp4', kind: 'message', reason: 'harassment', reporter: 'usman', target: 'omar', title: 'Edited screenshot submitted as proof', where: 'Direct message (encrypted)', at: ago(3 * HOUR), encrypted: true, priority: false, status: 'open',
    evidence: [{ author: 'omar', text: 'You are useless, leave the group.', at: ago(4 * HOUR), proof: 'forged', reported: true }] },
];

export interface PlatformBan { id: string; target: string; kind: 'account' | 'device' | 'phone'; reason: string; at: number; expiresAt: number | null; appeal?: { text: string; at: number; state: 'open' | 'granted' | 'denied' } }
export const BANS: PlatformBan[] = [
  { id: 'b1', target: 'spam.account22', kind: 'account', reason: 'Scam DMs', at: ago(5 * DAY), expiresAt: null },
  { id: 'b2', target: '+92 300 ••• 1182', kind: 'phone', reason: 'SMS pumping', at: ago(9 * DAY), expiresAt: ago(-21 * DAY) },
  { id: 'b3', target: 'meme.lord.99', kind: 'account', reason: 'Repeated hate speech', at: ago(15 * DAY), expiresAt: ago(-15 * DAY), appeal: { text: 'I was hacked. Please review.', at: ago(2 * DAY), state: 'open' } },
];

export interface ExpertTicket { id: string; server: string; requester: string; need: string; expert?: string; state: 'requested' | 'assigned' | 'in-progress' | 'completed'; at: number }
export const EXPERT_TICKETS: ExpertTicket[] = [
  { id: 'ex1', server: 'Startup Pakistan', requester: 'ali', need: 'Roles, ticket panel and branding.', expert: 'staff2', state: 'in-progress', at: ago(3 * DAY) },
  { id: 'ex2', server: 'Calm Corner', requester: 'sara', need: 'Rules gate and crisis-keyword setup.', state: 'requested', at: ago(20 * HOUR) },
];

export interface Decoy { id: string; handle: string; staff: string; createdAt: number; reports: number; active: boolean }
export const DECOYS: Decoy[] = [{ id: 'decoy:nida', handle: 'nida.studies', staff: 'staff3', createdAt: ago(30 * DAY), reports: 7, active: true }];

export interface StaffMember { id: string; name: string; role: 'Super Admin' | 'Admin' | 'Safety Moderator' | 'Support' }
export const STAFF: StaffMember[] = [
  { id: 'staff1', name: 'Arbaz (Super Admin)', role: 'Super Admin' }, { id: 'staff2', name: 'Maria (Admin)', role: 'Admin' },
  { id: 'staff3', name: 'Rehan (Safety)', role: 'Safety Moderator' }, { id: 'staff4', name: 'Noor (Support)', role: 'Support' },
];

/** Moderator qualification (BDG-11). Pass mark is set by the team; sample value. */
export interface Question { id: string; kind: 'choice' | 'scenario'; prompt: string; options?: string[]; correct?: number; rubric?: string }
export const PASS_MARK = 70;
export const QUESTIONS: Question[] = [
  { id: 'q1', kind: 'choice', prompt: 'When should you use a timeout instead of a ban?', options: ['Never; always ban', 'For a first heated outburst that needs a cool-off', 'Only for bots', 'When the user is a friend'], correct: 1 },
  { id: 'q2', kind: 'choice', prompt: 'A member posts someone’s phone number. First action?', options: ['Remove the message and warn', 'Ignore it', 'Reply asking them to delete it', 'Ban the person whose number it is'], correct: 0 },
  { id: 'q3', kind: 'choice', prompt: 'Which evidence proves an encrypted DM was really sent?', options: ['A screenshot', 'A verified report proof check', 'The reporter’s word', 'A forwarded copy'], correct: 1 },
  { id: 'q4', kind: 'scenario', prompt: 'Someone in #check-in says they want to hurt themselves. Describe what you do in the first five minutes.', rubric: 'Responds calmly, shares support resources, alerts other moderators, avoids promises about confidentiality.' },
  { id: 'q5', kind: 'scenario', prompt: 'Two regulars start insulting each other in voice during an open mic. What do you do?', rubric: 'Mutes or moves them, de-escalates privately, logs a case, follows the server rules.' },
];
export interface Assessment { id: string; user: string; answers: Record<string, string | number>; score: number; submittedAt: number; state: 'pending-review' | 'passed' | 'failed' }
export const ASSESSMENTS: Assessment[] = [
  { id: 'as1', user: 'ayesha', answers: { q1: 1, q2: 0, q3: 1, q4: 'Stay calm, share resources, alert team.', q5: 'Move them out, talk privately, log case.' }, score: 100, submittedAt: ago(2 * DAY), state: 'pending-review' },
];

export interface StaffAudit { id: string; staff: string; action: string; target: string; at: number }
export const STAFF_AUDIT: StaffAudit[] = [
  { id: 'sa1', staff: 'staff1', action: 'Approved server application', target: 'Karachi Devs', at: ago(10 * DAY) },
  { id: 'sa2', staff: 'staff3', action: 'Banned account', target: 'spam.account22', at: ago(5 * DAY) },
  { id: 'sa3', staff: 'staff2', action: 'Assigned badge Verified Developer', target: 'ali.h', at: ago(4 * DAY) },
];

export const DASHBOARD = { dailyUsers: 48210, onlineNow: 12482, openReports: 132, priorityReports: 18, revenueTodayPkr: 418000, health: [['Chat gateway', 'Normal'], ['Voice servers', 'Normal'], ['Push notifications', 'Degraded'], ['Payments (test gateway)', 'Normal']] as [string, string][] };
