# Changelog

## v1.0 — Lanzamiento inicial

Plataforma completa: sorteos con ruleta configurable, cuentas bono como
premio, registro público de participantes, panel de educador (sorteos,
segmentos, códigos, participantes), panel de admin (aprobación de
educadores, distribución de códigos, sorteos y leads globales, banners),
y "Mis Premios" para participantes vía magic link. Deploy en Netlify
(Next.js Runtime) + Supabase (Postgres, Auth, RLS).

## v1.1 — Admin puede crear sorteos

- Botón "Nuevo sorteo" en `/admin/sorteos` (elige a qué educador se lo
  asigna) + columnas de Registrados/Premios/Horario en la lista global.
- Fix: el login de super admin redirigía a `/dashboard` en vez de `/admin`.

## v1.2 — Segunda tanda de mejoras

**UX / flujo**
- Reveal del premio con confetti y una animación de énfasis.
- Checklist de "Primeros pasos" en el dashboard del educador (crear
  sorteo → configurar ruleta → cargar premios → activar).
- No se puede activar un sorteo si ningún segmento tiene premios cargados
  (ni consuelo configurado).
- QR + texto pre-armado para compartir cada sorteo por WhatsApp/Instagram.
- Pasada de responsive mobile en las páginas públicas (fix de overflow
  horizontal en el header).

**Seguridad**
- Punto de integración de Cloudflare Turnstile en el formulario de giro,
  apagado por default (se activa solo si se configuran las env vars).
- Auditoría (`audit_log`) de aprobaciones/rechazos de educadores y
  promociones a super admin, visible en `/admin/audit`.
- Validación de dominio (MX) en el registro público para filtrar emails
  claramente inexistentes, sin bloquear por problemas de red propios.

**Funcionalidades para admin y educadores**
- Estadísticas básicas (giros por día, tasa de premio, top sorteos) por
  sorteo (`/dashboard/sorteos/[id]/stats`) y globales (`/admin/stats`).
- Aprobación/rechazo masivo de educadores en `/admin/educators`.
- Sub-cuentas de equipo por educador ("Mi equipo"): invitar por email a
  alguien que gestione los mismos sorteos.
- Sorteos vencidos se pasan a "Finalizado" automáticamente (Netlify
  Scheduled Function, corre cada hora).
- Duplicar sorteo (copia segmentos, no códigos).
- Buscador de participantes por nombre/email (dashboard del educador y
  `/admin/leads`).

**Libre**
- Webhook configurable hacia el CRM de World Binary (`/admin/settings`):
  dispara un POST best-effort por cada giro nuevo.

## v1.3 — Sorteo clásico (rediseño del mecanismo central)

Se reemplazó el mecanismo de "ruleta individual" (cada participante giraba
al registrarse y ganaba o no en el momento) por un **sorteo clásico**: toda
la gente se registra durante el tiempo que el sorteo está activo, y el
educador dispara el sorteo una sola vez para elegir ganadores al azar entre
todos los inscriptos.

- Registro público simplificado: solo nombre + email, sin ruleta ni
  resultado individual (`components/public/registration-form.tsx`,
  `app/api/register/route.ts`, función `register_participant()`).
- Cada sorteo define `winners_count` (cantidad de ganadores, configurable)
  tanto al crearlo como al editarlo, desde el panel de educador y de admin.
- Nueva pantalla "Sortear" (`/dashboard/sorteos/[id]/winners`): el educador
  aprieta un botón, se anima una ruleta con los nombres de todos los
  inscriptos y va cayendo en cada ganador en secuencia hasta completar
  `winners_count`, asignando un código de premio disponible a cada uno
  (`raffle_winners`, acción `drawWinners`).
- El sorteo queda bloqueado para repetirse una vez sorteado (`drawn_at`) y
  pasa a "Finalizado" automáticamente.
- Se eliminó por completo el editor de segmentos de ruleta
  (`wheel_segments`) y el endpoint `/api/spin`; los premios ahora se cargan
  y se listan directo por sorteo (`/dashboard/sorteos/[id]/codes`,
  `/admin/codes` asigna por sorteo en vez de por segmento).
- Estadísticas, checklist de primeros pasos, lista global de sorteos y
  participantes actualizados al nuevo modelo (inscriptos por día en vez de
  giros, sin "tasa de premio" por giro individual).
- Migración `0003_raffle_redesign.sql`: agrega `sorteos.winners_count` y
  `sorteos.drawn_at`, tabla `raffle_winners`, `prize_codes.sorteo_id`
  (reemplaza `segment_id`), función `register_participant()`; elimina
  `wheel_segments`, `entries` y `spin_wheel()`.

## v1.4 — UX, onboarding guiado e íconos de información

- Tour guiado interactivo (spotlight + popover paso a paso, hecho a mano
  sin librerías) que se dispara solo una vez: uno en `/dashboard` (crear
  sorteo, cuentas bono, equipo) y otro en el detalle de un sorteo recién
  creado (compartir, premios, activar, sortear). Botón "¿Cómo funciona?"
  para volver a verlo.
- Íconos de información (tap/click, pensado para mobile) en los campos y
  botones más confusos del panel de educador: slug, fechas, cantidad de
  ganadores, máximo de participantes, los 5 botones del detalle de sorteo,
  y los 4 estados de código en "Cuentas bono". El más importante: "Sortear"
  ahora deja explícito que es una acción irreversible (antes no estaba
  documentado en ningún lado), con una advertencia siempre visible además
  del tooltip en la pantalla real del sorteo.
- Copy más profundo del lado del trader: `/s/[slug]` ahora explica "cómo
  funciona" el sorteo en 3 pasos antes del formulario; la confirmación de
  registro explica qué es una cuenta bono; `/mis-premios` le dice a cada
  ganador con premio pendiente a quién contactar para canjearlo.
- Landing y `/signup` con propuesta de valor más concreta para el
  educador (qué resuelve la plataforma día a día, no solo qué features
  tiene).

## Pendiente / backlog

- Headers de seguridad (CSP, X-Frame-Options, Referrer-Policy) en
  `netlify.toml`.
- Notificaciones por email (stock bajo de códigos, alta de educador
  nuevo).
- Página pública de "educadores destacados".
- Loop de referidos (giro extra por traer un amigo).
- Soporte multi-idioma (descartado por ahora).
