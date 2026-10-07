-- TAKE – datos de prueba para desarrollo (PLAN §5).
-- ~600 socios ficticios, 4 partidos de la temporada '2026-27' (uno HOY, para
-- que la pantalla de puerta lo autoseleccione) y asistencias aleatorias.
--
-- Ejecutar DESPUÉS de la migración, en un proyecto SIN datos reales.
-- Idempotente: vacía las tres tablas antes de insertar.

truncate table public.attendances, public.matches, public.members restart identity cascade;

-- ---------------------------------------------------------------------------
-- Socios: números 1..600, nombre ficticio, ~3% inactivos.
-- ---------------------------------------------------------------------------
insert into public.members (number, name, active)
select
  g,
  (array[
    'Aitor','Jon','Mikel','Unai','Iker','Ander','Julen','Xabier','Gorka','Beñat',
    'Ane','Maialen','Nerea','Leire','Jone','Irati','June','Amaia','Nahia','Uxue'
  ])[1 + floor(random() * 20)::int]
  || ' ' ||
  (array[
    'Agirre','Etxeberria','Zubizarreta','Mendizabal','Olaizola','Arregi','Goikoetxea',
    'Elizondo','Lasa','Urbieta','Garmendia','Intxausti','Odriozola','Zabaleta',
    'Bengoetxea','Iturralde','Aranburu','Eizagirre','Mujika','Sagastume'
  ])[1 + floor(random() * 20)::int]
  as name,
  random() >= 0.03 as active
from generate_series(1, 600) as g;

-- ---------------------------------------------------------------------------
-- Partidos: tres ya jugados y el de HOY.
-- ---------------------------------------------------------------------------
insert into public.matches (season, match_date, opponent) values
  ('2026-27', current_date - 21, 'Gipuzkoa Basket'),
  ('2026-27', current_date - 14, 'Bilbao Basket'),
  ('2026-27', current_date -  7, 'Araberri'),
  ('2026-27', current_date,      'Zornotza');

-- ---------------------------------------------------------------------------
-- Asistencias: cada socio activo asiste a cada partido con prob. ~60%,
-- repartido entre dos puertas, con hora alrededor de las 19:00.
-- El unique (match_id, member_number) evita duplicados por construcción.
-- ---------------------------------------------------------------------------
insert into public.attendances (match_id, member_number, registered_at, device_label)
select
  m.id,
  mem.number,
  (m.match_date + time '19:00' + (random() * interval '30 minutes'))::timestamptz,
  (array['Atea 1','Atea 2'])[1 + floor(random() * 2)::int]
from public.matches m
cross join public.members mem
where mem.active
  and random() < 0.60;
