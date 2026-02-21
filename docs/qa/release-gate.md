# Release Gate

Use this as the go/no-go matrix for preview/staging validation.

## Required pass matrix

1. SQL audits pass
- `docs/supabase_health_check.sql`: critical checks `PASS`
- `docs/supabase_route_profile_audit.sql`: critical checks `PASS`

2. CI smoke pass
- GitHub Actions `ci` workflow is green for:
  - lint
  - typecheck
  - build
  - smoke browser checks

3. Manual checklist pass
- `docs/qa/release-checklist.md` executed and completed.

4. Preview device validation pass
- At least one mobile real-device sanity run done on preview URL.
- Route profile QR start verified.

## Fail policy
- If any required category fails, release is blocked.
- Waivers must be explicitly documented with:
  - issue reference
  - risk statement
  - rollback plan

## Evidence to capture per release
- CI run URL.
- SQL summary output snapshot.
- Manual checklist completion note.
- Preview URL tested.
