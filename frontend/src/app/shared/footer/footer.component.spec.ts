import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { FooterComponent } from './footer.component';

const SERVICIOS = ['Podología', 'Reiki', 'Reflexología', 'Esencias Florales', 'Auriculoterapia', 'Masajes Linfáticos', 'Tuina'];

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let component: FooterComponent;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    // The footer loads service names + contact config on construction.
    http.match(r => r.url.includes('/servicios')).forEach(r =>
      r.flush(SERVICIOS.map((nombre, i) => ({
        id: i + 1, nombre, descripcion: null, subtitulo: null, descripcion_larga: null,
        fotos_urls: null, icono: null, icono_color: null, duracion: 60, precio: 20000,
      }))),
    );
    http.match(r => r.url.includes('/config/contacto')).forEach(r => r.flush(null));
    http.match(r => r.url.includes('/disponibilidad/semana')).forEach(r => r.flush([]));
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the current year', () => {
    expect(el.textContent).toContain(String(new Date().getFullYear()));
  });

  it('should expose the services loaded from the backend', () => {
    expect(component.servicios().length).toBe(7);
  });

  it('should expose 6 navigation links', () => {
    expect(component.links.length).toBe(6);
  });

  it('should list all 7 service names', () => {
    const text = el.textContent ?? '';
    const expected = ['Podología', 'Reiki', 'Reflexología', 'Esencias Florales', 'Auriculoterapia', 'Masajes Linfáticos', 'Tuina'];
    for (const name of expected) {
      expect(text).toContain(name);
    }
  });

  it('should include a link to /reservas', () => {
    const links = Array.from(el.querySelectorAll('a')) as HTMLElement[];
    const reservasLinks = links.filter(l =>
      l.getAttribute('href') === '/reservas' ||
      l.getAttribute('ng-reflect-router-link') === '/reservas' ||
      l.getAttribute('routerLink') === '/reservas'
    );
    expect(reservasLinks.length).toBeGreaterThan(0);
  });

  it('should render the brand name Libélula', () => {
    expect(el.textContent).toContain('Libélula');
  });
});
