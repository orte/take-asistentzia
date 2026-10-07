-- TAKE – Bazkideen asistentzia · esquema inicial
--
-- Ejecutar en el SQL Editor de Supabase (región UE). Crea tablas, RLS,
-- grants explícitos, funciones del ranking público y la publicación Realtime.
--
-- Roles (recordatorio): la publishable key usa `anon` sin sesión y
-- `authenticated` tras login; la secret key usa `service_role` (BYPASSRLS).
-- Ver PLAN §5.

-- ============================================================================
-- Tablas
-- ============================================================================

create table public.members (
  number      integer primary key check (number > 0),
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  season      text not null,            -- formato '2026-27'
  match_date  date not null,
  opponent    text not null,
  created_at  timestamptz not null default now()
);

create table public.attendances (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references public.matches(id) on delete cascade,
  member_number  integer not null references public.members(number) on delete restrict,
  registered_at  timestamptz not null default now(),
  device_label   text,                  -- p. ej. 'Atea 1'
  unique (match_id, member_number)
);

-- Índices de apoyo. El unique (match_id, member_number) ya cubre los filtros
-- por match_id (columna líder), así que no hace falta otro para eso.
create index matches_season_idx on public.matches (season);
create index attendances_member_number_idx on public.attendances (member_number);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.members     enable row level security;
alter table public.matches     enable row level security;
alter table public.attendances enable row level security;

-- `authenticated`: lectura y escritura completas en las tres tablas.
create policy "authenticated full access" on public.members
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.matches
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.attendances
  for all to authenticated using (true) with check (true);

-- `anon`: sin políticas => RLS deniega todo acceso directo a las tablas.
-- El ranking público llega solo por las funciones `security definer` de abajo.

-- ============================================================================
-- Grants explícitos
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- authenticated puede operar sobre las tablas (acotado por RLS).
grant select, insert, update, delete on public.members     to authenticated;
grant select, insert, update, delete on public.matches     to authenticated;
grant select, insert, update, delete on public.attendances to authenticated;

-- anon no toca las tablas ni aunque Supabase le diese grants por defecto.
revoke all on public.members     from anon;
revoke all on public.matches     from anon;
revoke all on public.attendances from anon;

-- ============================================================================
-- Funciones del ranking público (security definer)
-- ============================================================================
-- Se ejecutan como el owner (postgres), saltándose la RLS, para que `anon`
-- pueda leer el ranking sin acceso directo a las tablas. search_path fijado
-- a '' => todos los objetos van cualificados con el esquema.

create or replace function public.get_seasons()
returns table (season text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.season
  from public.matches m
  order by m.season desc;
$$;

-- Ranking de una temporada:
--   attended      = nº de partidos de la temporada con asistencia del socio.
--   total_matches = nº de partidos de la temporada con >= 1 asistencia (ya jugados).
-- Solo socios con attended >= 1. Orden: attended desc; empates comparten
-- posición (rank()) y dentro del empate por nº de socio asc.
create or replace function public.get_ranking(p_season text)
returns table (
  position       integer,
  member_number  integer,
  name           text,
  attended       bigint,
  total_matches  bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with season_matches as (
    select distinct a.match_id
    from public.attendances a
    join public.matches m on m.id = a.match_id
    where m.season = p_season
  ),
  totals as (
    select count(*)::bigint as total_matches from season_matches
  ),
  per_member as (
    select a.member_number, count(distinct a.match_id)::bigint as attended
    from public.attendances a
    join public.matches m on m.id = a.match_id
    where m.season = p_season
    group by a.member_number
  )
  select
    rank() over (order by pm.attended desc)::integer as position,
    pm.member_number,
    mem.name,
    pm.attended,
    t.total_matches
  from per_member pm
  join public.members mem on mem.number = pm.member_number
  cross join totals t
  where pm.attended >= 1
  order by pm.attended desc, pm.member_number asc;
$$;

-- El ranking es público: lo puede ejecutar anon (y también authenticated).
grant execute on function public.get_seasons()          to anon, authenticated;
grant execute on function public.get_ranking(text)       to anon, authenticated;

-- ============================================================================
-- Realtime
-- ============================================================================
-- Publicamos attendances para ver en vivo lo registrado en otras puertas.
-- replica identity full => los eventos de delete/update incluyen el registro
-- antiguo, para que el contador se mantenga al deshacer en otro dispositivo.
alter table public.attendances replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendances'
  ) then
    alter publication supabase_realtime add table public.attendances;
  end if;
end $$;
