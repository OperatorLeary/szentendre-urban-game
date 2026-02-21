# Release Checklist (Preview/Staging)

Use this checklist before promoting changes to `main`.

## 1) Build and static quality
- Run `npm run check` locally.
- Confirm all pass:
  - `lint`
  - `typecheck`
  - `build`

## 2) Supabase SQL audits (read-only)
- In Supabase SQL Editor (preview/staging), run:
  1. `docs/supabase_health_check.sql`
  2. `docs/supabase_route_profile_audit.sql`
- Save/copy result summary to release notes.
- All critical checks must be `PASS`.

## 3) Route selection smoke
- Open home page.
- Verify route cards load and are selectable:
  - Short
  - Medium
  - Long
- Verify displayed station counts and estimated durations look sane.

## 4) QR/profile matrix sanity
- Validate QR-start behavior from:
  - early station (e.g. sequence 1)
  - mid station (e.g. sequence 12)
  - late station (e.g. sequence 24)
- For each selected profile:
  - `short`: progress denominator is `3`
  - `medium`: progress denominator is `12`
  - `long`: progress denominator is `24`
- Ensure first next-step after check-in is logical from scanned start (including wrap-around cases like `24 -> 1`).

## 5) Progression integrity
- No dead-end station transitions.
- No repeated loop before completion unless data is intentionally cyclical.
- Completion occurs exactly at target profile length.

## 6) Validation paths
- GPS valid path: accepted when in radius.
- GPS invalid path: rejects outside radius.
- QR override valid path: accepted for correct station QR.
- QR override invalid path: rejected for mismatched QR.
- Teacher override path:
  - `teacher-bypass` should be accepted (supervised/demo mode).

## 7) Run/session behavior
- Only one active run per device at a time.
- `entry=qr` triggers requested-start behavior only on entry load.
- Abandon flow:
  - confirmation shown
  - active run transitions correctly
  - user returns to home

## 8) Completion summary behavior
- Verify final summary shows:
  - total duration
  - stations completed
  - completed timestamp
- Verify share and download card actions work.

## 9) Offline/online retry sanity
- While offline:
  - GPS/QR validation queues or fails gracefully.
- After reconnect:
  - queued validation retries correctly.

## 10) PWA/cache sanity after deploy
- Hard refresh once after deploy.
- Verify current build behavior (no stale logic from older service worker/assets).
- Confirm route-profile and bypass behavior matches current release.

## 11) Final gate decision
- Record:
  - SQL audit status
  - CI smoke status
  - manual checklist status
  - known issues/waivers
- If any critical item fails: do not promote.
