# QR Print Assets

Generated from `supabase/migrations/202602190002_phase5_seed_routes.sql`.

Mode: Relative payload mode (values from DB `qr_code_value`)

## Files
- `svg/*.svg`: vector QR assets
- `png/*.png`: raster QR assets
- `print-sheet.html`: print-friendly A4 sheet

## Regenerate
```bash
python scripts/generate_qr_assets.py
```

Use full URLs:
```bash
python scripts/generate_qr_assets.py --base-url https://your-domain.com
```
