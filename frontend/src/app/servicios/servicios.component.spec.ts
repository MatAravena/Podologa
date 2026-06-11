import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';

import { ServiciosComponent, ServicioApi } from './servicios.component';

const MOCK: ServicioApi = {
  id: 1,
  nombre: 'Podología',
  descripcion: 'Cuidado del pie.',
  subtitulo: 'Para el bienestar de tus pies',
  descripcion_larga: 'Descripción larga de prueba.',
  fotos_urls: '["https://example.com/a.jpg","https://example.com/b.jpg"]',
  icono: 'podologia',
  icono_color: 'rosa_empolvado',
  duracion: 45,
  precio: 25000,
};

describe('ServiciosComponent', () => {
  let fixture: ComponentFixture<ServiciosComponent>;
  let component: ServiciosComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiciosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiciosComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    fixture.detectChanges();
    http.expectOne(r => r.url.includes('/servicios/1')).flush(MOCK);
    expect(component).toBeTruthy();
  });

  it('should show service name after load', () => {
    fixture.detectChanges();
    http.expectOne(r => r.url.includes('/servicios/1')).flush(MOCK);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Podología');
  });

  it('should parse fotos_urls into fotos signal', () => {
    fixture.detectChanges();
    http.expectOne(r => r.url.includes('/servicios/1')).flush(MOCK);
    expect(component.fotos().length).toBe(2);
  });

  it('should show not-found state on error', () => {
    fixture.detectChanges();
    http.expectOne(r => r.url.includes('/servicios/1')).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(component.notFound()).toBe(true);
  });

  it('should open and close lightbox', () => {
    component.openLightbox('https://example.com/a.jpg');
    expect(component.lightbox()).toBe('https://example.com/a.jpg');
    component.closeLightbox();
    expect(component.lightbox()).toBeNull();
  });
});
