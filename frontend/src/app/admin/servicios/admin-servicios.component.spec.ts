import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AdminServiciosComponent, ServicioAdminApi } from './admin-servicios.component';
import { AdminAuthService } from '../../shared/admin/admin-auth.service';
import { environment } from '../../../environments/environment';

const MOCK_SERVICIOS: ServicioAdminApi[] = [
  {
    id: 1,
    nombre: 'Podología',
    descripcion: 'Cuidado del pie.',
    subtitulo: 'Para el bienestar de tus pies',
    descripcion_larga: 'Descripción larga de prueba.',
    fotos_urls: '["https://example.com/a.jpg"]',
    duracion: 45,
    precio: '25000.00',
  },
  {
    id: 2,
    nombre: 'Reiki',
    descripcion: null,
    subtitulo: null,
    descripcion_larga: null,
    fotos_urls: null,
    duracion: 60,
    precio: '30000.00',
  },
];

describe('AdminServiciosComponent', () => {
  let fixture: ComponentFixture<AdminServiciosComponent>;
  let component: AdminServiciosComponent;
  let httpMock: HttpTestingController;

  const authSpy = { logout: vi.fn(), isLoggedIn: () => true, token: () => 'mock-token' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminServiciosComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: authSpy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminServiciosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/servicios`).flush(MOCK_SERVICIOS);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load servicios on init', () => {
    expect(component.servicios().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('select() should set selected and patch form', () => {
    component.select(MOCK_SERVICIOS[0]);
    expect(component.selected()?.id).toBe(1);
    expect(component.form.value.nombre).toBe('Podología');
    expect(component.form.value.subtitulo).toBe('Para el bienestar de tus pies');
    expect(component.form.value.duracion).toBe(45);
  });

  it('deselect() should clear selected and reset form', () => {
    component.select(MOCK_SERVICIOS[0]);
    component.deselect();
    expect(component.selected()).toBeNull();
    expect(component.form.value.nombre).toBeNull();
  });

  it('fotos computed should parse fotos_urls JSON', () => {
    component.select(MOCK_SERVICIOS[0]);
    expect(component.fotos().length).toBe(1);
    expect(component.fotos()[0]).toBe('https://example.com/a.jpg');
  });

  it('fotos computed should return empty array when fotos_urls is null', () => {
    component.select(MOCK_SERVICIOS[1]);
    expect(component.fotos().length).toBe(0);
  });

  it('form should start invalid before selection', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('form should be valid after selecting a complete service', () => {
    component.select(MOCK_SERVICIOS[0]);
    expect(component.form.valid).toBe(true);
  });

  it('save() should do nothing when form is invalid', () => {
    component.save();
    httpMock.expectNone(`${environment.apiUrl}/servicios/1`);
  });

  it('save() should PATCH and update service in list', () => {
    component.select(MOCK_SERVICIOS[0]);
    const updated = { ...MOCK_SERVICIOS[0], nombre: 'Podología General' };
    component.save();
    const req = httpMock.expectOne(`${environment.apiUrl}/servicios/1`);
    expect(req.request.method).toBe('PATCH');
    req.flush(updated);
    expect(component.servicios()[0].nombre).toBe('Podología General');
    expect(component.selected()?.nombre).toBe('Podología General');
  });
});
