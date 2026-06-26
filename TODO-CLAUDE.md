# TODO — Libélula Podología y Terapias

## Stack
- **Frontend**: Angular 19 (SSR), Angular Material, SCSS
- **Backend**: Python / FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Design**: uipro Beauty & Spa tokens (warm, professional, trustworthy)

## ⚠️ Puertos FIJOS (NO cambiar nunca)
- **Backend: `8000`** — `uvicorn main:app --reload --port 8000` (fijado en `package.json`)
- **Frontend: `4200`** — `ng serve --port 4200` (fijado en `frontend/package.json`)
- `frontend/src/environments/environment.ts` → `apiUrl: 'http://localhost:8000'` (fijado, con comentario de advertencia)
- Si la API "no lee la DB", casi siempre es un backend viejo corriendo en otro puerto → cerrar esa instancia, NO cambiar la config.

---

## 🔴 Bugs & Pendientes Activos (prioridad)

### 🧹 Auditoría: solo datos reales desde la DB (eliminar hardcodeados)
Asegurar que toda la app consuma datos reales almacenados en la base de datos y eliminar cualquier valor hardcodeado / placeholder / mock que quede en el frontend.
- [x] **`TestimonialsService` eliminado** — era `localStorage`-only (`libelula_testimonios`), nunca leía del backend. El home ahora usa `OpinionesService` (`GET /opiniones`). Borrado el servicio + su carpeta + uso en `home.component.ts`/`home.component.spec.ts`.
- [x] **Auditoría del frontend completada** (grep de `localStorage`/`mock`/`placeholder`/`dummy`/static arrays):
  - ✅ `localStorage` se usa **solo** en `admin-auth.service.ts` para el token JWT (correcto, no es dato de negocio)
  - ✅ Todos los `mock`/`MOCK` están en `*.spec.ts` (fixtures de test, correcto)
  - ✅ La lista estática de servicios en `home.component.ts` es **fallback SSR intencional**; verificado que `ngOnInit` la sobreescribe con `GET /servicios`
  - ℹ️ `razones` y `stats` en `home.component.ts` son **contenido de marketing estático** (no existe modelo en BE) — aceptable; se podría mover a config si se quiere editar sin deploy
  - ✅ Cada sección con datos (servicios, opiniones, galería, disponibilidad, promociones) ya lee desde su endpoint vía su servicio (ver capa de servicios)
- [x] ✅ **Contacto centralizado en API (datos de contacto ya no hardcodeados en templates)** — implementado el camino "Limpio":
  - [x] Endpoint `GET /config/contacto` (router `configuracion.py`, lee `config/app.json`; no expone secretos/CORS) + test backend.
  - [x] `ContactoService` (FE) con `contacto()` + computeds `whatsappUrl`, `instagramUrl`, `facebookUrl`, `instagramHandle` y `horarios()` (formatea `business_hours`).
  - [x] Wired en `home` (WhatsApp CTA), `reservas` (WhatsApp + dirección + horarios) y `footer` (WhatsApp + Instagram + Facebook + dirección + horarios). Verificado: 0 handles/horarios/URLs de contacto hardcodeados en templates.
  - [ ] ⚠️ **Acción de la dueña:** poner el **teléfono real** en `config/app.json` → `contact.phone` (hoy `+56 9 XXXX XXXX` es placeholder; no inventar). Al hacerlo, el WhatsApp y el número mostrado se actualizan solos en los 3 lugares.
  - [ ] _(opcional)_ Exponer la edición de `config/app.json` (contacto) desde el panel admin para editar sin redeploy.

### 🧹 Eliminar listas hardcodeadas de servicios/horarios (la DB + `seed.py` son la fuente de verdad)
La DB ya tiene todos los datos (sembrados por `backend/seed.py` y la migration `014_seed_default_data`). Reemplazar las **listas estáticas de negocio** que aún viven en el frontend por datos reales desde el endpoint correspondiente.

> ⚠️ **No confundir con fixtures de test:** los `MOCK_*` en `*.spec.ts` (ej. `admin-promociones.component.spec.ts` → `MOCK_SERVICIOS`/`MOCK_PROMOCIONES`) **NO se eliminan** — son cómo los unit tests corren sin backend. Esto aplica solo a datos hardcodeados en código de producción.

**Datos de negocio hardcodeados eliminados (✅ hecho):**
- [x] `reservas.component.ts` — eliminados `SERVICIOS_FALLBACK` y `HORARIOS_FALLBACK`. Servicios y horarios vienen 100% de la API; se quitó también la bandera `apiOnline` y la **simulación de envío offline** (`setTimeout` que fingía éxito — era un "mock" de comportamiento). Estados de carga: `cargandoServicios` + `@empty` en el select de servicios y en el de horarios (mensajes "Cargando…/No hay…/Elige una fecha primero").
- [x] `home.component.ts` — eliminados `NOMBRES_SERVICIOS` y el array estático de `servicios`. `servicios` arranca vacío y se llena desde `GET /servicios`; `nombresServicios` es ahora `computed` de los servicios cargados; los checkboxes del form de reseña se reconstruyen (`setControl`) con los nombres reales. Skeleton de carga (`cargandoServicios` + `@empty`) y mensaje de error si la API falla.
- [x] `footer.component.ts` — eliminado el array fijo de 7 servicios; ahora carga nombres desde `ServiciosService.listar()` en un signal. _(los `links` de navegación se mantienen: no son datos de negocio)_
- [x] Verificado: grep de `SERVICIOS_FALLBACK|HORARIOS_FALLBACK|NOMBRES_SERVICIOS|apiOnline` → 0 resultados.
- [x] Specs actualizados (home, footer, reservas) para reflejar carga desde API; **build verde + suite 23/23 archivos, 177/177 tests**.

**Tradeoff SSR resuelto con skeleton (no fallback):**
- [x] Mientras la API responde o si falla se muestra **skeleton/estado vacío** en vez de datos falsos. El prerender SSR de `/` muestra el skeleton de servicios hasta que el cliente hidrata y trae los datos reales.
- [ ] _(opcional, futuro)_ Si se quiere que el HTML inicial ya traiga servicios reales (mejor SEO/LCP), habilitar fetch en servidor (ver `routes.server.ts`).

**Fuera de alcance (sin modelo en BE):**
- [ ] `razones` y `stats` en `home.component.ts` son **contenido de marketing** sin tabla en la DB. Si se quieren "no hardcodeados", primero crear modelo/endpoint o moverlos a `config/app.json` (como contacto).

### ✅ Opiniones en Home ahora trae datos reales del BE
- [x] `home.component.ts` consume `GET /opiniones` vía `OpinionesService`; el promedio y el total se calculan desde los datos reales del BE (ya no `localStorage`)
- [x] El formulario público de reseñas hace `POST /opiniones` (antes solo guardaba en `localStorage`) — persiste nombre, apellido, email, teléfono, foto (base64), texto, puntuación y `servicios_ids` (mapeados nombre→id)
- [x] La nueva opinión se antepone a la lista en vivo tras el POST; mapeo `Opinion` (`texto`/`puntuacion`/`created_at`/`foto_url`/`servicios_ids`) → tarjeta del home
- [x] Tests verdes (home spec actualizado a HTTP testing + submit async)

### ✅ Capa de servicios API (conexión FE ↔ BE) — COMPLETADO
Ya **ningún componente usa `HttpClient` directo**; cada recurso del backend tiene su servicio en `shared/<recurso>/`. Verificado: grep de `HttpClient|http.get|post|patch|delete` en `*.component.ts` → **0 resultados**.
- [x] **`OpinionesService`** (`shared/opiniones/`) — `GET/POST/PATCH/DELETE /opiniones`. Lo usan `home` y `admin/opiniones`.
- [x] **`ServiciosService`** (`shared/servicios/`) — `listar/obtener/crear/actualizar/eliminar` + `subirFoto/eliminarFoto`. Lo usan `home`, `servicios`, `admin/servicios`, `admin/promociones`. `precio` ahora tipado `number` (entero CLP).
- [x] **`PromocionesService`** (`shared/promociones/`) — `listar/vigentes/crear/actualizar/eliminar`. Lo usa `admin/promociones`.
- [x] **`GaleriaService`** (`shared/galeria/`) — `listar/subir/generarCaption/publicar/eliminar` + helper `mediaUrl()` (dedup de los dos componentes). Lo usan `galeria`, `admin/galeria`.
- [x] **`PacientesService`** (`shared/pacientes/`) — `listar/obtener/crearNota/actualizarNota/eliminarNota/generarToken/perfilPublico`. Lo usan `admin/pacientes`, `mi-historial`.
- [x] **`DisponibilidadService`** (`shared/disponibilidad/`) — `listarBloques/listarBloqueos/crearBloque/eliminarBloque/crearBloqueo/eliminarBloqueo`. Lo usa `admin/disponibilidad`.
- [x] Interfaces TS por recurso definidas en cada servicio (alineadas con schemas Pydantic); los componentes re-exportan alias (`*Api`) para no romper specs. Base URL centralizada en cada servicio (`environment.apiUrl`).
- [x] Build de producción verde + **suite Vitest 22/22 archivos, 172/172 tests** ✓
- [x] **`*.service.spec.ts` dedicados** para los 6 servicios nuevos (`OpinionesService`, `ServiciosService`, `PromocionesService`, `GaleriaService`, `PacientesService`, `DisponibilidadService`) — cubren URL + método + body + respuesta de cada endpoint con `HttpTestingController` (+37 tests)
- [ ] _(opcional, deuda menor)_ `ReservasService` mantiene `getServicios/getDisponibilidad/getPromocionesVigentes` propios (fachada del flujo de reserva); se puede consolidar contra los nuevos servicios más adelante. `reservas` no hace llamadas crudas, por eso quedó fuera del barrido.

### 🧪 Deuda de tests: specs Jasmine bajo runner Vitest (pre-existente)
El proyecto migró al test builder de **Vitest** (Angular 21) pero varios specs usan API de **Jasmine** y datos desactualizados. No se detectaba porque `ng build` no typecheckea specs. Encontrado y arreglado lo que tocaba esta sesión; queda barrido general:
- [x] `servicios.component.spec.ts` — `toBeTrue()` → `toBe(true)`, MOCK con `icono`/`icono_color`
- [x] `admin-servicios.component.spec.ts` — `precio` string→number, MOCK con `icono`/`icono_color`, flush del `GET /assets/icons/manifest.json` del icon-picker
- [x] Barrido de matchers Jasmine completado — grep de `toBeTrue/toBeFalse/jasmine.*/createSpyObj/spyOn(` en specs → 0 (el único `spyOn` es `vi.spyOn`, API de Vitest). Toda la suite corre en Vitest.
- [x] Agregados `*.spec.ts` para los 6 servicios nuevos (ver sección de capa de servicios)

### 🧪 Alta cobertura de tests por cada elemento/componente (FE + BE)
Objetivo: **cada componente del frontend y cada módulo/router/servicio del backend** tiene su propio archivo de test con cobertura alta (meta **≥ 80%** por archivo, incluyendo caminos de error, no solo el happy path). Hoy hay buena base pero quedan huecos.

**Backend — routers/módulos sin test dedicado (o con cobertura parcial):**
- [ ] `routers/pacientes.py` — CRUD de notas, `generar-token`, portal `GET /pacientes/{token}/perfil` (token válido/expirado/inexistente, rate limit). _(ya existe `test_pacientes_notify.py` solo para notificar)_
- [ ] `routers/citas.py` — flujo de confirmación pública (`GET/POST /confirmar/{token}`), `PATCH /{id}/estado`, sync de Google Calendar (mockear `calendar_service`)
- [ ] `scheduler.py` — `_send_confirmaciones` (48h/24h, idempotencia de flags) y `_send_reminders` (solo confirmadas) con DB en memoria y envíos mockeados
- [ ] `routers/galeria.py` — subir/publicar/eliminar, generar caption (mockear Anthropic + Cloudinary)
- [ ] `routers/disponibilidad.py` admin — bloques y bloqueos (crear/eliminar, rango de fechas)
- [ ] `routers/configuracion.py` — `GET /config/contacto` (no expone secretos)
- [ ] `notifications/` y `whatsapp/` y `social/` — helpers de envío en modo dev (mailer, cloud_api, meta, caption_generator)
- [ ] `integrations/google_calendar.py` — create/update/delete con cliente mockeado
- [ ] Medir cobertura real: `pytest --cov` (pytest-cov ya está instalado) y cerrar los archivos < 80%

**Frontend — componentes sin spec (o con spec mínima):**
- [ ] `admin/pacientes/admin-pacientes.component` — selección, CRUD de notas, generar/copiar token, **panel notificar** (canales según disponibilidad, validación de móvil, feedback por canal)
- [ ] `admin/disponibilidad/*`, `admin/promociones/*`, `admin/galeria/*`, `admin/servicios/*` — verificar que cada `.component.spec.ts` cubra carga + acciones + estados de error
- [ ] `servicios/`, `galeria/`, `mi-historial/`, `confirmar/` (página de confirmación) — specs de render + estados (cargando/vacío/error)
- [ ] `admin/admin-auth/*` (guard, interceptor, navbar) — cubrir guard redirige sin token, interceptor adjunta Bearer
- [ ] Medir cobertura: `ng test --coverage` y cerrar los componentes < 80%

**Criterio de cierre:** correr cobertura en ambos lados, listar archivos bajo el umbral, y agregar tests hasta superar 80% por archivo (no solo global). Priorizar rutas con datos de salud y dinero (pacientes, citas, promociones).

### ✅ Renombre `servicios/detalle` → `servicios`
- [x] Carpeta `servicios/detalle/` → `servicios/`; archivos `servicio-detalle.component.*` → `servicios.component.*`
- [x] `ServicioDetalleComponent` → `ServiciosComponent`, selector `app-servicio-detalle` → `app-servicios`, interfaz `ServicioDetalleApi` → `ServicioApi`
- [x] Imports relativos corregidos (la carpeta subió un nivel) y rutas actualizadas en `routes.ts`

### ✅ Rutas duplicadas resueltas
- [x] Había dos archivos de rutas: `routes.ts` (activo, vía `config.ts`) y `app.routes.ts` (huérfano, sin enganchar). El huérfano tenía rutas que faltaban en el activo → `/mi-historial/:token` y `/admin/pacientes` caían al `**` redirect. Mergeadas en `routes.ts` y borrado `app.routes.ts`.

### ✅ CAUSA RAÍZ: backend desactualizado en puerto 8003
La mayoría de estos bugs venían de que `environment.ts` apuntaba a `http://localhost:8003`, donde corría una **instancia vieja del backend** (sin router de pacientes ni columnas de iconos). El backend actual corre en `8000` (puerto documentado en README/`package.json`). Confirmado: `8003/admin/pacientes` → 404, `8000/admin/pacientes` → 401.
- [x] **Corregido `environment.ts`** → ahora apunta a `http://localhost:8000`
- [x] **Limpieza DB** — eliminados 3 servicios viejos del seed inicial ("Podología General", "Tratamiento de Hongos", "Reflexología Podal") + sus citas/promos; quedan los 7 reales con iconos y colores
- [x] **Fix SCSS** — alineación de items en `admin-servicios.component.scss` (flex + ellipsis)
- [ ] **Acción del usuario:** correr el backend en `8000` (`npm run backend`) y cerrar la instancia vieja en `8003`; reiniciar `ng serve` para tomar el nuevo `environment.ts`
- [ ] **Verificar end-to-end** tras reiniciar: admin/servicios lista+edita, home lista solo DB, admin/pacientes funciona, portal `/mi-historial/:token`

### ✅ Notificaciones a pacientes _(no mandatorio)_ — COMPLETADO
El envío es **opcional y controlado por la admin** mediante un panel "Enviar al paciente" — nunca automático. Envío **síncrono** (no background task) para devolver feedback por canal.
- [x] **Panel "Enviar al paciente"** en el detalle del paciente (`/admin/pacientes`) — la admin decide caso por caso si se notifica
- [x] Sub-opciones (checkboxes): **enviar por email** y/o **enviar por WhatsApp** (solo se muestran si el canal está disponible para ese paciente)
- [x] **Validación previa al envío:**
  - Email: `EmailStr` en backend; en FE el canal email solo aparece si el paciente tiene email
  - Teléfono: validación de **móvil chileno** (56 + 9 + 8 dígitos) en backend (`validar_movil_chileno`) y FE (`esMovilChileno`); si no es válido, no se muestra la opción WhatsApp (aviso "Sin WhatsApp válido")
- [x] Envía el **contenido de las notas marcadas como visibles** + la **fecha sugerida para la próxima cita** (date opcional)
- [x] Reutiliza infraestructura existente: `notifications/mailer.py` (`send_nota_resumen`) y `whatsapp/cloud_api.py` (WhatsApp); orquestado en `notifications/pacientes_notify.py`
- [x] Endpoint `POST /admin/pacientes/{id}/notificar` con body `{ canales: ["email"|"whatsapp"], incluir_notas: bool, proxima_cita: date | null }` → 400 si no hay nada que enviar (sin notas visibles ni fecha)
- [x] Feedback de éxito/error por canal (`CanalResultado`) — la UI muestra "Email enviado ✓  ·  WhatsApp falló — …"
- [x] Tests: `tests/test_pacientes_notify.py` (20 backend) + caso `notificar` en `pacientes.service.spec.ts`; build FE verde, suite 184/184

### 🔒 Seguridad — datos de salud (auditoría 2026-05-31)
Los datos contienen información personal de salud → protección reforzada.

**✅ Auditado / Implementado:**
- [x] **SQL injection — PROTEGIDO** — 0 queries crudas en `routers/`; todo usa SQLAlchemy ORM con parámetros ligados. El `ilike(f"%{q}%")` de pacientes es seguro (el f-string arma solo el valor del patrón LIKE, que va ligado; no estructura SQL)
- [x] **Headers de seguridad** — middleware en `main.py`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; `Strict-Transport-Security` (HSTS) solo en producción
- [x] **CORS endurecido** — métodos y headers explícitos (ya no `["*"]`); orígenes desde `config/app.json`
- [x] **Rate limiting** — `rate_limit.py` (in-memory, sin dependencias): `/auth/login` 5/min por IP (anti fuerza bruta) y `/pacientes/{token}/perfil` 20/min por IP (anti enumeración)
- [x] **Guard de SECRET_KEY** — el backend se niega a arrancar en producción si `SECRET_KEY` es `changeme` o < 32 chars
- [x] **Docs ocultas en producción** — `/docs` y `/redoc` deshabilitados cuando `APP_ENV=production`
- [x] **`.env` NO versionado** — verificado: solo `backend/.env.example` está en git; `.env`/`.envrc`/`venv` en `.gitignore` ✓
- [x] **Token de portal** — `secrets.token_urlsafe(32)` = 256 bits de entropía ✓
- [x] **Secrets desde `.env`** vía `config.py` ✓
- [x] **Login no filtra info** — mensaje genérico "Usuario o contraseña incorrectos" (no revela si el usuario existe) ✓
- [x] **Password mínimo 8 chars** en bootstrap de admin ✓
- [x] **XSS** — escaneado el frontend: 0 usos de `[innerHTML]` / `bypassSecurityTrust`; Angular escapa interpolaciones por defecto ✓

**⏳ Pendiente (requiere infra/decisiones):**
- [ ] **HTTPS/TLS real** — depende del hosting (Vercel/Nginx/Caddy); el código ya emite HSTS en prod, pero el certificado y la redirección HTTP→HTTPS se configuran en el proxy/hosting
- [x] **Expiración de token de portal** — `access_token_expira` (migration `012`), caducidad configurable vía `PORTAL_TOKEN_EXPIRE_DAYS` (default 90 días); el portal rechaza tokens vencidos con 404 genérico
- [ ] **CSP (Content-Security-Policy)** — definir según assets (Cloudinary, Google Fonts) antes de activarlo
- [ ] **Rate limiter multi-worker** — el actual es in-memory (sirve `--workers 1`); para multi-instancia migrar a Redis (`slowapi`)
- [ ] **Logs sin datos sensibles** — revisar que no se logueen notas clínicas, tokens ni contraseñas
- [ ] Considerar **cifrado en reposo** del campo `contenido` de `NotaPaciente`
- [x] **`/auth/bootstrap` endurecido** — además del `bootstrap_secret`, ahora rechaza la creación si ya existe cualquier admin (evita crear admins con un SECRET_KEY filtrado)

---

## Pages / Routes

| Route | Component | Status |
|-------|-----------|--------|
| `/` | `HomeComponent` | ✅ Done |
| `/reservas` | `ReservasComponent` | ✅ Done |
| `/galeria` | `GaleriaComponent` | ✅ Done |
| `/admin/login` | `AdminLoginComponent` | ✅ Done |
| `/admin/opiniones` | `AdminOpinionesComponent` | ✅ Done |
| `/admin/galeria` | `AdminGaleriaComponent` | ✅ Done |

---

## Landing Page (`HomeComponent`) Sections

- [x] 1. Hero — título, badge, CTAs
- [x] 2. About — quién soy
- [x] 3. Servicios — tarjetas de servicios
- [x] 4. Por qué elegirme — diferenciadores
- [x] 5. CTA — llamada a acción
- [x] 6. Opiniones — testimonios
- [x] 7. Dejar opinión — formulario de reseña
- [x] Navbar — sticky/floating con logo y links
- [x] Footer — contacto, redes, horarios

---

## Admin Panel

- [x] JWT auth (passlib bcrypt + python-jose)
- [x] `POST /auth/login` — returns JWT
- [x] `POST /auth/bootstrap` — creates first admin (protected by SECRET_KEY)
- [x] Angular admin login page (`/admin/login`)
- [x] Admin opinions panel (`/admin/opiniones`) — list + delete
- [x] Admin gallery panel (`/admin/galeria`) — upload + publish + delete
- [x] `adminAuthGuard` + `adminAuthInterceptor` (JWT attached to all API requests)
- [x] **Menú superior unificado para todas las páginas admin** — `AdminNavbarComponent` compartido con nav centrado y `routerLinkActive`
- [x] **Admin opiniones: CRUD completo** — crear, editar y eliminar desde panel admin; backend `PATCH /opiniones/{id}` implementado
- [x] **Admin servicios: precio como entero** — etiqueta simplificada a "Precio", formato `number:'1.0-0'`
- [x] **Logout redirige al home** — `AdminAuthService.logout()` navega a `/` tras borrar el token

---

## Reservas Page (`ReservasComponent`)

- [x] Formulario: nombre, email, teléfono
- [x] Selector de servicio (GET /servicios)
- [x] Selector de fecha y hora disponible (GET /disponibilidad)
- [x] Confirmación / feedback al usuario
- [x] Integración con backend API (online/offline fallback)

---

## Galería Page (`GaleriaComponent`)

- [x] Grid responsivo con fotos y videos
- [x] Lightbox al hacer clic
- [x] Lazy loading + skeleton de carga
- [x] CTA para reservar hora
- [x] **Eliminar menú duplicado en sub-páginas** — la navbar aparece dos veces en `/galeria` y otras sub-páginas; eliminar la instancia duplicada

---

## Language

- [x] Todo el frontend en español chileno neutro (tú, no voseo argentino)

---

## Backend (FastAPI)

### Endpoints

- [x] `POST /auth/login` — JWT login
- [x] `POST /auth/bootstrap` — crear primer admin
- [x] `GET /servicios` — lista de servicios
- [x] `GET /disponibilidad?fecha=YYYY-MM-DD` — horarios libres
- [x] `POST /citas` — crear cita pública
- [x] `GET /citas/{id}` — detalle de cita
- [x] `PATCH /citas/{id}/estado` — cambiar estado
- [x] `GET /opiniones` — listar reseñas
- [x] `POST /opiniones` — guardar reseña
- [x] `DELETE /opiniones/{id}` — eliminar (solo admin)
- [x] `GET /galeria` — listar posts
- [x] `POST /galeria` — subir foto/video (solo admin)
- [x] `POST /galeria/{id}/publicar` — publicar en redes (solo admin)
- [x] `DELETE /galeria/{id}` — eliminar post (solo admin)
- [x] `GET /webhook/whatsapp` — verificación Meta
- [x] `POST /webhook/whatsapp` — mensajes entrantes → bot engine
- [x] `GET /health` — health check

### Modelos

- [x] `User` (username, email, hashed_password, is_admin, is_active)
- [x] `Paciente` (nombre, email, teléfono, notas)
- [x] `Servicio` (nombre, descripción, duración, precio)
- [x] `Cita` (fecha, hora, duración, estado, FK paciente+servicio)
- [x] `GaleriaPost` (titulo, descripcion, media_url, media_type, published, fb_post_id, ig_post_id)
- [x] `Opinion` (nombre, apellido, puntuacion, texto, servicios_ids)

### Infraestructura

- [x] `main.py` — FastAPI con todos los routers + CORS desde config
- [x] `auth.py` — JWT helpers + `get_current_admin` dependency
- [x] `routers/auth.py` — login + bootstrap
- [x] `routers/servicios.py` — CRUD
- [x] `routers/disponibilidad.py` — lógica de slots
- [x] `routers/citas.py` — booking público
- [x] `routers/opiniones.py` — CRUD (delete protegido)
- [x] `routers/galeria.py` — upload + social publish
- [x] `routers/webhook.py` — WhatsApp webhook
- [x] `whatsapp/bot_engine.py` — matching de intents desde JSON
- [x] `whatsapp/cloud_api.py` — envío de mensajes via Meta API
- [x] `social/meta.py` — publicación en Facebook + Instagram
- [x] `alembic/versions/001_initial_schema.py` — tablas base + seed
- [x] `alembic/versions/002_add_users_and_galeria.py` — users + galeria_posts
- [x] `requirements.txt` — passlib, python-jose, httpx, python-multipart

### Config files (config/)

- [x] `config/app.json` — horarios, contacto, CORS origins, booking settings
- [x] `config/whatsapp.json` — credenciales WA + mensajes por defecto
- [x] `config/whatsapp_responses.json` — intents del bot (editable sin código)
- [x] `config/social_accounts.json` — cuentas FB + IG multi-cuenta
- [x] `config.py` — unified settings loader (env vars + JSON files)
- [x] `.env.example` — todas las variables documentadas

---

## Shared Components (Angular)

- [x] `NavbarComponent`
- [x] `StarRatingComponent`
- [x] `TestimonialsService`
- [x] `ReservasService`
- [x] `FooterComponent`
- [x] `AdminAuthService` — JWT token management
- [x] `AdminAuthGuard` — protege rutas admin
- [x] `AdminAuthInterceptor` — adjunta Bearer token automáticamente

---

## Design System

- [x] `design-system/libélula-podología-y-terapias/MASTER.md` (uipro)
- [x] Paleta: rosado/dorado sobre blanco cálido
- [x] Tipografía: Playfair Display + Inter

---

## Integraciones futuras

- [x] Google Calendar (integración completa — ver Roadmap)
- [x] Email de confirmación al paciente
- [x] WhatsApp recordatorio automático por cita (scheduler diario a las 10:00)

---

## Roadmap — Nuevas Funcionalidades

### Página de Detalle por Servicio
Cada tarjeta de servicio en el home enlaza a `/servicios/:id` con contenido completo almacenado en la base de datos y gestionado desde el panel admin.

**Modelo de contenido por servicio (todo en DB)**
- `descripcion` (ya existe) — descripción corta; se muestra en las tarjetas del home
- `descripcion_larga` (nuevo) — descripción extensa con beneficios, indicaciones, etc.; se muestra en `/servicios/:id`
- `subtitulo` (nuevo) — frase destacada debajo del título en la página de detalle (ej: "Para el bienestar de tus pies")
- `fotos_urls` (nuevo) — JSON array de URLs Cloudinary; galería de imágenes en la página de detalle

**Backend**
- [x] Extender modelo `Servicio` con: `subtitulo` (String, nullable), `descripcion_larga` (Text, nullable), `fotos_urls` (Text, nullable — JSON array)
- [x] Migration `006_add_servicio_detalle.py` — columnas nullable para no romper registros existentes
- [x] Actualizar schema `ServicioOut` para incluir los nuevos campos
- [x] `PATCH /servicios/{id}` (admin) — editar nombre, descripcion, subtitulo, descripcion_larga, duración, precio
- [x] `POST /servicios/{id}/fotos` (admin) — subir foto a Cloudinary y añadir URL al JSON array `fotos_urls`
- [x] `DELETE /servicios/{id}/fotos/{index}` (admin) — eliminar foto por índice del array y borrar de Cloudinary

**Frontend — página de detalle**
- [x] Nueva ruta `/servicios/:id` en `app.routes.ts` (lazy load)
- [x] Nuevo componente en `frontend/src/app/servicios/detalle/` con los 4 archivos: `servicio-detalle.component.ts` `.html` `.scss` `.spec.ts`
- [x] Muestra: título, subtítulo, descripción larga, galería de fotos, precio, duración y CTA "Reservar este servicio"
- [x] Enlazar cada tarjeta del home a `/servicios/:id` con `[routerLink]`
- [x] La descripción corta (`descripcion`) sigue mostrándose en las tarjetas del home sin cambios

**Frontend — panel admin**
- [x] Ruta `/admin/servicios` (lazy load, protegida con `adminAuthGuard`)
- [x] Nuevo componente en `frontend/src/app/admin/servicios/` con los 4 archivos: `admin-servicios.component.ts` `.html` `.scss` `.spec.ts`
- [x] Lista todos los servicios; al seleccionar uno: formulario para editar nombre, descripcion corta, subtitulo, descripcion_larga, duración y precio
- [x] Sección de fotos: subir nuevas imágenes (Cloudinary), previsualizar, eliminar individualmente
- [x] Añadir enlace al panel admin en la navegación lateral/header del admin

---

### Iconos de Servicios (admin + home)
Las tarjetas de servicios en el home muestran un ícono de Material Icons por servicio. El ícono actualmente está hardcodeado en el frontend; debe guardarse en la base de datos y ser seleccionable desde el panel admin.

**Backend**
- [x] Agregar columna `icono` (String(64), nullable) al modelo `Servicio` en `models.py`
- [x] Migration `007_add_servicio_icono.py` — columna nullable, no rompe registros existentes
- [x] Incluir `icono` en `ServicioOut`, `ServicioUpdate` y `ServicioCreate` en `schemas.py`

**Seeding — datos reales de la página home**
Los 7 servicios hardcodeados en `home.component.ts` (líneas 84–91) deben insertarse en la DB via `seed.py` en lugar del placeholder genérico actual. Datos a migrar:
- `Podología` — dur: 45 min, precio: 25000, icono: `podologia`
- `Reiki` — dur: 60 min, precio: 20000, icono: `reiki`
- `Reflexología` — dur: 60 min, precio: 20000, icono: `reflexologia`
- `Esencias Florales` — dur: 45 min, precio: 18000, icono: `aromaterapia`
- `Auriculoterapia` — dur: 45 min, precio: 18000, icono: `ayuda` _(temp — crear `auriculoterapia.svg` pendiente)_
- `Masajes Linfáticos` — dur: 60 min, precio: 22000, icono: `masaje`
- `Tuina` — dur: 60 min, precio: 22000, icono: `herramientas` _(temp — crear `tuina.svg` pendiente)_

**Iconos personalizados pendientes de crear** _(agregar a `src/assets/icons/` en los 3 tamaños: 16px, 24px, 32px)_
- [ ] `auriculoterapia.svg` — oreja/pabellón auricular con puntos de estimulación; reemplaza `ayuda` en Auriculoterapia
- [ ] `tuina.svg` — manos aplicando presión en espalda o columna (masaje tradicional chino); reemplaza `herramientas` en Tuina
- [x] Actualizar `seed.py` → `_seed_servicios()` con los 7 servicios reales (nombres, descripciones, duración, precio, icono)
- [x] Home component lee servicios desde `GET /servicios` en el cliente; la lista estática sirve de fallback SSR hasta que la API responda

**Frontend — panel admin**
- [x] Selector visual de ícono en `admin-servicios` — grilla de los 34 íconos personalizados con preview en tiempo real del seleccionado

**Frontend — home page**
- [x] Leer `icono` desde `GET /servicios`; fallback `'bienestar'` si es null

**Ícono de la app (favicon y PWA)**
- [ ] Reemplazar el favicon genérico de Angular por `src/assets/icons/libelulas_icons/dragonfly_icon.ico` en `frontend/src/index.html` (etiqueta `<link rel="icon">`)
- [ ] Usar la misma imagen como `apple-touch-icon` y en los manifests de PWA (`manifest.webmanifest` / `ngsw-config.json`) si están presentes
- [ ] Verificar que el ícono aparezca correctamente en la pestaña del navegador, al agregar a pantalla de inicio (móvil) y en el historial del navegador

**Migración de iconos — eliminar Material Icons**
- [ ] Auditar todos los componentes y templates Angular en busca de `<mat-icon>` y referencias a nombres de Material Icons (strings como `'star'`, `'close'`, `'check'`, etc.)
- [ ] Reemplazar cada `<mat-icon>` por `<app-icon>` usando los SVGs de `src/assets/icons/`
- [ ] Para iconos funcionales sin equivalente en assets (flechas, cierre de modal, etc.), crear los SVGs faltantes en los 3 tamaños (16px, 24px, 32px) y agregarlos a `src/assets/icons/`
- [ ] Una vez migrados todos los usos, eliminar `MatIconModule` de los módulos/imports que ya no lo necesiten

---

### Paleta de colores de marca para íconos de servicios
Reemplazar los colores genéricos de `_tokens.scss` con la paleta oficial de 4 colores de la marca, y almacenar el **nombre del color** (no el hex) en la columna `icono_color`.

**Paleta oficial** (constante compartida `BRAND_COLORS` en `src/app/shared/colors/brand-colors.ts`):

| Nombre clave   | Label UI         | Hex       | RGB              | Uso sugerido |
|----------------|------------------|-----------|------------------|--------------|
| `rosa_empolvado` | Rosa empolvado | `#c2607a` | 194, 96, 122     | Navegación   |
| `dorado_mostaza` | Dorado mostaza | `#b88334` | 184, 131, 52     | Admin        |
| `verde_salvia`   | Verde salvia   | `#748f5e` | 116, 143, 94     | Terapias     |
| `ciruela`        | Ciruela        | `#a4708f` | 164, 112, 143    | Marca        |

> Nota: `#748f5e` (verde salvia) es exactamente el color baked-in de los SVGs personalizados — coincidencia de diseño.

**Backend**
- [ ] Cambiar columna `icono_color` en `Servicio` para almacenar el nombre clave (e.g. `'verde_salvia'`) en lugar del hex directo — el frontend resuelve el hex desde el diccionario
- [ ] No requiere migración de esquema (sigue siendo `String(16)` → quizás ampliar a `String(32)` para nombres más largos)
- [ ] Migration `009_resize_icono_color.py` si el tamaño actual (`String(16)`) no alcanza para `'dorado_mostaza'` (15 chars — justo al límite; mejor aumentar a `String(32)`)
- [ ] Actualizar `seed.py` con los nuevos nombres de color por servicio:
  - Podología → `rosa_empolvado`
  - Reiki → `verde_salvia`
  - Reflexología → `verde_salvia`
  - Esencias Florales → `verde_salvia`
  - Auriculoterapia → `dorado_mostaza`
  - Masajes Linfáticos → `verde_salvia`
  - Tuina → `dorado_mostaza`

**Frontend**
- [x] Crear `src/app/shared/colors/brand-colors.ts` — `BRAND_COLORS`, `BRAND_COLOR_MAP`, `resolveColor(key)`
- [x] En `admin-servicios`: 4 swatches de marca; almacena clave (`'verde_salvia'`) en DB
- [x] En `home.component.ts`: `resolveColor(s.icono_color)` mapea clave → hex; fallback estático usa claves
- [x] En `servicio-detalle.component.ts`: mismo `resolveColor()` antes de aplicar `--icon-bg`

---

### Publicación en Redes Sociales (Agentes IA)
- [x] Agente que publique imágenes y videos con comentarios generados por IA en Instagram y Facebook
  - `social/caption_generator.py` — llama Anthropic API (claude-haiku) para generar caption en español
  - Agente recibe: media (imagen/video) + contexto (servicio, promoción, etc.) → genera caption → publica
  - Panel admin: campo de texto para guiar el tono + contexto extra opcional; caption editable antes de publicar
  - `POST /galeria/{id}/generar-caption` — genera y devuelve caption sin publicar
  - `POST /galeria/{id}/publicar` acepta `caption` opcional en el body
  - Soporte para Stories e Instagram Reels (video corto via `REELS` media_type en meta.py)

### Google Calendar + Disponibilidad para la Podóloga
- [x] Completar integración Google Calendar (sincronizar citas confirmadas con evento en Calendar)
  - `integrations/google_calendar.py` — OAuth2 service, create/update/delete events
  - Evento creado en background al crear cita; borrado al cancelar; actualizado al reprogramar
  - Requiere configurar `GOOGLE_*` vars en `.env` (ver `.env.example`)
- [x] Panel admin para que la podóloga defina su disponibilidad `/admin/disponibilidad`
  - Modelo `BloqueDisponibilidad` — bloques semanales o por fecha específica
  - Modelo `FechaBloqueo` — días completamente bloqueados (feriados, vacaciones)
  - Migration `003_add_disponibilidad_dinamica.py` con seed del horario original
  - `GET /disponibilidad` ahora consulta DB en vez de config JSON hardcodeado
  - Router admin `POST/DELETE /admin/disponibilidad/bloques` y `/bloqueos` (JWT protegido)
  - Angular `AdminDisponibilidadComponent` con tabs: "Horario semanal" + "Días bloqueados"
  - [x] **Días bloqueados: bloqueo por rango de fechas** — en la tab "Días bloqueados", agregar opción para bloquear un rango de fechas (inicio → fin); el rango puede ser de 1 solo día (fecha inicio = fecha fin); útil para vacaciones, feriados extendidos, etc.
  - [ ] **Visualización de días bloqueados: mini calendario** _(no urgente)_ — la lista actual de filas planas no permite ver el contexto mensual de un vistazo; reemplazar o complementar con una vista tipo calendario (grilla mensual con días bloqueados resaltados en rojo); considerar una librería como `ngx-mat-calendar` o un mini calendario custom con CSS grid; la lista actual puede mantenerse como detalle al hacer clic en un día

### Promociones con Descuento
- [x] Modelo `Promocion` (servicio_id, porcentaje_descuento, descripcion, fecha_inicio, fecha_fin, hora_inicio, hora_fin)
- [x] Migration `004_add_promociones.py` — tabla `promociones` con CHECK constraints
- [x] Endpoint `GET /promociones/vigentes` → devuelve promociones activas ahora mismo (filtro por servicio_id opcional)
- [x] Endpoints admin `GET/POST/PATCH/DELETE /promociones` (JWT protegido)
- [x] Mostrar badge de descuento animado en el selector de servicios del formulario de reserva
- [x] Panel admin `/admin/promociones` — crear, activar/desactivar, eliminar
- [x] Lógica: al crear cita en horario de promoción, guardar precio con descuento aplicado en `Cita`
- [x] **Descuento global sobre todos los servicios** — toggle "Todos los servicios" en `/admin/promociones`; preview con precios originales tachados y precios con descuento; `servicio_id = null` en DB; migration `010` aplicada
- [ ] **Publicar promoción en redes sociales** _(futuro)_ — desde el panel de promociones, botón para publicar la promoción activa en Instagram/Facebook usando el agente IA de captions; reutilizar la infraestructura de `social/meta.py` y `social/caption_generator.py`

### Tests Unitarios e Integración
- [x] **Backend (pytest + httpx AsyncClient)**
  - `tests/conftest.py` — SQLite in-memory DB + override `get_db` + admin token fixture
  - `tests/test_auth.py` — login válido/inválido, bootstrap, token expirado
  - `tests/test_citas.py` — crear cita, deduplicar paciente por email, servicio no existe
  - `tests/test_disponibilidad.py` — slots con bloqueo activo, fallback semanal, slots ocupados
  - `tests/test_opiniones.py` — listar, crear, eliminar (admin), eliminar sin token
  - `tests/test_servicios.py` — listar servicios
  - `tests/test_promociones.py` — vigentes, CRUD admin
- [x] **Frontend (Jasmine + Angular TestBed)**
  - `reservas.service.spec.ts` — mock HTTP, getServicios/getDisponibilidad/crearCita
  - `admin-auth.service.spec.ts` — login, logout, token storage
  - `reservas.component.spec.ts` — form validation, slot loading on change, submit flow
  - `home.component.spec.ts` — renderiza todas las secciones (Hero, About, Servicios, etc.)
  - `star-rating.component.spec.ts` — renderiza estrellas correctamente por valor
- [x] **Nota:** `home.component.spec.ts` es el "test de página global" — usa TestBed para renderizar el componente completo y verifica que cada sección esté presente en el DOM

### Portal de Pacientes
Área privada donde los pacientes pueden consultar sus notas, comentarios post-cita y sugerencias de tratamiento registradas por la podóloga.

**Modelo / Backend**
- [x] Modelo `NotaPaciente` (paciente_id FK, cita_id FK nullable, contenido Text, tipo, created_at, visible_paciente bool)
- [x] Migration `011_add_notas_paciente.py` — tabla `notas_paciente` + columna `access_token` en `pacientes`
- [x] Endpoints: `GET/POST/PATCH/DELETE /admin/pacientes/{id}/notas` (solo admin), `GET /pacientes/{token}/perfil` (token sin login)
- [x] Generar `access_token` único por paciente con `POST /admin/pacientes/{id}/generar-token` (regenerable)
- [x] Endpoint `GET /pacientes/{token}/perfil` — devuelve nombre + notas visibles (`visible_paciente=true`)

**Frontend — vista paciente**
- [x] Ruta `/mi-historial/:token` — página pública sin login, accesible solo con token
- [x] Muestra: nombre del paciente, lista de notas/sugerencias visibles, fecha de cada entrada
- [x] Diseño en línea con el resto del sitio (tokens de la marca Libélula)

**Frontend — panel admin**
- [x] Sección `/admin/pacientes` con botón "Agregar nota" por paciente
- [x] Formulario: tipo de nota, contenido, checkbox "visible para el paciente"
- [x] Lista de notas anteriores del paciente con opción de editar/eliminar

---

### Registro de Tratamientos (Log de la Podóloga)
Sistema de bitácora interna donde la podóloga registra observaciones, sugerencias de tratamiento y seguimiento por paciente. Base para el portal de pacientes.

**Modelo / Backend**
- [x] Integrado con `NotaPaciente` (mismo modelo, campo `tipo` distingue el uso)
- [x] Endpoint `GET /admin/pacientes` — lista de pacientes con búsqueda `?q=`
- [x] Endpoint `GET /admin/pacientes/{id}` — perfil completo: datos + todas las notas

**Frontend — panel admin**
- [x] Ruta `/admin/pacientes` — lista de pacientes registrados (búsqueda por nombre/email)
- [x] Vista de perfil por paciente: log de notas/sugerencias (master-detail)
- [x] Editor de notas con tipo: seguimiento, sugerencia, recordatorio, otro
- [x] Opción de marcar nota como "visible para el paciente" (se muestra en `/mi-historial/:token`)
- [x] Botón "Compartir historial" — genera/regenera link con token único + copiar al portapapeles

> _Nota futura:_ el perfil admin aún no muestra el historial de **citas** del paciente (solo notas). Agregar cuando sea necesario.

---

### Avatar IA de la Podóloga (Idea / No prioritario)
- [ ] **Investigar y comparar herramientas de avatar IA realista** — evaluar cuál produce los resultados más realistas para foto y/o video:
  - **HeyGen** — líder en lip-sync realista, acepta foto estática → video parlante; tiene API
  - **D-ID** — similar a HeyGen, buena API REST, plan gratuito limitado
  - **Synthesia** — más orientado a presentadores corporativos, menos natural para uso personal
  - **Kling AI / Runway / Pika** — generación de video desde imagen estática con movimiento natural (no lip-sync, pero más cinematográfico)
  - **ElevenLabs** (solo voz) — clonar voz de la podóloga para TTS; combinable con cualquier avatar visual
  - **Recraft** — generación de imágenes fotorrealistas de alta calidad; útil para crear imagen base del avatar o material visual para RRSS
  - Considerar también soluciones open-source (SadTalker, MuseTalk) si se quiere evitar costos por API
- [ ] Definir caso de uso principal antes de elegir herramienta:
  - _Foto animada_ (habla a cámara) → HeyGen o D-ID
  - _Video con movimiento natural_ (sin lip-sync) → Kling AI / Runway
  - _Solo audio personalizado_ → ElevenLabs + imagen estática en post
- [ ] Integración posible: admin escribe script → API genera video → se publica en RRSS automáticamente
- [ ] Considerar costo/privacidad antes de implementar (requiere consentimiento explícito de imagen)

---

### Confiabilidad de sincronización con Google Calendar
La agenda de la podóloga ES Google Calendar (esa fue siempre la idea). Hoy la cita se crea en Calendar con un background task "fire-and-forget" que falla en silencio. El `google_event_id` en la tabla `citas` es la fuente de verdad: lleno = evento existe; NULL = nunca se creó.

**Verificación inicial (acción del usuario)**
- [ ] Confirmar que en Railway estén las 4 vars: `GOOGLE_CALENDAR_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`. Si falta alguna, NO se sincroniza nada (silenciosamente).
- [ ] Generar el `GOOGLE_REFRESH_TOKEN` una vez con `scripts/gcal_auth.py` y setearlo en Railway.

**Mejoras de confiabilidad (código)**
- [ ] **Job de reconciliación** en `scheduler.py`: buscar citas futuras con `google_event_id IS NULL` y estado != cancelada, y reintentar `create_event`; persistir el id al lograrlo. Esto es la verdadera "garantía".
- [ ] **Alerta de fallo**: si la sincronización falla, registrar en un campo/log visible (ej. `calendar_sync_error`) y/o notificar al admin, en vez de fallar en silencio.
- [ ] **Endpoint admin** `POST /admin/citas/{id}/sync-calendar` para forzar manualmente la creación del evento de una cita puntual.
- [ ] **Healthcheck** opcional: endpoint admin que confirme que las credenciales de Calendar son válidas (hace un get trivial a la API).

### ✅ Panel Admin — Agenda de Citas (`/admin/citas`) — COMPLETADO
Aunque la agenda principal es Google Calendar, una vista propia permite ver el estado de confirmación de cada paciente (que Calendar no muestra).

**Backend**
- [x] Endpoint `GET /admin/citas` — listar citas con filtros (`desde`/`hasta`/`estado`), datos de paciente y servicio aplanados (`CitaAdminOut`)
- [x] Respuesta incluye: `estado`, `paciente_confirmo`, `sincronizada_calendar` (de `google_event_id`), `confirmacion_48h_enviada`/`24h_enviada`
- [~] (Opcional) Cambiar estado manualmente — ya existe `PATCH /citas/{id}/estado`; falta botón en UI

**Frontend — panel admin**
- [x] Ruta `/admin/citas` (lazy, `adminAuthGuard`) + link "Citas" en `AdminNavbarComponent`
- [x] Vista de agenda agrupada por día: fecha, hora, paciente, servicio, contacto, estado
- [x] **Badge de confirmación del paciente**: ✓ asistirá / ✗ no asistirá / ⏳ sin responder
- [x] **Badge de sincronización con Calendar**: ✓ en calendario / ⚠ sin sincronizar
- [x] Filtros por fecha (desde/hasta) y estado; orden por fecha/hora
- [ ] (Opcional) Botón "Forzar sincronización" por cita (depende del endpoint de reconciliación, aún pendiente)
- [ ] (Opcional) Botón para cambiar estado (completada/cancelada) desde la agenda

---

### Gestión de Usuarios Admin (baja prioridad — al final de la lista)
Hoy el admin por defecto se crea por migración (`014_seed_default_data.py`) y se gestiona manualmente en Railway/DB. Esta página es un "nice to have" para administrar usuarios desde la UI sin tocar la base de datos.

**Backend**
- [ ] Endpoint `GET /admin/usuarios` — listar usuarios admin (solo admin)
- [ ] Endpoint `POST /admin/usuarios` — crear nuevo usuario admin (username, email, password)
- [ ] Endpoint `PATCH /admin/usuarios/{id}/password` — cambiar la propia contraseña (verificar contraseña actual)
- [ ] Endpoint `PATCH /admin/usuarios/{id}` — activar/desactivar usuario, editar email
- [ ] Endpoint `DELETE /admin/usuarios/{id}` — eliminar usuario (no permitir eliminar el último admin activo)
- [ ] Schemas: `UsuarioCreate`, `UsuarioUpdate`, `PasswordChange`, `UsuarioOut` (nunca exponer `hashed_password`)
- [ ] Validar contraseña mínimo 8 chars; reutilizar `hash_password` / `verify_password` de `auth.py`

**Frontend — panel admin**
- [ ] Ruta `/admin/usuarios` (lazy, protegida con `adminAuthGuard`) + link en `AdminNavbarComponent`
- [ ] Lista de usuarios con estado (activo/inactivo) y email
- [ ] Formulario "Cambiar mi contraseña" (contraseña actual + nueva + confirmación)
- [ ] Formulario "Crear nuevo usuario admin"
- [ ] Acciones: activar/desactivar, eliminar (con confirmación y guardia del último admin)

**Seguridad**
- [ ] Solo un admin autenticado puede gestionar usuarios
- [ ] No permitir que un usuario se desactive/elimine a sí mismo si es el último admin activo
- [ ] Cambios de contraseña requieren re-verificar la contraseña actual

---

## Dev Setup

```bash
# Frontend
cd frontend && npm install && ng serve

# Backend
cd backend
cp .env.example .env   # completar credenciales reales
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload

# Crear primer admin (una sola vez)
curl -X POST http://localhost:8000/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@libelula.cl","password":"CONTRASEÑA_SEGURA","bootstrap_secret":"EL_SECRET_KEY_DE_.ENV"}'
```
