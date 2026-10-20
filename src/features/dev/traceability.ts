/**
 * Requirement completion checklist. One entry per PRD requirement ID.
 * Titles are short paraphrases used for tracking; the PRD wording is authoritative.
 *
 * status:
 *  implemented: the frontend behaviour works end to end against local state
 *  simulated:   the UI works, but the outcome comes from a labelled local simulation (payments, OTP, calls, proofs…)
 *  missing:     frontend work that is still not done
 *  backend:     needs servers, infrastructure or third parties; nothing meaningful to build in a frontend-only scope
 *  deferred:    removed or deliberately postponed
 */
export type TraceStatus = 'implemented' | 'simulated' | 'missing' | 'backend' | 'deferred';
export interface TraceItem { id: string; title: string; status: TraceStatus; where: string; note?: string; external?: string }

const I = 'implemented', S = 'simulated', M = 'missing', B = 'backend', D = 'deferred';
const r = (id: string, title: string, status: TraceStatus, where: string, note?: string, external?: string): TraceItem => ({ id, title, status, where, ...(note ? { note } : {}), ...(external ? { external } : {}) });

export const TRACE: TraceItem[] = [
  /* Accounts */
  r('ACC-01', 'Sign up with email, password and date of birth', S, 'Auth › Create account', 'Validation, password strength and age gate run locally. Nothing is sent or stored.', 'Account service, email delivery'),
  r('ACC-02', 'Email verification before posting', S, 'Auth › Check your email; Settings › My account', 'Demo confirm button; unverified state shows a warning.', 'Email delivery and token check'),
  r('ACC-03', 'Under-13 block and under-18 safer defaults', I, 'Auth; Settings › My account; payments; relationships; DMs', 'Age rules are applied by actions (spend cap, partner relationships blocked, DM default, story audience, payouts blocked).', 'Server-side enforcement'),
  r('ACC-04', 'Sign in, failure messages and lockout after 5 attempts', S, 'Auth › Welcome back', '"wrong" fails; 5 failures lock for 15 minutes in memory.', 'Auth service, rate limiting'),
  r('ACC-05', 'Password reset', S, 'Auth › Reset password; Settings › Change password', 'Neutral confirmation copy; no email sent.', 'Email delivery'),
  r('ACC-06', 'Google sign-in', B, 'Auth', 'Button shown disabled with an explanation.', 'OAuth provider'),
  r('ACC-07', 'Optional phone verification by OTP', S, 'Auth › Phone; Settings › My account; Apply for server', 'Any 6 digits except 000000; number never stored.', 'SMS gateway'),
  r('ACC-08', 'Unique username with live availability', I, 'Auth › Pick a username; Settings › My account', 'Bloom-filter fast check, then confirmed lookup against fixtures.', 'Authoritative uniqueness on server'),
  r('ACC-09', 'Username changes: 2 per rolling 14 days, 30-day hold and reclaim', I, 'Settings › My account › Username', 'Rolling window, hold and reclaim are computed in domain/username.ts with tests.'),
  r('ACC-10', 'Reserved names for public figures and brands', I, 'Username check; Staff › Reserved names', 'Staff can add and release reserved names.'),
  r('ACC-11', 'Profile: name, bio, city, pronouns, links, song, colours', I, 'Settings › Profile; Profile page', 'SaveBar with unsaved-change guard; save fails while offline.'),
  r('ACC-12', 'Profile picture and banner upload with validation', I, 'Settings › Profile › Media', 'Type and size checks, local preview, replace and remove. SVG is rejected, never executed.', 'Media storage and scanning'),
  r('ACC-13', 'Sessions and devices, sign out one or all others', S, 'Settings › Devices', 'Sample sessions; actions change local state.', 'Session store'),
  r('ACC-14', 'Download my data', S, 'Settings › My account › Your data', 'Downloads a JSON export of this session’s fictional records, clearly labelled.', 'Real data export job'),
  r('ACC-15', 'Presence: online, idle, do not disturb, invisible; custom status', I, 'Account hub (up399)', 'One typed source; invisible never triggers the network banner; AFK derives idle; status expiry.'),
  r('ACC-16', 'Delete account', S, 'Settings › My account › Delete account', 'Typed confirmation; logs out and clears the session.', 'Account deletion pipeline'),

  /* Social */
  r('SOC-01', 'Friends: add, accept, decline, remove, block', I, 'Home › Friends', 'Pending, accepted and blocked lists update locally.'),
  r('SOC-02', 'Relationships with visibility and acceptance', I, 'Home › Relationships; Profile', 'Request, accept, decline, remove, visibility; partner type unavailable for under-18s.'),
  r('SOC-03', 'Close friends list', I, 'Home › Friends', undefined),
  r('SOC-04', 'Direct messages and group DMs', I, 'Home › DMs; New group', 'Group creation, rename, add people, leave.', 'Message delivery'),
  r('SOC-05', 'Voice and video calls in DMs, group calls', S, 'DM call stage; incoming call dialog', 'Ringing, accept, decline, mute, camera and share states. No media is transmitted.', 'Media servers (WebRTC/SFU)'),
  r('SOC-06', 'Call history', I, 'Home › Calls', undefined),
  r('SOC-07', 'Stories with audience, hide-from and expiry', I, 'Inbox stories row; Post story', 'Public, friends, close friends, custom audience, hide-from, local image preview, 24h expiry.', 'Media storage'),
  r('SOC-08', 'Story viewer, replies, likes and viewers list', I, 'Story viewer', 'Auto-advance respects reduced motion; keyboard navigation.'),
  r('SOC-09', 'Named story highlights', I, 'Profile › Highlights', 'Create, rename, add, remove.'),
  r('SOC-10', 'Activity log of profile and friend changes', I, 'Home › Logs', undefined),

  /* Followers / feed of replies */
  r('FLR-01', 'Story and status replies go to a DM', I, 'Story viewer › Reply', undefined),
  r('FLR-02', 'Public popularity visible to everyone', I, 'Profile; Popularity', undefined),
  r('FLR-03', 'Save favourites and pins', I, 'Messages › Pin; Pins panel', undefined),
  r('FLR-04', 'Popularity from activity, gifts and purchased points', I, 'Popularity', 'Event-based model; total = activity + gifts + purchased; boosted is a subset, never double-counted.'),
  r('FLR-05', 'Daily activity cap', I, 'Popularity › Cap bar', 'Cap of 300 is a configurable sample policy.'),
  r('FLR-06', 'Gifts with quantity, price, balance and message', S, 'Popularity › Send gift; Profile', 'Duplicate-submit guard; failure changes nothing; test gateway outcomes.', 'Payments'),
  r('FLR-07', 'Supporters and history', I, 'Popularity', undefined),
  r('FLR-08', 'Leaderboards by metric, scope and period', I, 'Leaderboards', 'Filter before sort, deterministic ties, Asia/Karachi day and week boundaries, "Not ranked" state, lifetime never resets.'),
  r('FLR-09', 'Year-end recap', I, 'Account hub › Recap', 'Computed from local sample data.'),

  /* Communities */
  r('COM-01', 'Rooms and servers, create from scratch or template', I, 'Create community', 'Templates: Blank, Study Zone, Startup Room, Mental Health, Gaming.'),
  r('COM-02', 'Server ownership needs phone verification and application', S, 'Apply for server; Staff › Applications', 'Approve, reject and request-changes notify the applicant in their inbox.', 'Review queue service'),
  r('COM-03', 'All channel types: text, voice, stage, forum, announcement', I, 'Channel list; Create channel', 'Includes locked channels (role, level, password, paid).'),
  r('COM-04', 'Categories: create, rename, delete, collapse', I, 'Community settings › Channels', undefined),
  r('COM-05', 'Reorder channels and categories', I, 'Community settings › Channels', 'Drag and drop with keyboard alternatives (move up/down buttons).'),
  r('COM-06', 'Roles with hierarchy, permissions and categories', I, 'Community settings › Roles', 'Two colours and gradient preview; contrast is calculated.'),
  r('COM-07', 'Assign roles to members', I, 'Community settings › Members; member card', undefined),
  r('COM-08', 'Channel permission overrides and locks', I, 'Edit channel', undefined),
  r('COM-09', 'Moderation: warn, mute, kick, ban, with case history', I, 'Members; Moderation cases', 'Actions change member state and write the audit log.', 'Server-side authorization'),
  r('COM-10', 'Templates with channels, roles and portal presets', I, 'Create community', undefined),
  r('COM-11', 'Custom emoji and stickers with slots by level', I, 'Community settings › Emoji & stickers', 'Upload, rename, delete; PNG/GIF/WebP only.'),
  r('COM-12', 'Server levels and perks', I, 'Community settings › Levels & perks', 'Sample thresholds.'),
  r('COM-13', 'Invites with expiry and use limits', I, 'Community settings › Invites; Join by invite', undefined),
  r('COM-14', 'Owner engagement stats', I, 'Community settings › Engagement', 'Bars with an accessible data table.'),
  r('COM-15', 'Community events', I, 'Events', 'Create, RSVP, reminders (local).'),

  /* Developer Portal */
  r('DPT-01', 'Developer Portal access by permission', I, 'Community settings', 'Visibility is presentational; it is not authorization.', 'Server-side authorization'),
  r('DPT-02', 'Tickets as private conversations: claim, close, reopen, transcript', I, 'Community settings › Tickets', 'Config persists in session state; transcript downloads as text.'),
  r('DPT-03', 'Welcome messages with preview', I, 'Community settings › Welcome', undefined),
  r('DPT-04', 'Auto-moderation rules with test box', I, 'Community settings › Auto-moderation', undefined),
  r('DPT-05', 'Moderation cases and outcomes', I, 'Community settings › Moderation cases', 'Outcomes apply to members; restore reverses them.'),
  r('DPT-06', 'Anti-nuke: snapshots, freeze, restore', S, 'Community settings › Anti-nuke', 'Simulated attack; restore from snapshot works and unfreezes.'),
  r('DPT-07', 'Server logs configuration', I, 'Community settings › Server logs', 'Settings persist in session state.'),
  r('DPT-08', 'Audit log with export', I, 'Community settings › Audit log', 'CSV download.'),
  r('DPT-09', 'Bots, webhooks and community social profiles', S, 'Community settings › Social profiles & webhooks; Bots', 'Repository workflows removed. Social profiles are unverified demo links; webhook URLs are fake.', 'Bot runtime, webhook delivery, OAuth with social services'),

  /* Messaging */
  r('MSG-01', 'Send, edit, delete messages', I, 'Channels and DMs', undefined, 'Message service'),
  r('MSG-02', 'Replies and threads', I, 'Thread panel', undefined),
  r('MSG-03', 'Reactions', I, 'Message toolbar', undefined),
  r('MSG-04', 'Mentions with autocomplete', I, 'Composer', 'Accessible combobox.'),
  r('MSG-05', 'Safe markdown and link checks', I, 'Messages', 'AST renderer; unsafe URLs blocked; external link confirmation; no HTML execution.'),
  r('MSG-06', 'Attachments with validation', I, 'Composer', 'Size and type checks; local previews only.', 'Upload storage and scanning'),
  r('MSG-07', 'Voice notes', S, 'Composer', 'Demo recording state; no audio captured.'),
  r('MSG-08', 'Delivery states and offline queue', I, 'Messages; network banner', 'Queued while offline, sent on reconnect, retry on failure.'),
  r('MSG-09', 'Typing indicators', S, 'Composer footer', 'Sample typing users.', 'Realtime service'),
  r('MSG-10', 'Unread and mention counts', I, 'App bar (up400), channel list', undefined),
  r('MSG-11', 'Search messages with filters', I, 'Search messages (Ctrl+Shift+F); conversation search panel', 'Type, conversation, sender, date range and attachment filters combine; results open and highlight the message. Typo-tolerant local search.', 'Server search index'),
  r('MSG-12', 'Pinned messages', I, 'Pins panel', undefined),
  r('MSG-13', 'Drafts preserved per conversation', I, 'Composer', 'Kept in memory per channel; scroll and focus restored.'),
  r('MSG-14', 'End-to-end encrypted rooms', B, 'Create community (option label only)', 'No cryptography is implemented and none is claimed.', 'E2EE protocol and key management'),

  /* Discovery */
  r('DIS-01', 'Browse and search communities', I, 'Discover', undefined),
  r('DIS-02', 'Filters: category, city, language, size', I, 'Discover', undefined),
  r('DIS-03', 'Ranking by activity and growth; suggestions', I, 'Discover', 'Deterministic sample score.', 'Ranking pipeline'),

  /* Reports */
  r('REP-01', 'Report message, user, server, story', I, 'Report dialog', 'Reason-specific fields.'),
  r('REP-02', 'Attach context and evidence', S, 'Report dialog', 'Up to 10 context messages; simulated proof states (captured, verified, failed).', 'Evidence storage and signing'),
  r('REP-03', 'Report outcome sent to the reporter', I, 'Inbox', 'Staff decision on your own report adds an inbox item.'),
  r('REP-04', 'Staff report queue and decisions', I, 'Staff › Reports', 'Destructive decisions require confirmation and are logged.'),
  r('REP-05', 'Appeals', I, 'Staff › Bans', undefined),

  /* Badges (assigned only by the team, never sold) */
  r('BDG-01', 'Badges shown on profiles and member cards with descriptions', I, 'Profile; member card', 'Tooltip and accessible name per badge.'),
  r('BDG-02', 'Ghar Team badge', I, 'Staff › Badges', undefined),
  r('BDG-03', 'Verified Developer badge', I, 'Staff › Badges', undefined),
  r('BDG-04', 'Beta Tester badge', I, 'Staff › Badges', undefined),
  r('BDG-05', 'Verified Event Organizer badge', I, 'Staff › Badges', undefined),
  r('BDG-06', 'Creator Program Member badge after payout verification', S, 'Payouts KYC; Staff dashboard', 'Approve/reject in staff queue; documents never stored.', 'KYC provider'),
  r('BDG-07', 'Community Advisor badge', I, 'Staff › Badges', undefined),
  r('BDG-08', 'Community Affiliate badge', I, 'Staff › Badges', undefined),
  r('BDG-09', 'Early Recognizer badge by signup-date rule', I, 'Staff › Badges › Bulk rule', 'Preview, then a second staff approver applies it.'),
  r('BDG-10', 'Platform Safety (undercover) badge visible to staff only', I, 'Staff › Decoys; Badges', undefined),
  r('BDG-11', 'Certified Moderator via timed assessment', I, 'Settings › Moderator; Staff › Certification', 'Sample pass mark 70.'),
  r('BDG-12', 'Staff assign/remove, catalogue edits without a release, bulk preview', I, 'Staff › Badges', undefined),

  /* Admin / staff */
  r('ADM-01', 'Separate staff console outside account navigation', I, 'Dev tools › Staff console', 'Demo SSO then code 391000. Not reachable from the account hub.', 'Staff SSO, hardware keys'),
  r('ADM-02', 'Staff dashboard, users and integration status', S, 'Staff › Dashboard / Users / Integration status', 'Suspend, lift and warn change local state and the audit log. Service checks report Simulated or Not connected honestly.'),
  r('ADM-03', 'Badge administration', I, 'Staff › Badges', undefined),
  r('ADM-04', 'Server application review', I, 'Staff › Applications', undefined),
  r('ADM-05', 'Report review', I, 'Staff › Reports', undefined),
  r('ADM-06', 'Platform bans by account, device, phone', I, 'Staff › Bans', undefined, 'Device fingerprinting'),
  r('ADM-07', 'Reserved names management', I, 'Staff › Reserved names', undefined),
  r('ADM-08', 'Expert help tickets', I, 'Staff › Expert help', 'Access removed on completion.'),
  r('ADM-09', 'Decoy accounts', I, 'Staff › Decoys', undefined),
  r('ADM-10', 'Staff audit log with export', I, 'Staff › Audit', undefined),
  r('ADM-11', 'Two-person approval for bulk actions', I, 'Staff › Badges', 'Presentational; not real authorization.'),

  /* Events */
  r('EVT-01', 'Create and edit events', I, 'Events', undefined),
  r('EVT-02', 'RSVP and reminders', I, 'Events', 'Going/Interested RSVP updates counts. Reminder delivery is not simulated.', 'Push notifications'),
  r('EVT-03', 'Stage events with host controls', S, 'Stage view', 'Queue, speakers, reactions, whiteboard.', 'Media servers'),
  r('EVT-04', 'Year-end recap event', I, 'Recap', undefined),

  /* Localisation / local culture */
  r('LOC-01', 'Prayer times', S, 'Settings › Prayer times', 'Sample times; no location lookup.', 'Prayer time data source'),
  r('LOC-02', 'Urdu, Arabic, Hindi and English UI with RTL', I, 'Settings › Language', 'Full string catalogue in four languages; mixed-direction text uses dir="auto".'),
  r('LOC-03', 'Study Zone template with Pomodoro', I, 'Templates; channel widget', undefined),
  r('LOC-04', 'Startup Room template', I, 'Templates', undefined),
  r('LOC-05', 'Mental Health template with mood check-in and support card', I, 'Templates; channel widgets', 'Mood data is session-only and never persisted; no helpline details are invented.'),

  /* Developers */
  r('DEV-01', 'Developer apps with credentials', S, 'Community settings › Developer apps', 'Fake credentials, clearly labelled.', 'OAuth/app platform'),
  r('DEV-02', 'Bot directory', I, 'Discover › Bots', undefined),
  r('DEV-03', 'API documentation link', D, 'Developer apps', 'Out of scope for frontend-only.'),

  /* Payments */
  r('PAY-01', 'Wallet with balance and add money', S, 'Settings › Wallet', 'Deterministic test gateway.', 'Payment provider'),
  r('PAY-02', 'Payment outcomes: success, failure, pending, cancel', S, 'Every checkout', 'Simulated checkout: review, cancellable processing, receipt, retry after failure, pending with status check. Outcomes are not chosen in the user flow (Developer tools only).'),
  r('PAY-03', 'Refunds revoke grants', S, 'Settings › Wallet › Transactions', undefined),
  r('PAY-04', 'Ghar Plus subscription', S, 'Settings › Ghar Plus', undefined),
  r('PAY-05', 'Shop: themes, frames, effects, titles', S, 'Settings › Shop / Titles', undefined),
  r('PAY-06', 'Point packs', S, 'Popularity › Buy points', undefined),
  r('PAY-07', 'Creator payouts with verification', S, 'Settings › Payouts', 'Blocked for under-18s.', 'Payout provider, KYC'),
  r('PAY-08', 'Under-18 daily spend cap', I, 'All payments', 'Checked before any payment starts.'),

  /* Non-functional */
  r('NFR-01', 'Responsive from 390px to wide screens', I, 'Whole app', 'Checked at 390/768/1024/1440/1920.'),
  r('NFR-02', 'Contrast at least 4.5:1 for text', I, 'Tokens; contrast tests', 'Calculated in tests for dark and light themes.'),
  r('NFR-03', 'Keyboard access and visible focus', I, 'Whole app', 'Dialogs, menus, tabs, radios use native or ARIA semantics.'),
  r('NFR-04', 'Screen reader semantics', I, 'Whole app', undefined),
  r('NFR-05', 'Reduced motion', I, 'Whole app', undefined),
  r('NFR-06', 'Large text and 200% zoom', I, 'Settings › Appearance', undefined),
  r('NFR-07', 'Light and dark themes', I, 'Settings › Appearance', 'Light uses white and gray.'),
  r('NFR-08', 'Offline and reconnecting states', I, 'Network banner', 'Invisible presence never triggers it.'),
  r('NFR-09', 'Empty, loading and error states', I, 'Lists and pages', undefined),
  r('NFR-10', 'Safe rendering of user content', I, 'Markdown, media', 'No user HTML or SVG is executed.'),
  r('NFR-11', 'Store only preferences locally', I, 'store.ts', 'Only prefs and presence choice persist. No passwords, codes, tokens or documents.'),
  r('NFR-12', 'Performance on low-end phones', M, '—', 'No profiling on real low-end devices; list virtualisation not added.'),
  r('NFR-13', 'Security: authorization, encryption, audit', B, '—', 'Client checks are presentational only.', 'Backend'),
  r('NFR-14', 'Uptime, backups, monitoring', B, '—', undefined, 'Infrastructure'),
];

export const STATUS_LABEL: Record<TraceStatus, string> = {
  implemented: 'Implemented frontend behavior',
  simulated: 'Local simulation',
  missing: 'Missing frontend work',
  backend: 'Backend-infra only',
  deferred: 'Removed-deferred',
};
