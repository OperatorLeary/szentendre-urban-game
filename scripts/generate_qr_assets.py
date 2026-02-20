#!/usr/bin/env python3
"""
Generate printable QR assets from the Phase 5 seed SQL.

Outputs:
- docs/qr-codes/svg/*.svg
- docs/qr-codes/png/*.png
- docs/qr-codes/print-sheet.html
"""

from __future__ import annotations

import argparse
import csv
import html
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import segno

LOCATIONS_INSERT_PATTERN = re.compile(
    r"insert\s+into\s+public\.locations\s*\(.*?\)\s*values(?P<values>.*?)on\s+conflict\s*\(slug\)\s*do\s+update",
    re.IGNORECASE | re.DOTALL,
)

LOCATION_TUPLE_PATTERN = re.compile(
    r"\(\s*'(?P<slug>[^']+)'\s*,\s*'(?P<name>[^']+)'\s*,\s*'[^']*'\s*,\s*"
    r"-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*\d+\s*,\s*"
    r"'(?P<payload>[^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*(?:true|false)\s*\)",
    re.IGNORECASE | re.DOTALL,
)


@dataclass(frozen=True)
class QrRecord:
    slug: str
    name: str
    payload: str


def parse_location_qr_records(seed_sql: str) -> list[QrRecord]:
    insert_match = LOCATIONS_INSERT_PATTERN.search(seed_sql)
    if insert_match is None:
        raise ValueError(
            "Could not find `insert into public.locations ... values ... on conflict` block."
        )

    values_block = insert_match.group("values")
    matches = list(LOCATION_TUPLE_PATTERN.finditer(values_block))
    if not matches:
        raise ValueError("Could not parse any location tuples from the seed SQL.")

    records: list[QrRecord] = []
    for match in matches:
        records.append(
            QrRecord(
                slug=match.group("slug").strip(),
                name=match.group("name").strip(),
                payload=match.group("payload").strip(),
            )
        )

    return records


def parse_csv_qr_records(csv_path: Path) -> list[QrRecord]:
    if not csv_path.exists():
        raise ValueError(f"CSV file not found: {csv_path}")

    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            raise ValueError("CSV file has no header row.")

        normalized_header = {name.strip().lower(): name for name in reader.fieldnames}
        slug_key = normalized_header.get("slug")
        name_key = normalized_header.get("name")
        payload_key = (
            normalized_header.get("qr_code_value")
            or normalized_header.get("payload")
            or normalized_header.get("qr")
        )

        if slug_key is None or name_key is None or payload_key is None:
            raise ValueError(
                "CSV must include columns: slug, name, qr_code_value (or payload)."
            )

        records: list[QrRecord] = []
        for row in reader:
            slug = (row.get(slug_key) or "").strip()
            name = (row.get(name_key) or "").strip()
            payload = (row.get(payload_key) or "").strip()
            if not slug or not name or not payload:
                continue

            records.append(QrRecord(slug=slug, name=name, payload=payload))

    if not records:
        raise ValueError("CSV did not contain any valid QR rows.")

    return records


def resolve_payload(payload: str, base_url: str | None) -> str:
    if base_url is None:
        return payload

    normalized_base = base_url.rstrip("/")
    if payload.startswith("http://") or payload.startswith("https://"):
        return payload

    if payload.startswith("/"):
        return f"{normalized_base}{payload}"

    return f"{normalized_base}/{payload}"


def write_qr_assets(
    records: Iterable[QrRecord],
    output_dir: Path,
    base_url: str | None,
    png_scale: int,
) -> list[tuple[QrRecord, str]]:
    svg_dir = output_dir / "svg"
    png_dir = output_dir / "png"
    svg_dir.mkdir(parents=True, exist_ok=True)
    png_dir.mkdir(parents=True, exist_ok=True)

    rendered: list[tuple[QrRecord, str]] = []
    for record in records:
        encoded_payload = resolve_payload(record.payload, base_url)
        qr = segno.make(encoded_payload, error="h")

        qr.save(svg_dir / f"{record.slug}.svg", scale=8, border=4)
        qr.save(
            png_dir / f"{record.slug}.png",
            scale=png_scale,
            border=4,
            dark="#0f172a",
            light="#ffffff",
        )
        rendered.append((record, encoded_payload))

    return rendered


def write_print_sheet(output_dir: Path, rendered: list[tuple[QrRecord, str]]) -> None:
    cards_html: list[str] = []
    for record, payload in rendered:
        cards_html.append(
            f"""
      <article class="card">
        <h2>{html.escape(record.name)}</h2>
        <p class="slug">{html.escape(record.slug)}</p>
        <img src="png/{html.escape(record.slug)}.png" alt="QR code for {html.escape(record.name)}" />
        <p class="payload">{html.escape(payload)}</p>
      </article>
"""
        )

    html_content = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Szentendre City Quest - Printable QR Sheet</title>
  <style>
    @page {{
      size: A4 portrait;
      margin: 10mm;
    }}
    * {{
      box-sizing: border-box;
    }}
    body {{
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #102234;
    }}
    h1 {{
      margin: 0 0 6mm;
      font-size: 20px;
    }}
    .meta {{
      margin: 0 0 8mm;
      color: #36506a;
      font-size: 13px;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6mm;
    }}
    .card {{
      border: 1px solid #cad7e5;
      border-radius: 8px;
      padding: 4mm;
      break-inside: avoid;
      page-break-inside: avoid;
      text-align: center;
    }}
    .card h2 {{
      margin: 0;
      font-size: 16px;
    }}
    .slug {{
      margin: 1.5mm 0 3mm;
      color: #47627c;
      font-size: 12px;
    }}
    img {{
      width: 100%;
      max-width: 240px;
      height: auto;
      display: block;
      margin: 0 auto;
      image-rendering: pixelated;
    }}
    .payload {{
      margin: 3mm 0 0;
      font-size: 11px;
      color: #4a5f74;
      word-break: break-all;
    }}
  </style>
</head>
<body>
  <h1>Szentendre City Quest - Printable QR Sheet</h1>
  <p class="meta">Print at 100% scale. Recommended minimum QR width: 5 cm.</p>
  <section class="grid">
{''.join(cards_html)}
  </section>
</body>
</html>
"""
    (output_dir / "print-sheet.html").write_text(html_content, encoding="utf-8")


def write_readme(output_dir: Path, base_url: str | None, source_description: str) -> None:
    payload_mode = (
        f"Full URL mode (`--base-url {base_url}`)"
        if base_url is not None
        else "Relative payload mode (values from DB `qr_code_value`)"
    )
    content = f"""# QR Print Assets

Generated from {source_description}.

Mode: {payload_mode}

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
"""
    (output_dir / "README.md").write_text(content, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate printable QR assets.")
    parser.add_argument(
        "--csv-file",
        default=None,
        help="Optional CSV file with columns slug,name,qr_code_value (or payload).",
    )
    parser.add_argument(
        "--seed-file",
        default="supabase/migrations/202602190002_phase5_seed_routes.sql",
        help="Path to seed SQL file (used when --csv-file is not provided).",
    )
    parser.add_argument(
        "--output-dir",
        default="docs/qr-codes",
        help="Directory where generated assets are written.",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="Optional site base URL. If provided, payloads are emitted as full URLs.",
    )
    parser.add_argument(
        "--png-scale",
        default=12,
        type=int,
        help="PNG scale factor (higher = larger image).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    source_description: str

    if args.csv_file is not None:
        csv_path = Path(args.csv_file)
        records = parse_csv_qr_records(csv_path)
        source_description = f"`{csv_path.as_posix()}`"
    else:
        seed_path = Path(args.seed_file)
        seed_sql = seed_path.read_text(encoding="utf-8")
        records = parse_location_qr_records(seed_sql)
        source_description = f"`{seed_path.as_posix()}`"

    rendered = write_qr_assets(records, output_dir, args.base_url, args.png_scale)
    write_print_sheet(output_dir, rendered)
    write_readme(output_dir, args.base_url, source_description)

    print(f"Generated {len(rendered)} QR records in: {output_dir}")
    for record, payload in rendered:
        print(f"- {record.slug}: {payload}")


if __name__ == "__main__":
    main()
