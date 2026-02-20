-- Phase 13: Player alias moderation substring hardening
-- Blocks blocked terms even when extra letters/numbers are attached
-- (e.g. "fasz67", "67fasz", "orbanfan", "xhitlery").

create or replace function public.assert_player_alias_allowed(input_alias text)
returns void
language plpgsql
as $$
declare
  normalized_alias text;
  alias_tokens text[];
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

  alias_tokens := regexp_split_to_array(normalized_alias, '\s+');
  if exists (
    select 1
    from unnest(alias_tokens) as alias_token(token)
    join unnest(blocked_tokens) as blocked(blocked_token)
      on position(blocked.blocked_token in alias_token.token) > 0
  ) then
    raise exception 'player_alias_contains_blocked_content'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(blocked_phrases) as phrase
    where position(' ' || phrase || ' ' in ' ' || normalized_alias || ' ') > 0
  ) then
    raise exception 'player_alias_contains_blocked_content'
      using errcode = '23514';
  end if;
end;
$$;

comment on function public.assert_player_alias_allowed(text) is
  'Raises an error when player alias contains blocked content or contact/link-style data. Also blocks blocked-token substring/affix bypasses.';
