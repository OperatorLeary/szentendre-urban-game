# Git Strategy

## Branch Model
- `main`: production branch
- `develop`: integration branch
- `feature/*`: feature implementation branches
- `hotfix/*`: urgent production fixes

## Naming Examples
- `feature/route-engine-session-flow`
- `feature/pwa-install-and-offline-cache`
- `hotfix/cloudflare-build-regression`

## Conventional Commit Examples
- `feat(route): add dynamic station route engine`
- `feat(validation): enforce answer correctness for gps and qr checkins`
- `fix(pwa): register service worker for auto update`
- `refactor(infra): split supabase repositories by aggregate`
- `docs(deploy): add cloudflare pages deployment guide`
- `chore(ci): trigger pages redeploy`

## Pull Request Rules
- Keep PRs atomic and scoped.
- Include deployment impact notes.
- Include database migration references if schema changed.
- Include manual test checklist for:
  - route selection
  - gps validation
  - qr override
  - bug report submission
  - pwa install flow
