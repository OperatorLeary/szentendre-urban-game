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
