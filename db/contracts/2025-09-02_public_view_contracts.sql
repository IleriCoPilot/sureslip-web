-- SureSlip: lock FE-facing public view shapes + grants + asserts

create or replace function api._confed_region(confed text)
returns text language sql stable as $$
select case upper(trim($1))
  when 'UEFA' then 'Europe'
  when 'CONMEBOL' then 'South America'
  when 'CONCACAF' then 'North/Central America'
  when 'AFC' then 'Asia'
  when 'CAF' then 'Africa'
  when 'OFC' then 'Oceania'
  else null
end;
$$;

comment on function api._confed_region(text) is
'Maps confederation code to a broad region label. Used by public views.';

grant usage on schema api to anon;
grant select on table api.v_competitions_public          to anon;
grant select on table api.v_candidates_today_public      to anon;
grant select on table api.v_candidates_next_48h_public   to anon;

create or replace function api._set_view_shape_comment(p_view regclass)
returns void language plpgsql as $$
declare cols text;
begin
  select '(' || string_agg(quote_ident(column_name), ',') || ')'
  into cols
  from information_schema.columns
  where table_schema = split_part(p_view::text, '.', 1)
    and table_name   = split_part(p_view::text, '.', 2)
  order by ordinal_position;

  execute format($f$
    comment on view %s is $$Shape: %s$$
  $f$, p_view, cols);
end;
$$;

create or replace function api.assert_view_shape(p_view regclass)
returns void language plpgsql as $$
declare recorded text; current text;
begin
  select obj_description(p_view, 'pg_class') into recorded;
  if recorded is null or position('Shape:' in recorded) = 0 then
    raise exception 'View % has no Shape: comment', p_view::text;
  end if;

  recorded := regexp_replace(recorded, '.*Shape:\s*', '');

  select '(' || string_agg(quote_ident(column_name), ',') || ')'
  into current
  from information_schema.columns
  where table_schema = split_part(p_view::text, '.', 1)
    and table_name   = split_part(p_view::text, '.', 2)
  order by ordinal_position;

  if current is distinct from recorded then
    raise exception 'View % shape mismatch. Expected %, got %',
      p_view::text, recorded, current;
  end if;
end;
$$;

comment on function api.assert_view_shape(regclass) is
'Asserts that a view’s column names/order match the recorded Shape: comment.';

select api._set_view_shape_comment('api.v_competitions_public'::regclass);
select api._set_view_shape_comment('api.v_candidates_today_public'::regclass);
select api._set_view_shape_comment('api.v_candidates_next_48h_public'::regclass);

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='api' and table_name='v_competitions_public'
               and column_name='code') then
    comment on column api.v_competitions_public.code          is 'Short code.';
    comment on column api.v_competitions_public.name          is 'Display name.';
    comment on column api.v_competitions_public.region        is 'Derived via _confed_region.';
    comment on column api.v_competitions_public.confederation is 'UEFA/CAF/AFC/CONMEBOL/CONCACAF/OFC.';
    comment on column api.v_competitions_public.tier          is 'Domestic/confed tier.';
    comment on column api.v_competitions_public.competition   is 'Canonical slug/code.';
    comment on column api.v_competitions_public.season        is 'Season label (e.g., 2025/26).';
  end if;
end $$;

select api.assert_view_shape('api.v_competitions_public'::regclass);
select api.assert_view_shape('api.v_candidates_today_public'::regclass);
select api.assert_view_shape('api.v_candidates_next_48h_public'::regclass);
