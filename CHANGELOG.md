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

## v1.5 — Ruleta más épica, música, cuenta regresiva y premio sin login

- Animación del sorteo ~50% más larga (4.8s por ganador) con una
  desaceleración final más marcada, y un cartel que muestra en vivo "a
  quién le tocaría ahora" mientras gira, con zoom/pulso en el último tramo
  del giro.
- Cuenta regresiva 3-2-1 antes del primer ganador cuando hay varios
  premios (no se repite en cada uno).
- 4 estilos de música sintetizada para elegir antes de sortear (alegre,
  épica, gamer, terror) — mismo método de tonos que ya usábamos para el
  tic-tic y la fanfarria, sin archivos de audio.
- Los participantes ahora pueden enterarse si ganaron sin depender del
  mail: al registrarse, su navegador guarda un identificador propio: si
  vuelven a abrir el mismo link en el mismo dispositivo después del
  sorteo (o se quedan esperando en la página), ven directo si ganaron y
  su código — como complemento a Mis Premios, no en su reemplazo.
- Migración `0004_participant_reveal.sql`: `register_participant()` ahora
  también devuelve el id del participante; nueva función
  `check_participant_prize()` para consultar el resultado propio sin login.
- Backlog anotado: ruleta en vivo visible para todos los espectadores
  (vía Supabase Realtime) — pospuesto a pedido tuyo esta vuelta.

## v1.6 — Filtro de educadores, breadcrumbs y arreglo del cuello de botella de aprobación

- Filtro Todos/Aprobados/Rechazados en la lista de "Todos los educadores"
  de `/admin/educators` (sin nueva query, filtro client-side).
- Se sacó una vuelta de red de más en 4 páginas (`/admin/stats`,
  `/admin/codes`, `/dashboard`, `/dashboard/sorteos/[id]/codes`)
  paralelizando queries que eran independientes entre sí pero se pedían
  una por una.
- Breadcrumbs nuevos en toda la sección de un sorteo (detalle, premios,
  participantes, ganadores, estadísticas) y en `/admin/sorteos/new` — el
  primer nivel del camino es consciente del rol: un super admin que entra
  desde `/admin/sorteos` ve "Sorteos" y vuelve directo ahí en cualquier
  profundidad, en vez de depender del link "Mis sorteos" que lo mandaba
  por `/dashboard` primero.
- Fix del cuello de botella "confirmá tu email": como el envío de mail
  real todavía no está conectado, un educador nuevo quedaba sin ninguna
  salida esperando un mail que nunca llega. Ahora, al aprobar a un
  educador desde `/admin/educators`, su email se confirma automáticamente
  (vía el cliente de servicio de Supabase) y puede ingresar al toque; si
  intenta ingresar antes de ser aprobado, ve un error claro en vez de
  "contraseña incorrecta"; y el mensaje post-registro ya no promete un
  mail de confirmación, con un botón directo a Ingresar.

## v1.7 — Seguridad, velocidad, y negocio (sorteos con nivel, verificables)

**UX**
- `og:image`/`og:title` dinámicos por sorteo (`next/og`) para que el link de
  `/s/[slug]` se vea bien al compartirlo por WhatsApp/Instagram.
- PWA instalable: manifest + íconos generados, así el educador puede
  agregar la app a su pantalla de inicio en vez de usar una pestaña más.

**Seguridad**
- Headers de seguridad (CSP, X-Frame-Options, Referrer-Policy,
  Permissions-Policy) en `netlify.toml`.
- `/api/check-prize` ahora tiene el mismo rate limiting por IP que
  `/api/register`, con un presupuesto propio (`spin_attempts.kind`) para no
  competir con el de registro.

**Velocidad**
- El QR de cada sorteo se cachea (el contenido es una función pura de la
  URL, así que no hace falta regenerarlo en cada visita).

**Aprovechamiento comercial**
- Reporte de valor/ROI por sorteo: cuántos inscriptos son nuevos para el
  educador vs. cuántos ya lo conocían de otro sorteo.
- Premios por niveles dentro de un mismo sorteo (`prize_codes.tier`): un
  premio grande + varios chicos, siempre asignados en orden de prioridad al
  sortear.
- Story de Instagram y post de Facebook generados (además del QR + texto de
  WhatsApp que ya existía) desde la sección Compartir de cada sorteo.

**Sorteos + trading**
- Sorteo verificable: cada draw guarda la semilla del algoritmo (mulberry32
  + Fisher-Yates) y un hash de la lista de inscriptos usada, visible para el
  educador y de forma pública una vez sorteado.
- Ganador suplente automático: si un ganador no canjea su código en 7 días,
  se reasigna una vez al azar entre los demás inscriptos (Netlify Scheduled
  Function diaria).
- Reporte PDF descargable por sorteo con ganadores, fecha y los datos de
  verificación.
- "Pulso en vivo" de inscriptos en la pantalla de Sortear (polling cada
  15s, sin Realtime).
- Modo simulacro: corre la animación completa del sorteo con participantes
  ficticios, sin gastar premios reales ni tocar los datos del sorteo.
- Modo "a la tercera": antes de los ganadores reales, la ruleta cae 2 veces
  en gente que no gana nada (banner/sonido distintos, sin confetti), para
  generar más suspenso — solo disponible si hay al menos 2 inscriptos de
  más que la cantidad de ganadores.
- Migración `0005_v1_7_improvements.sql`.

## v1.7.1 — Ajustes post-deploy

- Se sacó el cacheo de estadísticas (`/admin/stats` y
  `/dashboard/sorteos/[id]/stats`) que se había sumado en v1.7: volvieron a
  las queries directas de siempre. Se sospecha que `unstable_cache` no se
  comporta bien en el runtime de Netlify para este proyecto; el reporte de
  valor/ROI se mantiene, ahora calculado sin caché.
- Se sacó el programa de referidos entre educadores de v1.7 (no era lo
  pedido). Migración `0006_remove_referral_program.sql` revierte la
  columna `profiles.referred_by` y el trigger asociado.

## Pendiente / backlog

- Notificaciones por email (stock bajo de códigos, alta de educador
  nuevo).
- Página pública de "educadores destacados".
- Loop de referidos (giro extra por traer un amigo).
- Soporte multi-idioma (descartado por ahora).
- Barra de progreso visual en "Premios" (cuántos códigos cargados vs.
  necesarios).
- Alerta en el dashboard si un sorteo activo está por vencer sin premios
  cargados o sin sortearse.
- 2FA (TOTP) opcional para cuentas de super admin.
- Alerta temprana de cuota de Netlify/Supabase (después de haberla
  agotado una vez).
- Ruleta en vivo visible para todos los espectadores en tiempo real (vía
  Supabase Realtime), sincronizada con el momento en que el educador
  sortea.
- 2FA (TOTP) opcional para cuentas de super admin.
- Alerta temprana de cuota de Netlify/Supabase.
- Alerta en el dashboard si un sorteo activo está por vencer sin premios
  cargados o sin sortearse.
- Barra de progreso visual en "Premios".
