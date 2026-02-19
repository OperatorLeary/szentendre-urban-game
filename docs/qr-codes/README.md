# QR Print Assets

Generated from `supabase/migrations/202602190002_phase5_seed_routes.sql`.

Mode: Full URL mode (`--base-url https://szentendre-urban-game.pages.dev/`)

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
