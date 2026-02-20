-- Phase 14: Player alias moderation non-bypassable hardening
-- Enforces blocked-term matching on a compacted alias representation
-- (digits/separators removed), so bypasses like "f-a-s-z", "f6a7s8z", "67fasz70"
-- and phrase variants are rejected.

create or replace function public.assert_player_alias_allowed(input_alias text)
returns void
language plpgsql
as $$
declare
  normalized_alias text;
  compact_alias text;
  blocked_tokens constant text[] := array[
    'nazi', 'hitler', 'heil', 'kkk', 'isis', 'terror', 'terrorist', 'terrorista',
    'pedo', 'pedofil', 'drug', 'drog',
    'fuck', 'fck', 'shit', 'kurva', 'fasz', 'geci', 'baszd', 'picsa',
    'szex', 'sex', 'porno', 'porn',
    'racist', 'rasszista',
    'orban', 'trump', 'biden', 'putin', 'fidesz'
  ];
  blocked_phrases constant text[] := array[
    'mi hazank',
    'white power',
    'heil hitler'
  ];
begin
  if input_alias ~* '(https?://|www\.|[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})' then
    raise exception 'player_alias_contact_or_url_not_allowed'
      using errcode = '23514';
  end if;

  normalized_alias := public.normalize_alias_for_moderation(input_alias);
  if normalized_alias = '' then
    return;
  end if;

  compact_alias := regexp_replace(normalized_alias, '[^a-z]+', '', 'g');

  if exists (
    select 1
    from unnest(blocked_tokens) as blocked(blocked_token)
    where position(blocked.blocked_token in compact_alias) > 0
  ) then
    raise exception 'player_alias_contains_blocked_content'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(blocked_phrases) as phrase
    where position(' ' || phrase || ' ' in ' ' || normalized_alias || ' ') > 0
       or position(replace(phrase, ' ', '') in compact_alias) > 0
  ) then
    raise exception 'player_alias_contains_blocked_content'
      using errcode = '23514';
  end if;
end;
$$;

comment on function public.assert_player_alias_allowed(text) is
  'Raises an error when player alias contains blocked content or contact/link-style data. Uses compact alias matching (digits/separators removed) to prevent bypasses.';
