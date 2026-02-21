Original prompt: things I don't like currently is when theme is on dark and I hover over some buttons it's way too white and the button becomes unreadable on PC at least when you press it, maybe it's a no factor on phone but I feel like it could be worth fixing, what do you think?

- 2026-02-20: Investigated dark-theme button contrast issue. Found `.quest-button--ghost` in `src/styles/global.css` uses light text in dark mode, while the shared hover style (`.quest-button--ghost:not(:disabled):hover`) sets a near-white background, causing low contrast.
- Plan: add dark-theme-specific hover/active styles for ghost buttons to keep background dark enough for readability.
- 2026-02-20: Added dark-mode-specific .quest-button--ghost hover and active overrides in src/styles/global.css so interactive states stay dark and text remains readable on desktop.
- 2026-02-20: 
pm run build passed after CSS update. Attempted Playwright skill client verification, but it is unavailable in this environment because the playwright package is not installed.
- 2026-02-20: Added phase 12 migration to harden alias moderation against numeric-affix bypasses (e.g. fasz67, 67fasz).
- 2026-02-20: Implemented first-pass text-first navigation mode on quest page with optional map hint toggle (persisted in localStorage). Added HU/EN translations and layout styles.
- 2026-02-20: Added phase 15 schema support for layered station instructions (instruction_brief*, instruction_full*) and connected it to Location entity/repository + quest navigation UI with collapsible detailed text and fallback behavior.
- 2026-02-20: Added Phase 16 SQL seed for 24-station HU instruction content (202602200007_phase16_seed_long_route_hu_instructions.sql) mapped by long route sequence index with missing-sequence reporting.
- 2026-02-20: Implemented QR-entry restart mode for better tourist UX: when entering a station via QR start flow (`?entry=qr`), same-route active runs are safely abandoned and a new run is started from the scanned station sequence.
- 2026-02-20: Added Phase 19 migration (`202602200010_phase19_long_route_qr_entry_param.sql`) to backfill long-route QR payloads with `?entry=qr` for consistent QR-first onboarding.
- 2026-02-20: Implemented route-specific station content model (Phase 20) with new `route_stations` table, backfill + RLS, and repository read-path support with safe fallback to legacy `locations` fields if migration is not yet applied.
- 2026-02-21: Validation run for "make sure everything works and the website builds properly" completed.
- 2026-02-21: `npm run check` passed (lint, typecheck, build). Vite production build completed and PWA assets generated without errors.
- 2026-02-21: Runtime smoke checks passed for both dev (`npm run dev -- --host 127.0.0.1 --port 4173`) and preview (`npm run preview -- --host 127.0.0.1 --port 4174`) with HTTP 200 and expected HTML title.
- 2026-02-21: Attempted required `develop-web-game` Playwright client run; blocked because `playwright` package is not installed in this repo/environment (`ERR_MODULE_NOT_FOUND` from `web_game_playwright_client.js`).
- TODO: Install Playwright (`npm i -D playwright` and `npx playwright install`) if automated gameplay verification with the skill client is needed in future runs.
- 2026-02-21: Implemented broad UI/UX pass across app shell, home, quest, and admin.
- 2026-02-21: Added reusable dialog accessibility hook (`useDialogA11y`) and wired it to QR scanner, bug report modal, abandon dialog, and desktop notice (focus trap, Escape close, focus restore, dialog labels, backdrop close).
- 2026-02-21: Improved QR scanner reliability with error throttling and clearer camera guidance/error mapping (permission denied / no camera / insecure context), plus new localized copy.
- 2026-02-21: Improved control semantics and keyboard UX: theme switcher + quest navigation mode now use radio semantics with arrow-key navigation.
- 2026-02-21: Added route-context layout handling to prevent fixed-control overlap on mobile quest screens (`app-shell--quest-route` spacing + FAB offsets).
- 2026-02-21: Home page improvements: route cards now show metadata (station count + estimated minutes), and errors are split by scope (route/alias/scanner) with transient auto-clear for alias/scanner.
- 2026-02-21: Admin editor workflow upgrades: dirty-only filter, publish-all-dirty action, inline confirmation panel replacing repetitive `window.confirm`, and summary feedback for batch publish.
- 2026-02-21: Geolocation resilience pass: retain last known snapshot on GPS request failures and surface live GPS-fix age/stale status in quest UI.
- 2026-02-21: `npm run check` passes after changes (lint + typecheck + build).
- 2026-02-21: Re-attempted Playwright skill client validation; still blocked by missing `playwright` dependency (`ERR_MODULE_NOT_FOUND`).
