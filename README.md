# Szentendre City Quest

Production-oriented mobile-first PWA for route-based city exploration with:

- Route selection or direct QR entry
- Guided station progression
- GPS validation (primary)
- QR override validation (fallback)
- Bug report telemetry
- Supabase-backed persistence with RLS

## Stack
- React + TypeScript (strict)
- Vite + React Router
- Leaflet
- Supabase (Postgres + RLS)
- `vite-plugin-pwa`

## Environment Variables
Create `.env` from `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DEFAULT_ROUTE_SLUG`
- `VITE_DEVICE_ID_STORAGE_KEY`

## Database Setup
Apply migrations in order:

1. `supabase/migrations/202602190001_phase3_initial_schema.sql`
2. `supabase/migrations/202602190002_phase5_seed_routes.sql`
3. `supabase/migrations/202602190003_phase6_checkin_answer_constraints.sql`
4. `supabase/migrations/202602190004_phase8_bilingual_answers.sql`
5. `supabase/migrations/202602200001_phase10_hungarian_question_prompts.sql`

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Cloudflare Pages
- Framework preset: `React (Vite)`
- Build command: `npm run build`
- Output directory: `dist`
- Add all required `VITE_*` variables in Production and Preview

See `docs/deployment/cloudflare-pages.md` for details.

## Project Context and Handoff
- High-level project brief and decision log anchor: `docs/project-context.md`
- Chronological implementation notes: `progress.md`

## QA and Audit
- Release checklist: `docs/qa/release-checklist.md`
- Release gate matrix: `docs/qa/release-gate.md`
- Supabase health audit (read-only): `docs/supabase_health_check.sql`
- Route/profile audit (read-only): `docs/supabase_route_profile_audit.sql`

## Smoke Automation
- Core flow smoke: `npm run test:smoke:core`
- QR profile smoke: `npm run test:smoke:qr-profiles`
- Combined smoke: `npm run test:smoke`

Recommended local run order:
1. `npm run build`
2. `npm run preview -- --host 127.0.0.1 --port 4173`
3. In a second terminal: `npm run test:smoke`

Smoke scripts can be configured with:
- `SMOKE_BASE_URL` (default: `http://127.0.0.1:4173`)
- `SMOKE_QR_ROUTE_SLUG` (default: `long`)
- `SMOKE_QR_START_SLUG` (default: `petzelt-jozsef-tabla`)
- `SMOKE_CORE_FALLBACK_PATH` (default: `/r/long/l/petzelt-jozsef-tabla?entry=qr&profile=short`)

CI smoke in `.github/workflows/ci.yml` expects staging secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Optional: `VITE_DEFAULT_ROUTE_SLUG`, `VITE_DEVICE_ID_STORAGE_KEY`
