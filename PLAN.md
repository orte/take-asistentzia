# TAKE – Bazkideen asistentzia · Plan de implementación

Plan para Claude Code. Léelo entero antes de escribir código. Trabaja **fase a fase**, y al terminar cada fase para, resume lo hecho y espera mi visto bueno antes de seguir.

## 1. Contexto

El TAKE (club de baloncesto de Tolosa) quiere saber a cuántos partidos de casa del primer equipo asiste cada socio, para hacer un ranking de asistencia por temporada.

Funcionamiento el día de partido: una persona del club se pone en cada puerta del pabellón con un móvil, tablet o portátil, pide el nº de socio a quien entra y lo teclea. No hay torno, ni carnet con QR, ni nada automático.

Volumen: unos 500 socios por partido, un registrador por puerta (puede haber más de una puerta, cada una con su dispositivo). Eso son 25–35 minutos de registro continuo por puerta, así que **la velocidad de la pantalla de puerta es el requisito nº 1**: registrar a un socio tiene que costar menos de 3 segundos.

## 2. Alcance

**Dentro**
- Pantalla de puerta para registrar asistencia por nº de socio.
- Ranking de asistencia por temporada.
- Gestión: socios (importación CSV y edición), partidos, corrección de registros, exportaciones.
- Acceso con una única contraseña compartida.
- Interfaz **solo en euskera**.

**Fuera (no implementar)**
- Modo offline / PWA (hay WiFi en el pabellón).
- Usuarios individuales, roles, registro de usuarios.
- Categorías inferiores u otros equipos (solo primer equipo).
- Lectura de QR / carnets.
- Castellano u otros idiomas.
- Cualquier dato personal más allá de nº de socio y nombre.

## 3. Supuestos (corrígeme si alguno no vale)

1. El nº de socio es un entero positivo, sin letras ni ceros a la izquierda significativos.
2. El ranking es **público** (sin contraseña) y muestra posición, nº de socio, nombre y partidos asistidos.
3. La misma contraseña sirve para registrar en puerta y para gestionar.
4. Una temporada tiene del orden de 15–20 partidos en casa.

## 4. Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS. SPA estática, sin servidor propio.
- **Routing:** React Router.
- **Backend:** Supabase (Postgres + Auth + Realtime), plan gratuito, región UE.
- **Cliente:** `@supabase/supabase-js` con la **publishable key** (`sb_publishable_...`). Nunca la secret key en el frontend ni en el repo.
- **CSV:** PapaParse.
- **Tests:** Vitest para la lógica pura.
- **Hosting:** Cloudflare Pages (build estático `dist/`, con fallback de SPA para las rutas).

Antes de usar APIs de Supabase, comprueba la documentación actual (formato de claves, grants necesarios para exponer tablas y funciones en la Data API, configuración de Realtime). No des por buenas convenciones antiguas.

Variables de entorno (`.env.local`, con `.env.example` en el repo):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_ADMIN_EMAIL=
```

## 5. Modelo de datos

Entrega el esquema como migración SQL en `supabase/migrations/` (yo la ejecutaré en el SQL Editor de Supabase). Identificadores en inglés.

```sql
create table members (
  number      integer primary key check (number > 0),
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table matches (
  id          uuid primary key default gen_random_uuid(),
  season      text not null,            -- formato '2026-27'
  match_date  date not null,
  opponent    text not null,
  created_at  timestamptz not null default now()
);

create table attendances (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references matches(id) on delete cascade,
  member_number  integer not null references members(number) on delete restrict,
  registered_at  timestamptz not null default now(),
  device_label   text,                  -- p. ej. 'Atea 1'
  unique (match_id, member_number)
);
```

**Seguridad (RLS)**
- RLS activado en las tres tablas.
- Rol `authenticated`: lectura y escritura completas en las tres.
- Rol `anon`: **ningún acceso directo a las tablas**.
- El ranking público se sirve con funciones `security definer` (con `search_path` fijado) ejecutables por `anon`:
  - `get_seasons()` → lista de temporadas con partidos.
  - `get_ranking(p_season text)` → `position, member_number, name, attended, total_matches`.
- Incluye en la migración los `grant` explícitos necesarios.
- Añade `attendances` a la publicación de Realtime.

**Reglas del ranking**
- `attended` = nº de partidos de la temporada con asistencia registrada del socio.
- `total_matches` = nº de partidos de la temporada con al menos una asistencia registrada (es decir, ya jugados).
- Solo aparecen socios con `attended >= 1`.
- Orden: `attended` descendente; los empates comparten posición (`rank()`), y dentro del empate se ordena por nº de socio ascendente.

**Datos de prueba:** `supabase/seed.sql` con ~600 socios ficticios, 4 partidos y asistencias aleatorias, para desarrollar sin datos reales.

## 6. Autenticación

- Un único usuario de Supabase Auth (email + contraseña) que crearé yo a mano. El registro de nuevos usuarios estará desactivado en Supabase.
- La pantalla de login **solo pide la contraseña**; el email sale de `VITE_ADMIN_EMAIL`.
- Sesión persistente en el dispositivo: el registrador no debe tener que volver a entrar en mitad de un partido.
- Rutas protegidas redirigen a `/login` y vuelven a la ruta original tras entrar.

## 7. Rutas y pantallas

| Ruta | Acceso | Pantalla |
|---|---|---|
| `/` | Público | Sailkapena (ranking) |
| `/login` | Público | Contraseña |
| `/sarrera` | Protegido | Pantalla de puerta |
| `/kudeaketa/bazkideak` | Protegido | Socios |
| `/kudeaketa/partidak` | Protegido | Partidos |
| `/kudeaketa/partidak/:id` | Protegido | Asistencias de un partido |

### 7.1 Sarrera (pantalla de puerta) — la crítica

Diseñada para móvil en vertical, usable con una mano; debe funcionar igual de bien en tablet y en portátil.

**Selección de partido**
- Al entrar, selecciona automáticamente el partido cuya fecha es hoy (zona horaria `Europe/Madrid`).
- Si hoy no hay partido: mensaje y botón para crearlo ahí mismo (fecha de hoy, pedir rival) o elegir otro de la lista.
- El partido activo se ve siempre en la cabecera (rival y fecha).

**Entrada del número**
- Teclado numérico propio en pantalla, con botones grandes (0–9, borrar, OK). No debe abrirse el teclado nativo del móvil.
- También acepta teclado físico: dígitos, Retroceso y Enter. Un portátil con teclado numérico tiene que ser igual de rápido.
- Tras cada registro el campo queda vacío y listo para el siguiente, sin toques adicionales.

**Respuesta a cada registro** (a pantalla casi completa, con color + icono + texto, nunca solo color)
- Verde: registrado, con nombre y nº del socio.
- Amarillo: ya estaba registrado en este partido, con nombre y hora del registro anterior.
- Rojo: el número no existe, o el socio está inactivo (mensajes distintos).
- El aviso se cierra solo (~1,5 s) y **no bloquea**: empezar a teclear el siguiente número lo cierra al instante.
- Vibración corta en error si el dispositivo lo soporta.

**Rendimiento**
- Al abrir la pantalla se cargan en memoria todos los socios y las asistencias del partido. La validación (existe / duplicado) es local e instantánea; la escritura en base de datos va en segundo plano.
- La restricción `unique` es la garantía final contra duplicados: si el insert falla por duplicado, se muestra el aviso amarillo.
- Suscripción Realtime a las asistencias del partido para ver lo registrado en otras puertas; con recarga periódica (cada 20 s) como respaldo.
- Si una escritura falla por red: se guarda en una cola en `localStorage`, se reintenta sola y se muestra un indicador visible con el nº de registros pendientes. No se pierde ningún registro por un corte puntual de WiFi.

**Extras de la pantalla**
- Búsqueda por nombre (para quien no recuerda su número): sin distinguir mayúsculas ni tildes, sobre la lista en memoria; al tocar un resultado se registra.
- Contador de asistentes del partido, siempre visible.
- Lista de los últimos 5 registros de este dispositivo, con "deshacer" en el más reciente y borrado con confirmación en el resto.
- Etiqueta de dispositivo opcional ("Atea 1", "Atea 2"), guardada en `localStorage` y enviada en `device_label`.
- Screen Wake Lock para que la pantalla no se apague.

**Criterios de aceptación**
- Registrar 20 socios seguidos con el teclado en pantalla, sin tocar nada más que dígitos y OK.
- Con dos navegadores abiertos en el mismo partido, registrar el mismo socio en ambos: uno da verde y el otro amarillo, y el contador coincide en los dos.
- Con la red cortada (modo offline del navegador), registrar 3 socios: quedan en la cola, se ven como pendientes y se guardan al volver la red.

### 7.2 Sailkapena (ranking público)

- Selector de temporada (por defecto la actual).
- Tabla: posición, nº de socio, nombre, partidos asistidos sobre total (p. ej. `7 / 9`).
- Buscador por nombre o número para que un socio se encuentre.
- Legible en móvil y proyectable en una pantalla grande.
- Sin enlaces visibles a las zonas protegidas más allá de un acceso discreto al login.

### 7.3 Kudeaketa · Bazkideak (socios)

- Listado con búsqueda, alta manual, edición de nombre y activar/desactivar. No se borran socios con asistencias: se desactivan.
- **Importación CSV:**
  - Columnas: nº de socio y nombre. Detección automática de delimitador (`;` o `,`), con o sin cabecera, UTF-8 con o sin BOM.
  - Vista previa antes de aplicar: cuántos nuevos, cuántos cambian de nombre, cuántas filas con error (y cuáles).
  - Aplica como *upsert* por nº de socio. No desactiva ni borra a los que no vengan en el fichero.

### 7.4 Kudeaketa · Partidak (partidos)

- Listado por temporada con nº de asistentes de cada partido.
- Alta y edición: fecha, rival y temporada. La temporada se propone a partir de la fecha (corte el 1 de julio: octubre de 2026 → `2026-27`).
- Borrado con confirmación explícita (borra también sus asistencias).
- Detalle de partido: lista de asistentes con hora y dispositivo, añadir un socio a mano, quitar un registro.
- **Exportaciones CSV** (separador `;` y BOM, para que abra bien en Excel en español): ranking de la temporada y asistencias de un partido.

## 8. Idioma: textos en euskera

Toda la interfaz en euskera. Centraliza los textos en un único fichero (`src/i18n/eu.ts`) para poder revisarlos de una vez; no hace falta librería de i18n. Usa este glosario como base y mantén la coherencia; los revisaré yo.

| Concepto | Texto |
|---|---|
| Nombre de la app | TAKE – Bazkideen asistentzia |
| Puerta / entrada | Sarrera |
| Ranking | Sailkapena |
| Gestión | Kudeaketa |
| Socio / socios | Bazkidea / Bazkideak |
| Nº de socio | Bazkide zenbakia |
| Partido / partidos | Partida / Partidak |
| Temporada | Denboraldia |
| Rival | Aurkaria |
| Fecha | Data |
| Contraseña | Pasahitza |
| Entrar | Sartu |
| Salir | Irten |
| Contraseña incorrecta | Pasahitz okerra |
| Partido de hoy | Gaurko partida |
| Hoy no hay partido | Gaur ez dago partidarik |
| Crear partido | Sortu partida |
| OK | Ados |
| Registrado | Ongi etorri! |
| Ya registrado | Dagoeneko erregistratuta |
| Número inexistente | Zenbaki hori ez da existitzen |
| Socio inactivo | Bazkidea ez dago aktibo |
| Buscar por nombre | Bilatu izenez |
| Asistentes | Bertaratuak |
| Últimos registros | Azken erregistroak |
| Deshacer | Desegin |
| Pendientes de sincronizar | Sinkronizatzeke |
| Posición | Postua |
| Nombre | Izena |
| Activo | Aktibo |
| Nuevo socio | Bazkide berria |
| Nuevo partido | Partida berria |
| Importar CSV | Inportatu CSVa |
| Exportar CSV | Esportatu CSVa |
| Guardar | Gorde |
| Cancelar | Utzi |
| Borrar | Ezabatu |
| ¿Seguro? | Ziur zaude? |

## 9. Fases

**Fase 0 — Base del proyecto**
Scaffold (Vite + React + TS + Tailwind + Router + Vitest), `.env.example`, `.gitignore`, `CLAUDE.md` con las convenciones del repo y un README mínimo.

**Fase 1 — Base de datos**
Migración SQL (tablas, RLS, grants, funciones del ranking, Realtime) y `seed.sql`. Tipos TypeScript del esquema. *Para aquí: tengo que ejecutar el SQL en Supabase y darte las claves.*

**Fase 2 — Esqueleto y acceso**
Cliente Supabase, login solo con contraseña, rutas protegidas, layout y navegación, fichero de textos en euskera.

**Fase 3 — Sarrera**
La pantalla de puerta completa según 7.1, usando los datos de prueba. Lógica de registro (válido / duplicado / inexistente / inactivo), cola de reintentos y normalización de nombres como funciones puras con tests.

**Fase 4 — Kudeaketa**
Socios (con importación CSV y tests del parser) y partidos (con detalle y correcciones).

**Fase 5 — Sailkapena y exportaciones**
Ranking público y exportaciones CSV.

**Fase 6 — Puesta en producción**
- Configuración de build y fallback de SPA para Cloudflare Pages.
- Workflow de GitHub Actions programado (diario) que llama a `get_seasons()` para que el proyecto gratuito de Supabase no se pause por inactividad. Usa secretos del repo para URL y publishable key.
- README final con: puesta en marcha, variables, cómo desplegar, y una guía breve de uso para el día de partido.

## 10. Calidad

- TypeScript estricto, sin `any`.
- Componentes pequeños; la lógica de negocio fuera de los componentes y con tests.
- Estados de carga y de error visibles en todas las pantallas; ningún fallo silencioso.
- Accesibilidad básica: contraste suficiente, botones grandes, foco visible.
- No añadas dependencias sin necesidad ni funcionalidades fuera del alcance.
- Si algo del plan es ambiguo o choca con la documentación actual de una herramienta, pregunta antes de decidir.
