/**
 * HomeComponent spec — "global page" test.
 *
 * Uses Angular TestBed to render the full HomeComponent and verifies
 * that every major section is present in the DOM.
 * This is the closest thing to an end-to-end test without a real browser.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { HomeComponent } from './home.component';
import { TestimonialsService } from '../shared/testimonials/testimonials.service';

describe('HomeComponent (global page test)', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        TestimonialsService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

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
    expect(component.enviado()).toBe(true);
  });

  it('escribirOtraOpinion should reset enviado', () => {
    component.enviado.set(true);
    component.escribirOtraOpinion();
    expect(component.enviado()).toBe(false);
  });
});
