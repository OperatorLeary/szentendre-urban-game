# Project Context

Last updated: 2026-02-21

## Product
Szentendre City Quest is a mobile-first PWA city game where users complete station-based routes with GPS + QR validation.

## Core Goals
- Very easy onboarding for tourists and first-time users.
- Privacy-first runtime behavior.
- Minimal UI clutter on mobile.
- Stable progression logic without route dead-ends or loops.

## Non-Negotiable UX Principles
- Default QR onboarding should not force users into a 180-minute run.
- Users should be able to scan from any station and still start logically.
- GPS is primary, QR is fallback.
- Manual QR text typing should not be the primary UX path.
- Keep interface minimal, readable, and touch-friendly.

## Current Route Model
- `short`: 3 stations
- `medium`: 12 stations
- `long`: 24 stations

Notes:
- Medium was rebalanced from the first 12 long-route stations (Phase 22 migration).
- QR start now supports route profile selection (`short`, `medium`, `long`).
- Session/check-in progression uses start-anchored route segments with wrap-around for QR starts.

## Security and Data Constraints
- Device-bound runtime access via `x-device-id` (Phase 23 RLS hardening).
- One active run per device at a time.
- No broad/global gameplay bypass answer in production.
- Avoid collecting personal user data unless strictly necessary.

## Content Model Decisions
- Route-specific station content lives in `route_stations` (Phase 20).
- `locations` still serve as fallback source if route-specific fields are absent.
- Long-route Hungarian instruction content has been seeded.

## Admin and Operations
- Admin editing flow is magic-link based + allowlist (`admin_users`, Phase 21).
- Cloudflare Pages deploy is active.
- Backup script exists: `scripts/backup-all.ps1`.

## Where To Look First
- Runtime flow:
  - `src/presentation/pages/HomePage.tsx`
  - `src/presentation/pages/QuestLocationPage.tsx`
- Session/progression:
  - `src/application/use-cases/ensure-run-session.use-case.ts`
  - `src/core/services/game-session.service.ts`
- QR route resolution:
  - `src/application/use-cases/resolve-qr-entry-route.use-case.ts`
- Validation:
  - `src/application/use-cases/validate-gps-checkin.use-case.ts`
  - `src/application/use-cases/validate-qr-checkin.use-case.ts`
- DB migrations:
  - `supabase/migrations/202602210001_phase22_rebalance_medium_route.sql`
  - `supabase/migrations/202602210002_phase23_device_bound_runtime_rls.sql`

## Working Rules For Future Chats
- Read this file and `progress.md` before proposing architectural changes.
- Preserve mobile-first minimal UI direction.
- Keep privacy-first defaults.
- Run `npm run check` after implementation.
- Prefer additive migrations; do not rewrite applied migration history.

## Current Open Items
- End-to-end manual QA for "scan any station" across all three route profiles.
- Final UX polish pass for onboarding clarity and route-duration expectation text.
- Keep CI smoke secrets configured on all active GitHub environments.
- Keep release evidence snapshots (SQL + CI + manual checklist) attached per release.

## Release Gate
- SQL audits:
  - `docs/supabase_health_check.sql`
  - `docs/supabase_route_profile_audit.sql`
- CI required checks:
  - lint
  - typecheck
  - build
  - smoke browser checks
- Manual gate:
  - `docs/qa/release-checklist.md`
- Final decision matrix:
  - `docs/qa/release-gate.md`

## Session Update Template (Minimal)
Use this in `progress.md` for new entries:

```md
- YYYY-MM-DD: <what changed in one line>
- Scope: <files or module area>
- Why: <user/problem this solves>
- Validation: <command + result, e.g. npm run check passed>
- Follow-up: <optional next step or "none">
```
