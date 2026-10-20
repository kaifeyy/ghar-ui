# Ghar frontend: delivery report

This is a frontend-only TypeScript build: Vite 6, React 19, TS 5.9 strict and zustand. It is an isolated project. `C:\dashboard` was not connected to this session, so it was not touched. "main prompt for gpt.txt" was never attached; the work follows the brief, PRD, TRD, Build Phases and the pasted Architecture, Security and Traceability notes.

## How to run

```
npm install
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm test             # 54 tests (domain logic, contrast, i18n completeness, checklist coverage)
npm run build        # dist/
npx vite build --mode single   # dist-single/index.html (one self-contained file)
```

To sign in, use any email and password; `#demo` skips sign-in. Developer and persona tools open with Ctrl+Shift+D or `#dev`. They are not part of account navigation.

## Verified frontend behavior (checked by tests or scripted browser runs)

- **Checks:**
  - Typecheck is clean.
  - 54 unit tests pass.
  - The production build succeeds.
- **Error sweep (`scripts/sweep.py`):** 98 routes, 39 modals and 10 staff sections, run at 390, 768 and 1440 px. There were 0 page errors and 0 console errors.
- **Sign-up flow (`scripts/flow.py`):**
  - The "wrong" password fails and shows the attempts left.
  - Under-13 users are blocked.
  - A 13–17 date of birth turns on safer defaults, verified in the store: DMs from non-friends are off.
  - Username availability shows taken, reserved and available states.
  - Onboarding offers interests, then suggested communities, then joins.
- **Layout (`scripts/a11y.py`):**
  - up399 appears exactly once, inside up400.
  - up400 sits at top 0 and is 64 px tall at every width (390, 768, 1024, 1440, 1920).
  - There is no horizontal page scroll at any of those widths.
- **Account hub keyboard behaviour:**
  - Enter opens the hub and moves focus inside it.
  - Escape closes it and returns focus to the trigger.
  - An outside click closes it.
- **Audio:**
  - Deafen also mutes the mic.
  - Undeafen restores the previous mic state, both when the mic was muted and when it was not.
  - The buttons expose `aria-pressed`.
- **Presence and contrast:**
  - Invisible presence does not raise the network banner.
  - Text, accent and focus contrast are calculated from tokens.css in tests, for both dark and light themes.
- **Languages:**
  - The full catalogue exists in English, Urdu, Arabic and Hindi (2,006 keys each).
  - Typecheck and a test enforce completeness and matching placeholders.
  - RTL was checked in Urdu and Arabic.
- **Screenshots (`shots/`):** 390 and 768 dark, 1024 light, 1440 dark, 1440 at 200% zoom, 1920 dark, 1440 Urdu and 390 Arabic light.

## Local simulations (the UI works; the outcome is labelled demo state)

- Payments go through a deterministic test gateway with success, failure, pending and cancel outcomes, plus refunds. The minor spend cap is checked before any payment starts.
- OTP and phone verification, email verification and password reset are simulated.
- Calls, voice, stage and screen share run through their states, but no media is sent.
- Report evidence uses simulated proof states.
- Anti-nuke snapshots and restore, bots, webhooks, developer apps (with fake credentials), creator KYC, prayer times and typing indicators are all simulated.
- Staff access uses demo SSO plus code 391000. Local role checks are presentation only, **not authorization**.
- Only preferences and the chosen presence status persist (`localStorage` key `ghar.ts.v1`). Demo records reset on reload. No passwords, codes, tokens, documents or payment details are stored.

## External dependencies (not buildable in a frontend-only scope)

- Account, auth and OAuth services, plus email and SMS delivery.
- Message delivery and realtime: sockets, typing indicators, presence fan-out.
- Media servers for calls and stage, and upload storage with scanning.
- A payment provider, payouts and KYC.
- Push notifications, including event reminders.
- A search index and a ranking pipeline.
- End-to-end encryption. None is implemented and none is claimed.
- Server-side authorization, audit integrity, backups and monitoring.

The PRD's backend and security phase gates have **not** been passed.

## Checklist summary (`TRACEABILITY.md`, also in Dev tools → Requirements)

138 requirement IDs:

| Status | Count |
|---|---|
| Implemented frontend behavior | 104 |
| Local simulation | 28 |
| Backend-infra only | 4 (ACC-06, MSG-14, NFR-13, NFR-14) |
| Removed-deferred | 1 (DEV-03, API docs) |
| Missing frontend work | 1 (NFR-12: no low-end-device profiling, no list virtualisation) |

The requirement titles in the checklist are short paraphrases. The PRD file was no longer in the workspace when the checklist was written, so check the titles against the PRD wording.


## Update: dashboard completion pass

### What changed
- **Controls:** a custom dropdown replaces every native `<select>`. It supports arrow keys, Home/End, typeahead, Escape returning focus to the trigger, a selected checkmark, and automatic search when there are more than 8 options. A calendar date picker replaces every native date input. It has month and year navigation, keyboard control of the grid, and respects min/max limits (dates of birth, event start times, staff date-range rules, search date ranges). Event start uses a date-plus-time field. Colour inputs became preset swatches with a validated hex field. Checkboxes and card radios are now custom styled.
  - All three use one shared floating layer built on the Popover API, so they sit above modal dialogs, stay inside the viewport and reposition on scroll or resize.
- **Icons:** UI emojis are now SVG icons from the existing icon set. This covers mood check-ins, profile flags, template channel lists, channel icons (an icon picker replaced the emoji field) and the sticker fallback. Menu checkmarks became check icons. The sparkle icon, which reads as "AI", was replaced: Boosted uses a lightning bolt, Plus a crown, Discover suggestions a thumbs-up and Recap a party icon.
  - Emoji the user writes or picks stays as-is: message text, reactions, the emoji picker and custom status.
  - The app had no AI badges or AI promotional labels to remove. Profile badges are unchanged.
- **Payments:** the outcome picker is gone from every payment dialog and from Wallet. Checkout now runs in steps: order review with the payment method and total, then a three-step processing view you can cancel, then one of these results:
  - success, with a receipt (amount, method, reference, time);
  - failure, with Try again and Review order (a forced failure applies to one attempt only, so a retry behaves like a fresh attempt);
  - cancelled, with Back to checkout;
  - pending, with Check status.

  Every checkout is labelled "Simulated payment · no real money". No card or wallet details are collected. Forcing an outcome is only possible from Developer tools.
- **Context menus:** right-click, Shift+F10 or the Menu key opens a menu on users (anywhere their avatar or name appears), messages, DM conversations and channels.
  - User actions: View profile, Message, Voice call, Video call, Send gift, Add friend, Copy username, Report and Block.
  - Message actions: the existing message actions plus the author's profile, a DM and a call.
  - Conversation and channel actions: open, call, mark as read, mute and edit.
  - Menus stay inside the viewport and support arrow keys and Escape. Text fields and selected text keep the browser's own menu.
- **Social profiles:** a new *Settings › Connected accounts* page links Instagram, X, YouTube, TikTok, Twitch, LinkedIn, Spotify or a website.
  - A link can be connected, made visible on the profile, opened or disconnected (with confirmation).
  - Links are honestly labelled "Unverified · demo", because nothing signs in to those services.
  - Pasted profile URLs are reduced to the handle, and each platform's handle format is validated.
  - Visible links appear as chips on the profile. Communities get the same feature under *Social profiles & webhooks*.
  - The GitHub and Trello repository workflows (pushes, pull requests, issues, boards) and their bot were removed. Incoming webhooks stay, with neutral copy and fake URLs.
- **Admin:** the staff console gained two sections.
  - *Users*: search and filter accounts and view each one's details, badges, linked profiles and report count. Staff can suspend an account (with duration and a required reason), lift a suspension (with confirmation) or send a warning. All of these change local state, are written to the audit log and show a toast. A suspended account shows a notice on its profile, and its message and call actions are disabled.
  - *Integration status*: every external dependency is listed as either "Simulated" or "Not connected", with usage counts and a Run check button.
  - Access is still behind the demo staff sign-in (demo SSO, then code 391000). That is a presentation, not real authorization.
- **Chat search:** a new *Search messages* page (home sidebar, or Ctrl+Shift+F) searches direct messages, rooms and servers.
  - Filters: conversation type, conversation or channel, sender, date range and attachments. They all combine (every one must match), and each list only offers choices that make sense with the other filters.
  - It shows active-filter chips that can be removed one at a time, a Reset all button, a result count, empty states, Show more, and highlighting of matched words (plain text only).
  - Clicking a result opens the conversation and scrolls to the message with a brief highlight.
  - Encrypted communities aren't searched, and the page says so.
  - The search panel inside a conversation has a "Search with filters" link to this page.
- **Layout:** long names, handles, URLs, file names and section headers now wrap or truncate inside their containers. Dialog footers wrap.

### Verification (this pass)
- **Checks:** typecheck is clean, 63 tests pass (new: social handle rules, chat search filter combinations, and keyboard/limit tests for the dropdown and date picker), and both builds succeed.
- **Error sweep:** 100 routes, 41 dialogs and 12 staff sections at 390, 768 and 1440 px, with 0 page or console errors.
- **Long-content check (`scripts/overflow.py`):** very long names, handles, URLs and file names were injected, then routes and dialogs were checked at 390, 768, 1024 and 1440 px. No page-level horizontal scroll and no content escaping its card or spilling text were found.
- **Scripted run of the new flows (`scripts/flow2.py`):** passes at 1440 and 390 px.
  - Checkout: success, forced failure followed by a successful retry, and cancelling during processing.
  - The dropdown inside a dialog, operated by keyboard.
  - The date picker operated by keyboard.
  - Context menus on a conversation, a message and a user (the user menu stays inside the viewport). The text box keeps the browser's own menu.
  - Social linking: the empty-field error, then a pasted URL becoming the handle.
  - Admin: the access gate, the suspend reason error, the suspension itself, and a service check.
  - Search: combined filters (3 results become 2), the empty state, and jump-to-message.
- **Screenshots:** `shots/flows/`, including Urdu in the light theme.

### Still limited
- Payments, social profile verification, SMS, email, push notifications, voice and video media, and webhook delivery all need live services. They remain simulated or not connected, as listed in Admin › Integration status.
- Staff access and suspensions are local demo state, not real authorization or enforcement.
- Search runs only over the copy of conversations held on this device. There is no server-side search index.
- The 163 new interface strings in Urdu, Arabic and Hindi were translated by AI and still need review by native speakers.

## Known gaps and notes

- The translations were produced by AI and have not been reviewed by native speakers. Have each language reviewed before release.
- Event reminders are only described in the UI. Their delivery is not simulated.
- The 44 px touch target is a project sizing choice, not described as a WCAG 2.2 AA minimum.
- `window.__ghar` exposes demo state for the screenshot and sweep scripts. Remove it for production.
