# TAKE – Bazkideen asistentzia

Aplicación web para registrar la asistencia de socios a los partidos de casa del
primer equipo del **TAKE** (club de baloncesto de Tolosa) y publicar un ranking
de asistencia por temporada.

SPA estática (Vite + React + TypeScript + Tailwind v4), con Supabase como backend
(Postgres + Auth + Realtime). Interfaz **solo en euskera**. El plan de
implementación completo está en [`PLAN.md`](./PLAN.md).

## Puesta en marcha (desarrollo)

Requisitos: Node.js 22+ y un proyecto de Supabase (plan gratuito, región UE).

```bash
npm install
cp .env.example .env.local   # y rellena los valores (ver abajo)
npm run dev
```

### 1. Base de datos

En el **SQL Editor** de Supabase, ejecuta en este orden:

1. `supabase/migrations/20261007090000_init.sql` — tablas, RLS, grants,
   funciones del ranking (`get_seasons`, `get_ranking`) y publicación Realtime.
2. `supabase/seed.sql` — datos de prueba (~600 socios, 4 partidos, asistencias
   aleatorias). **Solo en desarrollo**, no en producción con datos reales.

### 2. Usuario admin

En **Authentication** de Supabase, crea a mano un único usuario (email +
contraseña) y **desactiva el registro** de nuevos usuarios (Providers → Email →
"Allow new users to sign up" desactivado). La pantalla de login solo pide la
contraseña; el email sale de `VITE_ADMIN_EMAIL`.

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (`https://xxxx.supabase.co`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`). **Nunca** la secret key. |
| `VITE_ADMIN_EMAIL` | Email del único usuario admin. |

Vite solo lee el `.env.local` al arrancar: si lo creas con `npm run dev` en
marcha, reinícialo.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Type-check (`tsc -b`) + build de producción en `dist/`. |
| `npm run preview` | Sirve el build de producción localmente. |
| `npm test` | Tests (Vitest). |
| `npm run lint` | Type-check sin emitir. |

## Despliegue (Cloudflare Pages)

1. Sube el repo a GitHub y conéctalo en Cloudflare Pages
   (*Workers & Pages → Create → Pages → Connect to Git*).
2. Configuración de build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. **Variables de entorno** del proyecto de Pages: añade `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_ADMIN_EMAIL` (para producción).
4. El fichero [`public/_redirects`](./public/_redirects) ya incluye el fallback
   de SPA (`/* /index.html 200`), necesario para que las rutas de React Router
   funcionen al recargar o entrar directo a una URL.

Cada *push* a la rama principal despliega producción; las ramas y PRs generan
*preview deployments*.

### Keep-alive de Supabase

El proyecto gratuito de Supabase se pausa tras una semana de inactividad. El
workflow [`.github/workflows/keepalive.yml`](./.github/workflows/keepalive.yml)
llama a `get_seasons()` una vez al día para evitarlo. Configura dos **secretos
del repo** (*Settings → Secrets and variables → Actions*):

- `SUPABASE_URL` → `https://xxxx.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` → `sb_publishable_...`

> GitHub desactiva los workflows programados tras 60 días sin actividad en el
> repo. Si el club no toca el repo en mucho tiempo, reactívalo o lánzalo a mano
> con *Run workflow*.

## Guía del día de partido

1. En cada puerta, abre la app en el móvil/tablet/portátil y entra con la
   **contraseña** compartida (`/login`). La sesión queda guardada en el
   dispositivo: no hay que volver a entrar durante el partido.
2. Ve a **Sarrera** (`/sarrera`). Si hay partido hoy, se selecciona solo; si no,
   créalo ahí mismo (pide el rival) o elige otro de la lista.
3. (Opcional) Pon la **etiqueta del dispositivo** (`Atea 1`, `Atea 2`…): aparece
   en cada registro para saber por qué puerta entró cada socio.
4. Teclea el **nº de socio** y pulsa **Ados** (o Enter). El color dice qué pasó:
   - 🟢 **Verde**: registrado (sale nombre y número).
   - 🟡 **Amarillo**: ya estaba registrado en este partido.
   - 🔴 **Rojo**: el número no existe, o el socio está inactivo.
   - El aviso se cierra solo; para ir rápido, empieza a teclear el siguiente.
5. ¿Alguien no recuerda su número? Usa **Bilatu izenez** (buscar por nombre) y
   toca el resultado.
6. Si te equivocas, en **Azken erregistroak** puedes **deshacer** el último o
   borrar los anteriores.
7. Si se corta el WiFi, los registros se guardan y se reenvían solos; verás un
   aviso de **Sinkronizatzeke** con los que quedan pendientes. No se pierde nada;
   espera a que vuelva la red antes de cerrar la pestaña.

El **ranking** (`/`) es público y se actualiza solo; puedes proyectarlo en una
pantalla grande. Desde **Kudeaketa** se gestionan socios (alta, edición,
importación CSV), partidos y correcciones, y se exportan CSV (ranking de una
temporada y asistencias de un partido) listos para Excel.

El calendario de partidos también se puede cargar de golpe desde **Partidak →
Inportatu egutegia (CSV)**, con tres columnas: `Denboraldia`, `Aurkaria`, `Data`
(fecha en `AAAA-HH-EE` o `EE/HH/AAAA`). La vista previa distingue los partidos
nuevos de los que ya existen, así que reimportar el mismo fichero no los duplica.

## Estado

Completo (Fases 0–6 de `PLAN.md`).
