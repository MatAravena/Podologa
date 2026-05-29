# TODO — Libélula Podología y Terapias

## Stack
- **Frontend**: Angular 19 (SSR), Angular Material, SCSS
- **Backend**: Python / FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Design**: uipro Beauty & Spa tokens (warm, professional, trustworthy)

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

### Promociones con Descuento
- [x] Modelo `Promocion` (servicio_id, porcentaje_descuento, descripcion, fecha_inicio, fecha_fin, hora_inicio, hora_fin)
- [x] Migration `004_add_promociones.py` — tabla `promociones` con CHECK constraints
- [x] Endpoint `GET /promociones/vigentes` → devuelve promociones activas ahora mismo (filtro por servicio_id opcional)
- [x] Endpoints admin `GET/POST/PATCH/DELETE /promociones` (JWT protegido)
- [x] Mostrar badge de descuento animado en el selector de servicios del formulario de reserva
- [x] Panel admin `/admin/promociones` — crear, activar/desactivar, eliminar
- [x] Lógica: al crear cita en horario de promoción, guardar precio con descuento aplicado en `Cita`

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

### Avatar IA de la Podóloga (Idea / No prioritario)
- [ ] Explorar herramientas de avatar IA realista (HeyGen, D-ID, Synthesia) que permitan:
  - Subir foto de la podóloga → generar avatar con su apariencia
  - Ingresar texto → avatar lo "habla" en video (texto a voz + lip-sync)
  - Uso: videos informativos sobre servicios, promociones, recordatorios personalizados
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
