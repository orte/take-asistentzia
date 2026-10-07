# CLAUDE.md — TAKE · Bazkideen asistentzia

Guía para trabajar en este repo. El plan completo está en `PLAN.md`; trabaja
**fase a fase**, parando al final de cada fase para esperar visto bueno.

## Qué es

SPA estática (sin servidor propio) para registrar la asistencia de socios a los
partidos de casa del primer equipo del TAKE y publicar un ranking por temporada.
El requisito nº 1 es la **velocidad de la pantalla de puerta** (`/sarrera`):
registrar a un socio debe costar menos de 3 segundos.

## Stack

- **Vite + React + TypeScript + Tailwind CSS v4** (SPA).
- **Tailwind v4**: se configura con el plugin `@tailwindcss/vite` y `@import "tailwindcss";`
  en `src/index.css`. No hay `tailwind.config.js` ni `postcss.config.js`.
- **React Router** (`react-router-dom`) para el routing.
- **Supabase** (`@supabase/supabase-js`) con la **publishable key** (`sb_publishable_...`).
  Nunca la secret key en el frontend ni en el repo.
- **PapaParse** para CSV (se añade en su fase).
- **Vitest** para la lógica pura.
- **Hosting:** Cloudflare Pages (build `dist/`, con fallback SPA).

## Comandos

- `npm run dev` — servidor de desarrollo.
- `npm run build` — type-check (`tsc -b`) + build de producción.
- `npm run preview` — sirve el build.
- `npm test` — tests (Vitest, una pasada).
- `npm run test:watch` — tests en watch.
- `npm run lint` — type-check sin emitir.

## Variables de entorno

En `.env.local` (plantilla en `.env.example`), prefijo `VITE_`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ADMIN_EMAIL`

## Convenciones

- **TypeScript estricto, sin `any`.**
- **Interfaz solo en euskera.** Todos los textos visibles se centralizan en
  `src/i18n/eu.ts` (se crea en su fase). Identificadores de código y de base de
  datos en inglés.
- La **lógica de negocio va fuera de los componentes** y con tests (Vitest).
  Componentes pequeños.
- Estados de carga y de error visibles en todas las pantallas; ningún fallo
  silencioso.
- Accesibilidad básica: contraste suficiente, botones grandes, foco visible.
- No añadir dependencias ni funcionalidades fuera del alcance de `PLAN.md`.
- Antes de usar APIs de Supabase, comprobar la documentación actual (formato de
  claves, grants de la Data API, Realtime). No dar por buenas convenciones antiguas.

## Estructura de rutas

| Ruta | Acceso | Pantalla |
|---|---|---|
| `/` | Público | Sailkapena (ranking) |
| `/login` | Público | Pasahitza |
| `/sarrera` | Protegido | Pantalla de puerta |
| `/kudeaketa/bazkideak` | Protegido | Bazkideak |
| `/kudeaketa/partidak` | Protegido | Partidak |
| `/kudeaketa/partidak/:id` | Protegido | Asistencias de un partido |
