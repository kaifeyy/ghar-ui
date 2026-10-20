# Requirement completion checklist

Generated from `src/features/dev/traceability.ts` (also viewable in-app: Ctrl+Shift+D → Requirements).
Titles are short paraphrases for tracking; the PRD wording is authoritative.

| Status | Count |
|---|---|
| Implemented frontend behavior | 104 |
| Local simulation | 28 |
| Missing frontend work | 1 |
| Backend-infra only | 4 |
| Removed-deferred | 1 |
| **Total** | **138** |

| ID | Requirement | Status | Where | Notes | External dependency |
|---|---|---|---|---|---|
| ACC-01 | Sign up with email, password and date of birth | Local simulation | Auth › Create account | Validation, password strength and age gate run locally. Nothing is sent or stored. | Account service, email delivery |
| ACC-02 | Email verification before posting | Local simulation | Auth › Check your email; Settings › My account | Demo confirm button; unverified state shows a warning. | Email delivery and token check |
| ACC-03 | Under-13 block and under-18 safer defaults | Implemented frontend behavior | Auth; Settings › My account; payments; relationships; DMs | Age rules are applied by actions (spend cap, partner relationships blocked, DM default, story audience, payouts blocked). | Server-side enforcement |
| ACC-04 | Sign in, failure messages and lockout after 5 attempts | Local simulation | Auth › Welcome back | "wrong" fails; 5 failures lock for 15 minutes in memory. | Auth service, rate limiting |
| ACC-05 | Password reset | Local simulation | Auth › Reset password; Settings › Change password | Neutral confirmation copy; no email sent. | Email delivery |
| ACC-06 | Google sign-in | Backend-infra only | Auth | Button shown disabled with an explanation. | OAuth provider |
| ACC-07 | Optional phone verification by OTP | Local simulation | Auth › Phone; Settings › My account; Apply for server | Any 6 digits except 000000; number never stored. | SMS gateway |
| ACC-08 | Unique username with live availability | Implemented frontend behavior | Auth › Pick a username; Settings › My account | Bloom-filter fast check, then confirmed lookup against fixtures. | Authoritative uniqueness on server |
| ACC-09 | Username changes: 2 per rolling 14 days, 30-day hold and reclaim | Implemented frontend behavior | Settings › My account › Username | Rolling window, hold and reclaim are computed in domain/username.ts with tests. |  |
| ACC-10 | Reserved names for public figures and brands | Implemented frontend behavior | Username check; Staff › Reserved names | Staff can add and release reserved names. |  |
| ACC-11 | Profile: name, bio, city, pronouns, links, song, colours | Implemented frontend behavior | Settings › Profile; Profile page | SaveBar with unsaved-change guard; save fails while offline. |  |
| ACC-12 | Profile picture and banner upload with validation | Implemented frontend behavior | Settings › Profile › Media | Type and size checks, local preview, replace and remove. SVG is rejected, never executed. | Media storage and scanning |
| ACC-13 | Sessions and devices, sign out one or all others | Local simulation | Settings › Devices | Sample sessions; actions change local state. | Session store |
| ACC-14 | Download my data | Local simulation | Settings › My account › Your data | Downloads a JSON export of this session’s fictional records, clearly labelled. | Real data export job |
| ACC-15 | Presence: online, idle, do not disturb, invisible; custom status | Implemented frontend behavior | Account hub (up399) | One typed source; invisible never triggers the network banner; AFK derives idle; status expiry. |  |
| ACC-16 | Delete account | Local simulation | Settings › My account › Delete account | Typed confirmation; logs out and clears the session. | Account deletion pipeline |
| SOC-01 | Friends: add, accept, decline, remove, block | Implemented frontend behavior | Home › Friends | Pending, accepted and blocked lists update locally. |  |
| SOC-02 | Relationships with visibility and acceptance | Implemented frontend behavior | Home › Relationships; Profile | Request, accept, decline, remove, visibility; partner type unavailable for under-18s. |  |
| SOC-03 | Close friends list | Implemented frontend behavior | Home › Friends |  |  |
| SOC-04 | Direct messages and group DMs | Implemented frontend behavior | Home › DMs; New group | Group creation, rename, add people, leave. | Message delivery |
| SOC-05 | Voice and video calls in DMs, group calls | Local simulation | DM call stage; incoming call dialog | Ringing, accept, decline, mute, camera and share states. No media is transmitted. | Media servers (WebRTC/SFU) |
| SOC-06 | Call history | Implemented frontend behavior | Home › Calls |  |  |
| SOC-07 | Stories with audience, hide-from and expiry | Implemented frontend behavior | Inbox stories row; Post story | Public, friends, close friends, custom audience, hide-from, local image preview, 24h expiry. | Media storage |
| SOC-08 | Story viewer, replies, likes and viewers list | Implemented frontend behavior | Story viewer | Auto-advance respects reduced motion; keyboard navigation. |  |
| SOC-09 | Named story highlights | Implemented frontend behavior | Profile › Highlights | Create, rename, add, remove. |  |
| SOC-10 | Activity log of profile and friend changes | Implemented frontend behavior | Home › Logs |  |  |
| FLR-01 | Story and status replies go to a DM | Implemented frontend behavior | Story viewer › Reply |  |  |
| FLR-02 | Public popularity visible to everyone | Implemented frontend behavior | Profile; Popularity |  |  |
| FLR-03 | Save favourites and pins | Implemented frontend behavior | Messages › Pin; Pins panel |  |  |
| FLR-04 | Popularity from activity, gifts and purchased points | Implemented frontend behavior | Popularity | Event-based model; total = activity + gifts + purchased; boosted is a subset, never double-counted. |  |
| FLR-05 | Daily activity cap | Implemented frontend behavior | Popularity › Cap bar | Cap of 300 is a configurable sample policy. |  |
| FLR-06 | Gifts with quantity, price, balance and message | Local simulation | Popularity › Send gift; Profile | Duplicate-submit guard; failure changes nothing; test gateway outcomes. | Payments |
| FLR-07 | Supporters and history | Implemented frontend behavior | Popularity |  |  |
| FLR-08 | Leaderboards by metric, scope and period | Implemented frontend behavior | Leaderboards | Filter before sort, deterministic ties, Asia/Karachi day and week boundaries, "Not ranked" state, lifetime never resets. |  |
| FLR-09 | Year-end recap | Implemented frontend behavior | Account hub › Recap | Computed from local sample data. |  |
| COM-01 | Rooms and servers, create from scratch or template | Implemented frontend behavior | Create community | Templates: Blank, Study Zone, Startup Room, Mental Health, Gaming. |  |
| COM-02 | Server ownership needs phone verification and application | Local simulation | Apply for server; Staff › Applications | Approve, reject and request-changes notify the applicant in their inbox. | Review queue service |
| COM-03 | All channel types: text, voice, stage, forum, announcement | Implemented frontend behavior | Channel list; Create channel | Includes locked channels (role, level, password, paid). |  |
| COM-04 | Categories: create, rename, delete, collapse | Implemented frontend behavior | Community settings › Channels |  |  |
| COM-05 | Reorder channels and categories | Implemented frontend behavior | Community settings › Channels | Drag and drop with keyboard alternatives (move up/down buttons). |  |
| COM-06 | Roles with hierarchy, permissions and categories | Implemented frontend behavior | Community settings › Roles | Two colours and gradient preview; contrast is calculated. |  |
| COM-07 | Assign roles to members | Implemented frontend behavior | Community settings › Members; member card |  |  |
| COM-08 | Channel permission overrides and locks | Implemented frontend behavior | Edit channel |  |  |
| COM-09 | Moderation: warn, mute, kick, ban, with case history | Implemented frontend behavior | Members; Moderation cases | Actions change member state and write the audit log. | Server-side authorization |
| COM-10 | Templates with channels, roles and portal presets | Implemented frontend behavior | Create community |  |  |
| COM-11 | Custom emoji and stickers with slots by level | Implemented frontend behavior | Community settings › Emoji & stickers | Upload, rename, delete; PNG/GIF/WebP only. |  |
| COM-12 | Server levels and perks | Implemented frontend behavior | Community settings › Levels & perks | Sample thresholds. |  |
| COM-13 | Invites with expiry and use limits | Implemented frontend behavior | Community settings › Invites; Join by invite |  |  |
| COM-14 | Owner engagement stats | Implemented frontend behavior | Community settings › Engagement | Bars with an accessible data table. |  |
| COM-15 | Community events | Implemented frontend behavior | Events | Create, RSVP, reminders (local). |  |
| DPT-01 | Developer Portal access by permission | Implemented frontend behavior | Community settings | Visibility is presentational; it is not authorization. | Server-side authorization |
| DPT-02 | Tickets as private conversations: claim, close, reopen, transcript | Implemented frontend behavior | Community settings › Tickets | Config persists in session state; transcript downloads as text. |  |
| DPT-03 | Welcome messages with preview | Implemented frontend behavior | Community settings › Welcome |  |  |
| DPT-04 | Auto-moderation rules with test box | Implemented frontend behavior | Community settings › Auto-moderation |  |  |
| DPT-05 | Moderation cases and outcomes | Implemented frontend behavior | Community settings › Moderation cases | Outcomes apply to members; restore reverses them. |  |
| DPT-06 | Anti-nuke: snapshots, freeze, restore | Local simulation | Community settings › Anti-nuke | Simulated attack; restore from snapshot works and unfreezes. |  |
| DPT-07 | Server logs configuration | Implemented frontend behavior | Community settings › Server logs | Settings persist in session state. |  |
| DPT-08 | Audit log with export | Implemented frontend behavior | Community settings › Audit log | CSV download. |  |
| DPT-09 | Bots, webhooks and community social profiles | Local simulation | Community settings › Social profiles & webhooks; Bots | Repository workflows removed. Social profiles are unverified demo links; webhook URLs are fake. | Bot runtime, webhook delivery, OAuth with social services |
| MSG-01 | Send, edit, delete messages | Implemented frontend behavior | Channels and DMs |  | Message service |
| MSG-02 | Replies and threads | Implemented frontend behavior | Thread panel |  |  |
| MSG-03 | Reactions | Implemented frontend behavior | Message toolbar |  |  |
| MSG-04 | Mentions with autocomplete | Implemented frontend behavior | Composer | Accessible combobox. |  |
| MSG-05 | Safe markdown and link checks | Implemented frontend behavior | Messages | AST renderer; unsafe URLs blocked; external link confirmation; no HTML execution. |  |
| MSG-06 | Attachments with validation | Implemented frontend behavior | Composer | Size and type checks; local previews only. | Upload storage and scanning |
| MSG-07 | Voice notes | Local simulation | Composer | Demo recording state; no audio captured. |  |
| MSG-08 | Delivery states and offline queue | Implemented frontend behavior | Messages; network banner | Queued while offline, sent on reconnect, retry on failure. |  |
| MSG-09 | Typing indicators | Local simulation | Composer footer | Sample typing users. | Realtime service |
| MSG-10 | Unread and mention counts | Implemented frontend behavior | App bar (up400), channel list |  |  |
| MSG-11 | Search messages with filters | Implemented frontend behavior | Search messages (Ctrl+Shift+F); conversation search panel | Type, conversation, sender, date range and attachment filters combine; results open and highlight the message. Typo-tolerant local search. | Server search index |
| MSG-12 | Pinned messages | Implemented frontend behavior | Pins panel |  |  |
| MSG-13 | Drafts preserved per conversation | Implemented frontend behavior | Composer | Kept in memory per channel; scroll and focus restored. |  |
| MSG-14 | End-to-end encrypted rooms | Backend-infra only | Create community (option label only) | No cryptography is implemented and none is claimed. | E2EE protocol and key management |
| DIS-01 | Browse and search communities | Implemented frontend behavior | Discover |  |  |
| DIS-02 | Filters: category, city, language, size | Implemented frontend behavior | Discover |  |  |
| DIS-03 | Ranking by activity and growth; suggestions | Implemented frontend behavior | Discover | Deterministic sample score. | Ranking pipeline |
| REP-01 | Report message, user, server, story | Implemented frontend behavior | Report dialog | Reason-specific fields. |  |
| REP-02 | Attach context and evidence | Local simulation | Report dialog | Up to 10 context messages; simulated proof states (captured, verified, failed). | Evidence storage and signing |
| REP-03 | Report outcome sent to the reporter | Implemented frontend behavior | Inbox | Staff decision on your own report adds an inbox item. |  |
| REP-04 | Staff report queue and decisions | Implemented frontend behavior | Staff › Reports | Destructive decisions require confirmation and are logged. |  |
| REP-05 | Appeals | Implemented frontend behavior | Staff › Bans |  |  |
| BDG-01 | Badges shown on profiles and member cards with descriptions | Implemented frontend behavior | Profile; member card | Tooltip and accessible name per badge. |  |
| BDG-02 | Ghar Team badge | Implemented frontend behavior | Staff › Badges |  |  |
| BDG-03 | Verified Developer badge | Implemented frontend behavior | Staff › Badges |  |  |
| BDG-04 | Beta Tester badge | Implemented frontend behavior | Staff › Badges |  |  |
| BDG-05 | Verified Event Organizer badge | Implemented frontend behavior | Staff › Badges |  |  |
| BDG-06 | Creator Program Member badge after payout verification | Local simulation | Payouts KYC; Staff dashboard | Approve/reject in staff queue; documents never stored. | KYC provider |
| BDG-07 | Community Advisor badge | Implemented frontend behavior | Staff › Badges |  |  |
| BDG-08 | Community Affiliate badge | Implemented frontend behavior | Staff › Badges |  |  |
| BDG-09 | Early Recognizer badge by signup-date rule | Implemented frontend behavior | Staff › Badges › Bulk rule | Preview, then a second staff approver applies it. |  |
| BDG-10 | Platform Safety (undercover) badge visible to staff only | Implemented frontend behavior | Staff › Decoys; Badges |  |  |
| BDG-11 | Certified Moderator via timed assessment | Implemented frontend behavior | Settings › Moderator; Staff › Certification | Sample pass mark 70. |  |
| BDG-12 | Staff assign/remove, catalogue edits without a release, bulk preview | Implemented frontend behavior | Staff › Badges |  |  |
| ADM-01 | Separate staff console outside account navigation | Implemented frontend behavior | Dev tools › Staff console | Demo SSO then code 391000. Not reachable from the account hub. | Staff SSO, hardware keys |
| ADM-02 | Staff dashboard, users and integration status | Local simulation | Staff › Dashboard / Users / Integration status | Suspend, lift and warn change local state and the audit log. Service checks report Simulated or Not connected honestly. |  |
| ADM-03 | Badge administration | Implemented frontend behavior | Staff › Badges |  |  |
| ADM-04 | Server application review | Implemented frontend behavior | Staff › Applications |  |  |
| ADM-05 | Report review | Implemented frontend behavior | Staff › Reports |  |  |
| ADM-06 | Platform bans by account, device, phone | Implemented frontend behavior | Staff › Bans |  | Device fingerprinting |
| ADM-07 | Reserved names management | Implemented frontend behavior | Staff › Reserved names |  |  |
| ADM-08 | Expert help tickets | Implemented frontend behavior | Staff › Expert help | Access removed on completion. |  |
| ADM-09 | Decoy accounts | Implemented frontend behavior | Staff › Decoys |  |  |
| ADM-10 | Staff audit log with export | Implemented frontend behavior | Staff › Audit |  |  |
| ADM-11 | Two-person approval for bulk actions | Implemented frontend behavior | Staff › Badges | Presentational; not real authorization. |  |
| EVT-01 | Create and edit events | Implemented frontend behavior | Events |  |  |
| EVT-02 | RSVP and reminders | Implemented frontend behavior | Events | Going/Interested RSVP updates counts. Reminder delivery is not simulated. | Push notifications |
| EVT-03 | Stage events with host controls | Local simulation | Stage view | Queue, speakers, reactions, whiteboard. | Media servers |
| EVT-04 | Year-end recap event | Implemented frontend behavior | Recap |  |  |
| LOC-01 | Prayer times | Local simulation | Settings › Prayer times | Sample times; no location lookup. | Prayer time data source |
| LOC-02 | Urdu, Arabic, Hindi and English UI with RTL | Implemented frontend behavior | Settings › Language | Full string catalogue in four languages; mixed-direction text uses dir="auto". |  |
| LOC-03 | Study Zone template with Pomodoro | Implemented frontend behavior | Templates; channel widget |  |  |
| LOC-04 | Startup Room template | Implemented frontend behavior | Templates |  |  |
| LOC-05 | Mental Health template with mood check-in and support card | Implemented frontend behavior | Templates; channel widgets | Mood data is session-only and never persisted; no helpline details are invented. |  |
| DEV-01 | Developer apps with credentials | Local simulation | Community settings › Developer apps | Fake credentials, clearly labelled. | OAuth/app platform |
| DEV-02 | Bot directory | Implemented frontend behavior | Discover › Bots |  |  |
| DEV-03 | API documentation link | Removed-deferred | Developer apps | Out of scope for frontend-only. |  |
| PAY-01 | Wallet with balance and add money | Local simulation | Settings › Wallet | Deterministic test gateway. | Payment provider |
| PAY-02 | Payment outcomes: success, failure, pending, cancel | Local simulation | Every checkout | Simulated checkout: review, cancellable processing, receipt, retry after failure, pending with status check. Outcomes are not chosen in the user flow (Developer tools only). |  |
| PAY-03 | Refunds revoke grants | Local simulation | Settings › Wallet › Transactions |  |  |
| PAY-04 | Ghar Plus subscription | Local simulation | Settings › Ghar Plus |  |  |
| PAY-05 | Shop: themes, frames, effects, titles | Local simulation | Settings › Shop / Titles |  |  |
| PAY-06 | Point packs | Local simulation | Popularity › Buy points |  |  |
| PAY-07 | Creator payouts with verification | Local simulation | Settings › Payouts | Blocked for under-18s. | Payout provider, KYC |
| PAY-08 | Under-18 daily spend cap | Implemented frontend behavior | All payments | Checked before any payment starts. |  |
| NFR-01 | Responsive from 390px to wide screens | Implemented frontend behavior | Whole app | Checked at 390/768/1024/1440/1920. |  |
| NFR-02 | Contrast at least 4.5:1 for text | Implemented frontend behavior | Tokens; contrast tests | Calculated in tests for dark and light themes. |  |
| NFR-03 | Keyboard access and visible focus | Implemented frontend behavior | Whole app | Dialogs, menus, tabs, radios use native or ARIA semantics. |  |
| NFR-04 | Screen reader semantics | Implemented frontend behavior | Whole app |  |  |
| NFR-05 | Reduced motion | Implemented frontend behavior | Whole app |  |  |
| NFR-06 | Large text and 200% zoom | Implemented frontend behavior | Settings › Appearance |  |  |
| NFR-07 | Light and dark themes | Implemented frontend behavior | Settings › Appearance | Light uses white and gray. |  |
| NFR-08 | Offline and reconnecting states | Implemented frontend behavior | Network banner | Invisible presence never triggers it. |  |
| NFR-09 | Empty, loading and error states | Implemented frontend behavior | Lists and pages |  |  |
| NFR-10 | Safe rendering of user content | Implemented frontend behavior | Markdown, media | No user HTML or SVG is executed. |  |
| NFR-11 | Store only preferences locally | Implemented frontend behavior | store.ts | Only prefs and presence choice persist. No passwords, codes, tokens or documents. |  |
| NFR-12 | Performance on low-end phones | Missing frontend work | — | No profiling on real low-end devices; list virtualisation not added. |  |
| NFR-13 | Security: authorization, encryption, audit | Backend-infra only | — | Client checks are presentational only. | Backend |
| NFR-14 | Uptime, backups, monitoring | Backend-infra only | — |  | Infrastructure |
