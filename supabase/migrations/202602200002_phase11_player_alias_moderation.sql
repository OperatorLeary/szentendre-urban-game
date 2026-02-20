-- Phase 11: Player alias moderation guardrails
-- Enforces a basic anti-grief policy at database level.

create or replace function public.normalize_alias_for_moderation(input_text text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      translate(
        lower(coalesce(input_text, '')),
        'áéíóöőúüű',
        'aeiooouuu'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

comment on function public.normalize_alias_for_moderation(text) is
  'Normalizes player aliases for policy checks (trim, lowercase, remove accents, collapse separators).';

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
    from unnest(alias_tokens) as token
    where token = any (blocked_tokens)
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
  'Raises an error when player alias contains blocked content or contact/link-style data.';

create or replace function public.validate_runs_player_alias_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_player_alias_allowed(new.player_alias);
  return new;
end;
$$;

drop trigger if exists trg_runs_validate_player_alias on public.runs;
create trigger trg_runs_validate_player_alias
before insert or update of player_alias on public.runs
for each row
execute function public.validate_runs_player_alias_trigger();
