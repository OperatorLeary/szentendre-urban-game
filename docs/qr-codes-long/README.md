# QR Print Assets

Generated from `tmp/long-route-qr.csv`.

Mode: Full URL mode (`--base-url https://your-real-domain.com`)

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
