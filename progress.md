Original prompt: things I don't like currently is when theme is on dark and I hover over some buttons it's way too white and the button becomes unreadable on PC at least when you press it, maybe it's a no factor on phone but I feel like it could be worth fixing, what do you think?

- 2026-02-20: Investigated dark-theme button contrast issue. Found `.quest-button--ghost` in `src/styles/global.css` uses light text in dark mode, while the shared hover style (`.quest-button--ghost:not(:disabled):hover`) sets a near-white background, causing low contrast.
- Plan: add dark-theme-specific hover/active styles for ghost buttons to keep background dark enough for readability.
- 2026-02-20: Added dark-mode-specific .quest-button--ghost hover and active overrides in src/styles/global.css so interactive states stay dark and text remains readable on desktop.
- 2026-02-20: 
pm run build passed after CSS update. Attempted Playwright skill client verification, but it is unavailable in this environment because the playwright package is not installed.
- 2026-02-20: Added phase 12 migration to harden alias moderation against numeric-affix bypasses (e.g. fasz67, 67fasz).
