-- Phase 19: Ensure long-route QR payloads carry entry marker for QR-first session start
-- Backfills `/r/long/l/{slug}?entry=qr` for all active long-route stations.

with long_route as (
  select id
  from public.routes
  where slug = 'long'
  limit 1
),
target_locations as (
  select distinct l.id, l.slug
  from public.route_locations rl
  join long_route lr
    on lr.id = rl.route_id
  join public.locations l
    on l.id = rl.location_id
  where l.is_active = true
),
updated as (
  update public.locations l
  set
    qr_code_value = format('/r/long/l/%s?entry=qr', tl.slug),
    updated_at = now()
  from target_locations tl
  where l.id = tl.id
    and l.qr_code_value <> format('/r/long/l/%s?entry=qr', tl.slug)
  returning l.id
)
select count(*) as updated_qr_payload_count
from updated;
