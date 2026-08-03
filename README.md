# World Binary — Sorteos

Plataforma de sorteos clásicos para los educadores/IBs de World Binary. Los
participantes se registran (nombre + email) mientras el sorteo está activo;
el educador dispara el sorteo una sola vez, una ruleta animada va cayendo en
cada ganador (la cantidad es configurable por sorteo) y cada uno recibe un
código de cuenta bono que canjea directamente con el educador o con World
Binary.

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
5. En **SQL Editor**, pegá y ejecutá en orden el contenido completo de todos
   los archivos en `supabase/migrations/` (`0001_init.sql` en adelante,
   numerados en orden). Entre todos crean las tablas, las políticas RLS, las
   funciones (`register_participant()`, etc.) y el trigger que crea el
   perfil de cada usuario nuevo.
6. Mirá `supabase/seed.sql` para los pasos de bootstrap manual (crear tu
   primera cuenta de Super Admin y aprobar un educador de prueba), o corré
   `npm run seed:dev` para crear automáticamente un super admin, un
   educador aprobado y un sorteo de ejemplo con premios en un proyecto
   local nuevo (necesita `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` ya cargados; es seguro correrlo más de una
   vez).

### 2. Correr en local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### 3. Deploy a Netlify

Ya está deployado y funcionando en **https://sorteos-world-binary.netlify.app**
(repo: [github.com/Elucho21/world-binary-sorteos](https://github.com/Elucho21/world-binary-sorteos),
**público** — no tiene ningún secreto adentro, las claves están solo en
variables de entorno de Netlify/Supabase). Auto-deploy en cada push a
`master` ya está funcionando.

Si alguna vez hay que rearmar esto desde cero en otro sitio Netlify, estas
son las cosas no obvias que costó bastante encontrar:

- **`netlify.toml` tiene que declarar `publish = ".next"` explícitamente**
  y el plugin a mano:
  ```toml
  [build]
    command = "npm run build"
    publish = ".next"

  [[plugins]]
    package = "@netlify/plugin-nextjs"
  ```
  Sin esto, Netlify puede quedar publicando solo los archivos estáticos
  (0 functions, 0 edge functions) sin ningún error visible, o directamente
  fallar con "Your publish directory cannot be the same as the base
  directory". El "zero-config" de Netlify para Next.js no siempre alcanza
  cuando el sitio se linkea por API en vez del wizard de la UI.
- **No buildear el paso de Edge Functions en Windows.** `netlify deploy
  --build` corrido en una máquina Windows falla siempre al empaquetar
  `proxy.ts` como Edge Function (bug de rutas del bundler, no depende de
  Turbopack/webpack). La solución es dejar que Netlify buildee en sus
  propios servidores (Linux) vía Git — nunca buildear localmente en Windows
  y subir ese resultado.
- **Conectar el repo siempre por el wizard de la UI, nunca a mano por API.**
  Linkear el repo con un PATCH directo a la API (repo + deploy key SSH)
  parece funcionar al principio, pero el build queda bloqueado con "Build
  blocked: This commit is from an unrecognized Git contributor" en
  cualquier repo privado — falta la asociación real con la GitHub App de
  Netlify, que solo se arma bien pasando por **Site settings → Build &
  deploy → Manage repository → Unlink**, y después volviendo a linkear
  eligiendo el repo de la lista (no escribiéndolo a mano). Esto también es
  lo que activa el auto-deploy en cada push.

Para un proyecto nuevo desde cero:
1. Conectá el repo a Netlify desde la UI (Site settings → Build & deploy →
   Link repository) — el wizard configura bien el publish dir, la GitHub
   App y el webhook solo.
2. Cargá las mismas variables de entorno de `.env.local` en
   **Site settings → Environment variables** (usá un proyecto Supabase de
   producción separado del de desarrollo).
3. Poné `NEXT_PUBLIC_SITE_URL` con la URL real de Netlify.
4. Corré todas las migraciones de `supabase/migrations/`, en orden, contra
   el proyecto de producción.

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
  `register_participant()`, más validación de MX, filtro de dominios
  descartables y Turnstile (env-gated) en `app/api/register/route.ts` antes
  de llamar al RPC. El pedido de magic link en `/mis-premios` tiene su
  propio límite por IP (`register_magic_link_attempt()`).
- **Emails transaccionales (v1.8)**: `lib/notifications.ts` manda mail vía
  la API HTTP de Resend, pero queda inerte (no manda nada) si no está
  configurada la env var `RESEND_API_KEY` — mismo criterio que Turnstile.
  Opcional `RESEND_FROM_EMAIL` para el remitente (default
  `World Binary Sorteos <notificaciones@worldbinary.pro>`). Se usa para:
  aviso de stock bajo de premios (`netlify/functions/notify-low-stock.mts`,
  cada 6hs), aviso de educador nuevo pendiente de aprobación (al
  `support_email` configurado en `/admin/settings`), reenvío de invitación
  de equipo, y la alerta temprana de cuota de base de datos
  (`netlify/functions/check-quota.mts`, diaria — solo chequea el tamaño de
  la base de Supabase contra el límite de 500MB del plan free; una alerta
  de cuota de banda ancha/minutos de build de Netlify necesitaría wirear su
  API de cuenta con un token propio, queda pendiente).
- **2FA (TOTP) opcional para super admin**: activable desde
  `/admin/security` (usa el MFA nativo de Supabase Auth, sin tablas
  propias). Si está activado, el login pide un código extra antes de
  entrar a `/admin` (`/login/mfa`).
