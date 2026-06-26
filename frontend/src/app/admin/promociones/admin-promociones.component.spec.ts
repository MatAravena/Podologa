import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AdminPromocionesComponent, PromocionApi, ServicioApi } from './admin-promociones.component';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { environment } from '../../../environments/environment';

const MOCK_SERVICIOS: ServicioApi[] = [
  { id: 1, nombre: 'Podología', descripcion: null, subtitulo: null, descripcion_larga: null,
    fotos_urls: null, icono: null, icono_color: null, duracion: 60, precio: 30000 },
  { id: 2, nombre: 'Reiki', descripcion: null, subtitulo: null, descripcion_larga: null,
    fotos_urls: null, icono: null, icono_color: null, duracion: 60, precio: 25000 },
];

const MOCK_PROMOCIONES: PromocionApi[] = [
  {
    id: 1, servicio_id: 1,
    porcentaje_descuento: 20,
    descripcion: 'Promo verano',
    fecha_inicio: '2020-01-01', fecha_fin: '2099-12-31',
    hora_inicio: null, hora_fin: null,
    activo: true, created_at: '2026-01-01',
    servicio: MOCK_SERVICIOS[0],
  },
  {
    id: 2, servicio_id: 2,
    porcentaje_descuento: 10,
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

  function fillValid(over: Partial<Record<string, string>> = {}) {
    component.form.setValue({
      servicio_id: '1', porcentaje_descuento: '15', descripcion: '',
      fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31', hora_inicio: '', hora_fin: '',
      ...over,
    });
  }

  it('onSubmit POSTs a new promo and prepends it', () => {
    fillValid();
    component.onSubmit();
    const req = httpMock.expectOne(`${environment.apiUrl}/promociones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.servicio_id).toBe(1);
    const created = { ...MOCK_PROMOCIONES[0], id: 99 };
    req.flush(created);
    expect(component.promociones()[0].id).toBe(99);
    expect(component.saving()).toBe(false);
  });

  it('onSubmit blocks when no service and global toggle off', () => {
    fillValid({ servicio_id: '' });
    component.globalToggle.set(false);
    component.onSubmit();
    httpMock.expectNone(`${environment.apiUrl}/promociones`);
  });

  it('previewServicios computes discounted prices from the entered percentage', () => {
    component.form.patchValue({ porcentaje_descuento: '50' });
    const preview = component.previewServicios();
    expect(preview.length).toBe(2);
    expect(preview[0].precioConDescuento).toBe(Math.round(Number(MOCK_SERVICIOS[0].precio) * 0.5));
  });

  it('toggleActivo PATCHes the promo', () => {
    component.toggleActivo(MOCK_PROMOCIONES[0]);
    const req = httpMock.expectOne(`${environment.apiUrl}/promociones/${MOCK_PROMOCIONES[0].id}`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...MOCK_PROMOCIONES[0], activo: false });
    expect(component.promociones().find(p => p.id === MOCK_PROMOCIONES[0].id)?.activo).toBe(false);
  });

  it('deletePromo removes the promo on success', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deletePromo(MOCK_PROMOCIONES[0]);
    httpMock.expectOne(`${environment.apiUrl}/promociones/${MOCK_PROMOCIONES[0].id}`).flush(null);
    expect(component.promociones().some(p => p.id === MOCK_PROMOCIONES[0].id)).toBe(false);
  });

  it('deletePromo keeps the promo when the request fails', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const before = component.promociones().length;
    component.deletePromo(MOCK_PROMOCIONES[0]);
    httpMock.expectOne(`${environment.apiUrl}/promociones/${MOCK_PROMOCIONES[0].id}`)
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    expect(component.promociones().length).toBe(before);
  });
});
