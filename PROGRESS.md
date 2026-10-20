# Ghar TS frontend — working notes (survives context compaction)

Source reference: /tmp/claude-0/-home-claude/5ec4e3df-6130-5c59-83ea-d74cd496e045/scratchpad/w/src/{js,css} (GharReal.html == that build).
Brief: user message with sections 1–10 (up399→upper-right account hub, up400→top app bar, presence, neutral palette, popularity/leaderboards event model, gaps table, i18n, tests, delivery).
Missing input: "main prompt for gpt.txt" (not attached). C:\dashboard not connected → isolated project here.

## Stack
Vite 6 + React 19 + TS 5.9 strict (noUncheckedIndexedAccess) + zustand 5/immer + lucide-react + vitest/jsdom. `npm run typecheck|test|build|build:single`.

## Architecture
- src/types/models.ts — all domain types (discriminated unions).
- src/fixtures/* — typed fictional data (no UI).
- src/domain/* — pure logic + *.test.ts (popularity, leaderboard, username, age, presence, payments, settingsSearch, contrast, markdown, time).
- src/state/store.ts — single zustand store (immer). Actions in src/state/actions/*.ts call `update(draft => …)`.
  Persistence: whitelist of prefs + fictional demo records only (key ghar.ts.v1). Never passwords/codes/tokens/ID/payment creds/real photos.
- src/i18n — typed catalogue; en is source; ur/ar/hi `satisfies Record<Key,string>` so typecheck enforces completeness.
- src/ui/* primitives; src/shell/* (AppBar=up400, AccountHub=up399, AudioControls, Sidebar, RightPanel, MobileNav); src/features/*.
- Route = discriminated union in store, synced to location.hash.
- Dev tools (persona adult/minor/staff, gateway outcome, net state, traceability) opened with Ctrl+Shift+D or #dev — not in ordinary settings.

## Status log
(append as work completes)
## 07:53 Done: domain+tests, fixtures, store, i18n infra, ui primitives, shell (AppBar up400, AccountHub up399, Audio, Sidebar, Shell), chat (Messages, Composer, Channel/Voice/Stage/Forum/Widgets/Panels), home (Inbox, Friends, Calls, Logs, Communities, Relationships, DmView), popularity (page, leaderboards), payments modals, actions (ui, presence, audio, net, messages, calls, auth, community, social, stories, payments, portal). TODO: features.css, ModalHost+other modals, Events, Discover, Profile, StoryViewer, Recap, Settings, ServerSettings+Portal, Staff, Auth/Onboarding, DevTools, translations, verification.

## 08:55 — delivered
Auth, onboarding and dev tools are done, along with screens.css and full ur/ar/hi catalogues (typecheck-enforced). TRACEABILITY.md and REPORT.md are written. Sweeps show 0 errors; 54 tests pass; typecheck and build are clean.
