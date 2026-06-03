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

### ✅ CAUSA RAÍZ: backend desactualizado en puerto 8003
La mayoría de estos bugs venían de que `environment.ts` apuntaba a `http://localhost:8003`, donde corría una **instancia vieja del backend** (sin router de pacientes ni columnas de iconos). El backend actual corre en `8000` (puerto documentado en README/`package.json`). Confirmado: `8003/admin/pacientes` → 404, `8000/admin/pacientes` → 401.
- [x] **Corregido `environment.ts`** → ahora apunta a `http://localhost:8000`
- [x] **Limpieza DB** — eliminados 3 servicios viejos del seed inicial ("Podología General", "Tratamiento de Hongos", "Reflexología Podal") + sus citas/promos; quedan los 7 reales con iconos y colores
- [x] **Fix SCSS** — alineación de items en `admin-servicios.component.scss` (flex + ellipsis)
- [ ] **Acción del usuario:** correr el backend en `8000` (`npm run backend`) y cerrar la instancia vieja en `8003`; reiniciar `ng serve` para tomar el nuevo `environment.ts`
- [ ] **Verificar end-to-end** tras reiniciar: admin/servicios lista+edita, home lista solo DB, admin/pacientes funciona, portal `/mi-historial/:token`

### Notificaciones a pacientes _(no mandatorio)_
El envío es **opcional y controlado por la admin** mediante un checkbox — nunca automático.
- [ ] **Checkbox "Enviar al paciente"** en el editor de notas / al guardar — la admin decide caso por caso si se notifica
- [ ] Sub-opciones (checkboxes): **enviar por email** y/o **enviar por WhatsApp**
- [ ] **Validación previa al envío:**
  - Email: validar formato (`EmailStr` en backend ya lo cubre; validar también en FE antes de habilitar el checkbox)
  - Teléfono: validar que sea **número chileno válido** (formato `+56 9 XXXX XXXX`, móvil de 9 dígitos empezando en 9) — si no es válido, deshabilitar la opción WhatsApp y mostrar aviso
- [ ] Enviar el **contenido de las notas marcadas como visibles** + la **fecha ideal sugerida para la próxima cita**
- [ ] Reutilizar infraestructura existente: `notifications/mailer.py` (email) y `whatsapp/cloud_api.py` (WhatsApp)
- [ ] Endpoint `POST /admin/pacientes/{id}/notificar` con body `{ canal: ["email"|"whatsapp"], incluir_notas: bool, proxima_cita: date | null }`
- [ ] Mostrar feedback de éxito/error por canal (ej: "Email enviado ✓, WhatsApp falló — número inválido")

### 🔒 Seguridad — datos de salud (prioridad alta)
Los datos contienen información personal de salud → requieren protección reforzada.
- [ ] **Auditar prevención de SQL injection** — confirmar que todo usa SQLAlchemy ORM con parámetros ligados (no f-strings/concatenación en queries); revisar especialmente `routers/pacientes.py` (búsqueda `?q=` con `ilike`)
- [ ] **Conexiones seguras (HTTPS/TLS)** — forzar HTTPS en producción; revisar headers de seguridad (HSTS, CSP, X-Content-Type-Options, X-Frame-Options)
- [ ] **Tokens de portal de pacientes** — `access_token` da acceso a datos de salud sin login; evaluar expiración del token y rate limiting en `/pacientes/{token}/perfil` (ya usa `secrets.token_urlsafe(32)` ✓)
- [ ] **Validación y sanitización de inputs** — revisar endpoints que reciben texto libre (notas, opiniones) contra XSS al renderizar en el frontend
- [ ] **Rate limiting / protección fuerza bruta** en `/auth/login`
- [ ] **Secrets management** — verificar que `SECRET_KEY`, credenciales DB y API keys vengan de `.env` (vía `config.py` ✓) y que `.env` no esté versionado
- [ ] **Logs sin datos sensibles** — no loguear contenidos de notas clínicas, tokens ni contraseñas
- [ ] Considerar **cifrado en reposo** del campo `contenido` de `NotaPaciente`

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
