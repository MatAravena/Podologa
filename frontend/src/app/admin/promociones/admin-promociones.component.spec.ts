import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AdminPromocionesComponent, PromocionApi, ServicioApi } from './admin-promociones.component';
import { AdminAuthService } from '../../shared/admin/admin-auth.service';
import { environment } from '../../../environments/environment';

const MOCK_SERVICIOS: ServicioApi[] = [
  { id: 1, nombre: 'Podología', duracion: 60, precio: '30000' },
  { id: 2, nombre: 'Reiki',     duracion: 60, precio: '25000' },
];

const MOCK_PROMOCIONES: PromocionApi[] = [
  {
    id: 1, servicio_id: 1,
    porcentaje_descuento: '20',
    descripcion: 'Promo verano',
    fecha_inicio: '2020-01-01', fecha_fin: '2099-12-31',
    hora_inicio: null, hora_fin: null,
    activo: true, created_at: '2026-01-01',
    servicio: MOCK_SERVICIOS[0],
  },
  {
    id: 2, servicio_id: 2,
    porcentaje_descuento: '10',
    descripcion: null,
    fecha_inicio: '2020-01-01', fecha_fin: '2020-12-31', // expired
    hora_inicio: null, hora_fin: null,
    activo: true, created_at: '2026-01-01',
    servicio: MOCK_SERVICIOS[1],
  },
];

describe('AdminPromocionesComponent', () => {
  let fixture: ComponentFixture<AdminPromocionesComponent>;
  let component: AdminPromocionesComponent;
  let httpMock: HttpTestingController;

  const authSpy = { logout: vi.fn(), isLoggedIn: () => true, token: () => 'mock-token' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPromocionesComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: authSpy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminPromocionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/servicios`).flush(MOCK_SERVICIOS);
    httpMock.expectOne(`${environment.apiUrl}/promociones`).flush(MOCK_PROMOCIONES);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load servicios and promociones on init', () => {
    expect(component.servicios().length).toBe(2);
    expect(component.promociones().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('isVigente should return true for active promotion within date range', () => {
    expect(component.isVigente(MOCK_PROMOCIONES[0])).toBe(true);
  });

  it('isVigente should return false for expired promotion', () => {
    expect(component.isVigente(MOCK_PROMOCIONES[1])).toBe(false);
  });

  it('isVigente should return false for inactive promotion regardless of dates', () => {
    const inactive = { ...MOCK_PROMOCIONES[0], activo: false };
    expect(component.isVigente(inactive)).toBe(false);
  });

  it('form should start invalid (required fields empty)', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('onSubmit should mark all controls as touched when form is invalid', () => {
    component.onSubmit();
    expect(component.form.get('servicio_id')?.touched).toBe(true);
    expect(component.form.get('porcentaje_descuento')?.touched).toBe(true);
  });

  it('form should become valid when all required fields are filled', () => {
    component.form.setValue({
      servicio_id: '1',
      porcentaje_descuento: '15',
      descripcion: '',
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-12-31',
      hora_inicio: '',
      hora_fin: '',
    });
    expect(component.form.valid).toBe(true);
  });
});
