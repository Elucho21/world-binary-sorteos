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

## Pendiente / backlog

- Headers de seguridad (CSP, X-Frame-Options, Referrer-Policy) en
  `netlify.toml`.
- Notificaciones por email (stock bajo de códigos, alta de educador
  nuevo).
- Página pública de "educadores destacados".
- Loop de referidos (giro extra por traer un amigo).
- Soporte multi-idioma (descartado por ahora).
