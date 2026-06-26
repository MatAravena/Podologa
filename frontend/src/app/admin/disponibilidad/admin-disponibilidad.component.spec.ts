import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AdminDisponibilidadComponent, BloqueApi, BloqueoApi } from './admin-disponibilidad.component';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { environment } from '../../../environments/environment';

const MOCK_BLOQUES: BloqueApi[] = [
  { id: 1, dia_semana: 0,    fecha_especifica: null,         hora_inicio: '09:00:00', hora_fin: '18:00:00', activo: true,  created_at: '2026-01-01' },
  { id: 2, dia_semana: null, fecha_especifica: '2026-05-01', hora_inicio: '10:00:00', hora_fin: '14:00:00', activo: true,  created_at: '2026-01-01' },
  { id: 3, dia_semana: 1,    fecha_especifica: null,         hora_inicio: '09:00:00', hora_fin: '17:00:00', activo: false, created_at: '2026-01-01' },
];

const MOCK_BLOQUEOS: BloqueoApi[] = [
  { id: 1, fecha: '2026-06-01', motivo: 'Feriado', activo: true, created_at: '2026-01-01' },
];

describe('AdminDisponibilidadComponent', () => {
  let fixture: ComponentFixture<AdminDisponibilidadComponent>;
  let component: AdminDisponibilidadComponent;
  let httpMock: HttpTestingController;

  const authSpy = { logout: vi.fn(), isLoggedIn: () => true, token: () => 'mock-token' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDisponibilidadComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: authSpy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminDisponibilidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/admin/disponibilidad/bloques`).flush(MOCK_BLOQUES);
    httpMock.expectOne(`${environment.apiUrl}/admin/disponibilidad/bloqueos`).flush(MOCK_BLOQUEOS);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load bloques and bloqueos on init', () => {
    expect(component.bloques().length).toBe(3);
    expect(component.bloqueos().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('bloquesSemanal should include only active weekly bloques grouped by day', () => {
    const semanal = component.bloquesSemanal();
    // id=1 active+weekly, id=3 is inactive — only id=1 should appear
    expect(semanal.length).toBe(1);
    expect(semanal[0].dia).toBe(0);
    expect(semanal[0].nombre).toBe('Lunes');
    expect(semanal[0].bloques[0].id).toBe(1);
  });

  it('bloquesEspecificos should include only active specific-date bloques', () => {
    const especificos = component.bloquesEspecificos();
    expect(especificos.length).toBe(1);
    expect(especificos[0].fecha_especifica).toBe('2026-05-01');
  });

  it('formatHora should strip seconds from time string', () => {
    expect(component.formatHora('09:00:00')).toBe('09:00');
    expect(component.formatHora('14:30:45')).toBe('14:30');
  });

  it('diaNombre should return correct Spanish day name', () => {
    expect(component.diaNombre(0)).toBe('Lunes');
    expect(component.diaNombre(4)).toBe('Viernes');
    expect(component.diaNombre(6)).toBe('Domingo');
  });

  it('diaNombre should return fallback for unknown index', () => {
    expect(component.diaNombre(99)).toBe('Día 99');
  });

  it('bloqueForm should be valid with default values', () => {
    expect(component.bloqueForm.valid).toBe(true);
  });

  it('bloqueoForm should be invalid until fecha is provided', () => {
    expect(component.bloqueoForm.invalid).toBe(true);
    component.bloqueoForm.get('fecha')!.setValue('2026-07-01');
    expect(component.bloqueoForm.valid).toBe(true);
  });

  it('should expose 7 days in diaOpciones', () => {
    expect(component.diaOpciones.length).toBe(7);
    expect(component.diaOpciones[0]).toEqual({ value: 0, label: 'Lunes' });
  });

  const BLOQUES_URL  = `${environment.apiUrl}/admin/disponibilidad/bloques`;
  const BLOQUEOS_URL = `${environment.apiUrl}/admin/disponibilidad/bloqueos`;

  it('agregarBloque POSTs a weekly block', () => {
    component.bloqueForm.patchValue({ tipo: 'semanal', dia_semana: 2 });
    component.agregarBloque();
    const req = httpMock.expectOne(BLOQUES_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.dia_semana).toBe(2);
    const nuevo: BloqueApi = { id: 9, dia_semana: 2, fecha_especifica: null, hora_inicio: '09:00:00', hora_fin: '18:00:00', activo: true, created_at: 'x' };
    req.flush(nuevo);
    expect(component.bloques().some(b => b.id === 9)).toBe(true);
  });

  it('agregarBloque (specific) without a date shows an error and does not POST', () => {
    component.bloqueForm.patchValue({ tipo: 'fecha', fecha_especifica: '' });
    component.agregarBloque();
    httpMock.expectNone(BLOQUES_URL);
  });

  it('agregarBloque (specific) POSTs with fecha_especifica', () => {
    component.bloqueForm.patchValue({ tipo: 'fecha', fecha_especifica: '2026-08-01' });
    component.agregarBloque();
    const req = httpMock.expectOne(BLOQUES_URL);
    expect(req.request.body.fecha_especifica).toBe('2026-08-01');
    req.flush({ id: 10, dia_semana: null, fecha_especifica: '2026-08-01', hora_inicio: '09:00:00', hora_fin: '18:00:00', activo: true, created_at: 'x' });
    expect(component.bloques().some(b => b.id === 10)).toBe(true);
  });

  it('eliminarBloque DELETEs after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.eliminarBloque(1);
    const req = httpMock.expectOne(`${BLOQUES_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(component.bloques().some(b => b.id === 1)).toBe(false);
  });

  it('agregarBloqueo blocks a single date', () => {
    component.bloqueoForm.setValue({ fecha: '2026-09-10', fecha_hasta: '', motivo: 'Vacaciones' });
    component.agregarBloqueo();
    const req = httpMock.expectOne(BLOQUEOS_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.fecha).toBe('2026-09-10');
    req.flush({ id: 5, fecha: '2026-09-10', motivo: 'Vacaciones', activo: true, created_at: 'x' });
    expect(component.bloqueos().some(b => b.id === 5)).toBe(true);
  });

  it('agregarBloqueo blocks a date range (one POST per day)', () => {
    component.bloqueoForm.setValue({ fecha: '2026-09-10', fecha_hasta: '2026-09-12', motivo: '' });
    component.agregarBloqueo();
    const reqs = httpMock.match(BLOQUEOS_URL);
    expect(reqs.length).toBe(3); // 10, 11, 12
    reqs.forEach((r, i) => r.flush({ id: 100 + i, fecha: `2026-09-1${i}`, motivo: null, activo: true, created_at: 'x' }));
    expect(component.bloqueos().length).toBe(1 + 3);
  });

  it('rangoBloqueo computes the number of days inclusive', () => {
    component.bloqueoForm.patchValue({ fecha: '2026-09-10', fecha_hasta: '2026-09-12' });
    expect(component.rangoBloqueo()).toBe(3);
  });

  it('bloqueoForm is invalid when fecha_hasta is before fecha', () => {
    component.bloqueoForm.patchValue({ fecha: '2026-09-10', fecha_hasta: '2026-09-05' });
    expect(component.bloqueoForm.get('fecha_hasta')?.errors?.['fechaHastaInvalida']).toBe(true);
  });

  it('eliminarBloqueo DELETEs after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.eliminarBloqueo(1);
    const req = httpMock.expectOne(`${BLOQUEOS_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(component.bloqueos().some(b => b.id === 1)).toBe(false);
  });
});
