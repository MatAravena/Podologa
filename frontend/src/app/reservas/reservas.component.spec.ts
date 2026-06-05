import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ReservasComponent } from './reservas.component';
import { ReservasService, ServicioApi, HorarioDisponible } from '../services/reservas/reservas.service';

const MOCK_SERVICIOS: ServicioApi[] = [
  { id: 1, nombre: 'Podología', descripcion: null, duracion: 60, precio: '30000' },
  { id: 2, nombre: 'Reiki', descripcion: null, duracion: 60, precio: '25000' },
];

const MOCK_HORARIOS: HorarioDisponible[] = [
  { hora: '09:00', disponible: true },
  { hora: '10:00', disponible: false },
  { hora: '11:00', disponible: true },
];

describe('ReservasComponent', () => {
  let fixture: ComponentFixture<ReservasComponent>;
  let component: ReservasComponent;
  let serviceSpy: {
    getServicios: ReturnType<typeof vi.fn>;
    getDisponibilidad: ReturnType<typeof vi.fn>;
    crearCita: ReturnType<typeof vi.fn>;
    getPromocionesVigentes: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    serviceSpy = {
      getServicios: vi.fn().mockReturnValue(of(MOCK_SERVICIOS)),
      getDisponibilidad: vi.fn().mockReturnValue(of(MOCK_HORARIOS)),
      crearCita: vi.fn(),
      getPromocionesVigentes: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ReservasComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ReservasService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load servicios from API on init', () => {
    expect(serviceSpy.getServicios).toHaveBeenCalled();
    expect(component.serviciosApi().length).toBe(2);
    expect(component.apiOnline()).toBe(true);
  });

  it('should expose only available slots via horariosDisponibles', () => {
    component.horariosApi.set(MOCK_HORARIOS);
    fixture.detectChanges();
    const disponibles = component.horariosDisponibles();
    expect(disponibles.length).toBe(2);
    expect(disponibles.every(h => h.disponible)).toBe(true);
  });

  it('should use fallback servicios when API fails', async () => {
    serviceSpy.getServicios.mockReturnValue(throwError(() => new Error('Network error')));

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ReservasComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ReservasService, useValue: serviceSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReservasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    // With API failing, serviciosApi is empty so computed falls back to static list
    expect(component.serviciosApi().length).toBe(0);
    expect(component.apiOnline()).toBe(false);
    const servicios = component.servicios();
    expect(servicios.length).toBeGreaterThan(0);
  });

  describe('form validation', () => {
    it('should start invalid', () => {
      expect(component.form.valid).toBe(false);
    });

    it('nombre should be required and min 2 chars', () => {
      const ctrl = component.form.get('nombre')!;
      ctrl.setValue('A');
      ctrl.markAsTouched();
      expect(ctrl.invalid).toBe(true);

      ctrl.setValue('María');
      expect(ctrl.valid).toBe(true);
    });

    it('email should reject invalid format', () => {
      const ctrl = component.form.get('email')!;
      ctrl.setValue('not-an-email');
      ctrl.markAsTouched();
      expect(ctrl.invalid).toBe(true);

      ctrl.setValue('valid@test.cl');
      expect(ctrl.valid).toBe(true);
    });

    it('telefono should match phone pattern', () => {
      const ctrl = component.form.get('telefono')!;
      ctrl.setValue('abc');
      ctrl.markAsTouched();
      expect(ctrl.invalid).toBe(true);

      ctrl.setValue('+56912345678');
      expect(ctrl.valid).toBe(true);
    });

    it('should not submit when form is invalid', () => {
      component.onSubmit();
      expect(component.enviando()).toBe(false);
      expect(component.enviado()).toBe(false);
    });
  });

  describe('form submission', () => {
    const fillForm = (comp: ReservasComponent) => {
      comp.form.setValue({
        nombre: 'María García',
        email: 'maria@test.cl',
        telefono: '+56912345678',
        servicio_id: '1',
        fecha: '2026-06-15',
        hora: '10:00',
        notas: '',
      });
    };

    it('should call crearCita with correct payload', async () => {
      serviceSpy.crearCita.mockReturnValue(of({
        id: 1, fecha: '2026-06-15', hora: '10:00', estado: 'pendiente', servicio: MOCK_SERVICIOS[0],
      }));
      fillForm(component);
      component.onSubmit();
      await fixture.whenStable();

      expect(serviceSpy.crearCita).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'María García',
        email: 'maria@test.cl',
        servicio_id: 1,
        fecha: '2026-06-15',
        hora: '10:00',
      }));
      expect(component.enviado()).toBe(true);
    });
  });

  describe('resetForm', () => {
    it('should reset enviado and form', () => {
      component.enviado.set(true);
      component.resetForm();
      expect(component.enviado()).toBe(false);
      expect(component.form.pristine).toBe(true);
    });
  });
});
