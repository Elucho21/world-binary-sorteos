# World Binary — Sorteos

Plataforma de sorteos con ruleta para los educadores/IBs de World Binary. Los
participantes se registran (nombre + email), giran una ruleta configurada por
el educador y ganan códigos de cuentas bono que canjean directamente con el
educador o con World Binary.

Ver el plan completo de producto/arquitectura en
`C:\Users\lucia\.claude\plans\quiero-crear-una-web-soft-garden.md`.

## Stack

- **Next.js 16** (App Router, TypeScript) — ojo: esta versión usa `proxy.ts`
  en vez de `middleware.ts` (Next renombró Middleware a Proxy en la v16).
- **Supabase** (Postgres + Auth + Row Level Security) — toda la lógica de
  roles/permisos vive en políticas RLS, no en código de auth casero.
- **Tailwind CSS v4** (config CSS-first, sin `tailwind.config.js` — los
  tokens de marca están en `app/globals.css`).
- Componentes UI propios en `components/ui/` (no se usó shadcn/ui por la
  fricción de su CLI interactiva; son primitivas simples y livianas).
- Deploy pensado para **Netlify** (Next.js Runtime oficial).

## Puesta en marcha (pasos que tenés que hacer vos)

Estos pasos requieren crear cuentas/proyectos externos, así que no los pude
hacer automáticamente:

### 1. Crear el proyecto Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un proyecto nuevo.
2. En **Project Settings → API**, copiá `Project URL`, `anon public key` y
   `service_role key`.
3. Copiá `.env.local.example` a `.env.local` y completá esos tres valores
   (dejá `NEXT_PUBLIC_SITE_URL=http://localhost:3000` para desarrollo local).
4. En **Authentication → Providers → Email**, para desarrollo sin fricción
   podés desactivar "Confirm email" (si lo dejás activado, el flujo de
   signup de educadores va a pedir confirmar el mail antes de poder
   loguearse — el código ya contempla ambos casos).
5. En **SQL Editor**, pegá y ejecutá el contenido completo de
   `supabase/migrations/0001_init.sql`. Esto crea todas las tablas, las
   políticas RLS, la función `spin_wheel()` y el trigger que crea el perfil
   de cada usuario nuevo.
6. Mirá `supabase/seed.sql` para los pasos de bootstrap: crear tu primera
   cuenta de Super Admin y aprobar un educador de prueba.

### 2. Correr en local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### 3. Deploy a Netlify

1. Conectá el repo a Netlify (Netlify detecta Next.js automáticamente vía
   su Next.js Runtime, no hace falta config extra).
2. Cargá las mismas variables de entorno de `.env.local` en
   **Site settings → Environment variables** (usá un proyecto Supabase de
   producción separado del de desarrollo).
3. Poné `NEXT_PUBLIC_SITE_URL` con la URL real de Netlify — se usa para
   armar los links de los sorteos (`/s/[slug]`) y el magic link de
   "Mis Premios".
4. Corré la migración `0001_init.sql` contra el proyecto de producción.

## Banners / imágenes publicitarias

El campo `image_url` de los banners (`/admin/banners`) espera una URL
pública. No se armó un uploader propio — subí la imagen a Supabase Storage
(o cualquier CDN) y pegá la URL pública ahí.

## Qué falta / decisiones pendientes

- **Branding real**: los colores de `app/globals.css` (`--brand-*`) se
  tomaron inspeccionando visualmente https://worldbinary.pro/ (fondo casi
  negro, texto blanco hueso, verde de acento). Si World Binary te pasa un
  brand kit oficial, esos son los únicos valores que hay que tocar.
- **Canje de códigos**: no hay integración automática con el backend de
  trading de World Binary. El educador (o el admin) marca manualmente un
  código como canjeado desde la vista de participantes del sorteo.
- **Otros formatos de sorteo**: el esquema ya tiene la columna
  `sorteos.mechanic_type` (default `'wheel'`) como gancho de extensibilidad,
  pero solo la ruleta está implementada.
- **Anti-abuso**: hay honeypot + límite de intentos por IP dentro de
  `spin_wheel()`. Si en algún momento hace falta más (Cloudflare Turnstile,
  por ejemplo), el punto de integración natural es `app/api/spin/route.ts`
  antes de llamar al RPC.
