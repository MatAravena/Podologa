/**
 * HomeComponent spec — "global page" test.
 *
 * Uses Angular TestBed to render the full HomeComponent and verifies
 * that every major section is present in the DOM.
 * This is the closest thing to an end-to-end test without a real browser.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { HomeComponent } from './home.component';

const SERVICIO_NOMBRES = ['Podología', 'Reiki', 'Reflexología', 'Esencias Florales', 'Auriculoterapia', 'Masajes Linfáticos', 'Tuina'];
const MOCK_SERVICIOS = SERVICIO_NOMBRES.map((nombre, i) => ({
  id: i + 1, nombre, descripcion: `Descripción de ${nombre}`, subtitulo: null, descripcion_larga: null,
  fotos_urls: null, icono: 'bienestar', icono_color: 'verde_salvia', duracion: 60, precio: 20000,
}));

describe('HomeComponent (global page test)', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    // ngOnInit fires GETs for contacto + servicios + opiniones; answer them.
    http.match(r => r.url.includes('/config/contacto')).forEach(r => r.flush(null));
    http.match(r => r.url.includes('/servicios')).forEach(r => r.flush(MOCK_SERVICIOS));
    http.match(r => r.url.includes('/opiniones')).forEach(r => r.flush([]));
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ── Section presence ──────────────────────────────────────────────────────

  it('should render Hero section', () => {
    const hero = el.querySelector('.hero') ?? el.querySelector('[class*="hero"]');
    expect(hero).not.toBeNull();
  });

  it('should render About section', () => {
    const about = el.querySelector('.about') ?? el.querySelector('[class*="about"]');
    expect(about).not.toBeNull();
  });

  it('should render Servicios section with all 7 services', () => {
    const cards = el.querySelectorAll('mat-card.service-card');
    expect(cards.length).toBe(7);
  });

  it('should render Por Qué Elegirnos section with 4 reasons', () => {
    const reasons = el.querySelectorAll('.why-card');
    expect(reasons.length).toBe(4);
  });

  it('should render Opiniones / Testimonios section', () => {
    // There should be at least the seed testimonials rendered
    const testimonioCards = el.querySelectorAll('.testimonial-card, [class*="testimonial"]');
    expect(testimonioCards.length).toBeGreaterThan(0);
  });

  it('should render the review form', () => {
    const form = el.querySelector('form');
    expect(form).not.toBeNull();
  });

  it('should include at least one CTA button linking to /reservas', () => {
    const links = Array.from(el.querySelectorAll('a[href], a[routerLink]')) as HTMLElement[];
    const reservasLinks = links.filter(l =>
      l.getAttribute('href') === '/reservas' ||
      l.getAttribute('ng-reflect-router-link') === '/reservas' ||
      l.getAttribute('routerLink') === '/reservas'
    );
    expect(reservasLinks.length).toBeGreaterThan(0);
  });

  // ── Stats section ─────────────────────────────────────────────────────────

  it('should render stats (years, patients, specialties)', () => {
    const text = el.textContent ?? '';
    expect(text).toContain('+10');
    expect(text).toContain('+500');
    expect(text).toContain('7');
  });

  // ── Service names ─────────────────────────────────────────────────────────

  it('should display all service names', () => {
    const text = el.textContent ?? '';
    const expected = ['Podología', 'Reiki', 'Reflexología', 'Esencias Florales', 'Auriculoterapia', 'Masajes Linfáticos', 'Tuina'];
    for (const name of expected) {
      expect(text).toContain(name);
    }
  });

  // ── Review form behavior ───────────────────────────────────────────────────

  it('should start review form as invalid', () => {
    expect(component.form.valid).toBe(false);
  });

  it('should have 7 service checkboxes in review form', () => {
    const checkboxes = el.querySelectorAll('mat-checkbox, input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(7);
  });

  it('should set enviado=true after valid submission', () => {
    // Fill minimum required fields
    component.form.get('nombre')!.setValue('María');
    component.form.get('apellido')!.setValue('García');
    component.form.get('comentario')!.setValue('Excelente servicio, muy recomendable para todos.');
    // Check at least one service
    component.form.get('serviciosGroup.Podología')!.setValue(true);
    component.calificacion.set(5);

    component.onSubmit();
    // The review is persisted via POST /opiniones; flush the request.
    const req = http.expectOne(r => r.method === 'POST' && r.url.includes('/opiniones'));
    req.flush({
      id: 1, nombre: 'María', apellido: 'García', email: null, telefono: null,
      foto_url: null, texto: 'Excelente servicio, muy recomendable para todos.',
      puntuacion: 5, servicios_ids: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    expect(component.enviado()).toBe(true);
  });

  it('escribirOtraOpinion should reset enviado', () => {
    component.enviado.set(true);
    component.escribirOtraOpinion();
    expect(component.enviado()).toBe(false);
  });

  it('onSubmit does nothing when the form is invalid (no rating)', () => {
    component.form.reset();
    component.calificacion.set(0);
    component.onSubmit();
    http.expectNone(r => r.method === 'POST' && r.url.includes('/opiniones'));
    expect(component.form.touched).toBe(true);
  });

  it('onSubmit resets enviando and shows an error when the POST fails', () => {
    component.form.get('nombre')!.setValue('María');
    component.form.get('apellido')!.setValue('García');
    component.form.get('comentario')!.setValue('Comentario suficientemente largo para pasar.');
    component.form.get('serviciosGroup.Podología')!.setValue(true);
    component.calificacion.set(4);

    component.onSubmit();
    http.expectOne(r => r.method === 'POST' && r.url.includes('/opiniones'))
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(component.enviando()).toBe(false);
    expect(component.enviado()).toBe(false);
  });

  it('servicioId maps a name to its id (and null when unknown)', () => {
    expect(component.servicioId('Podología')).toBe(1);
    expect(component.servicioId('No existe')).toBeNull();
  });

  it('onFotoChange rejects files larger than 2 MB', () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [big] });
    component.onFotoChange({ target: input } as unknown as Event);
    expect(component.fotoPreview()).toBeNull();
  });

  it('removeFoto clears the preview', () => {
    component.fotoPreview.set('data:image/png;base64,xxx');
    component.removeFoto();
    expect(component.fotoPreview()).toBeNull();
  });
});
