import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ReservasService, ServicioApi, HorarioDisponible, CitaPayload } from './reservas.service';
import { environment } from '../../../environments/environment';

describe('ReservasService', () => {
  let service: ReservasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReservasService,
      ],
    });

    service = TestBed.inject(ReservasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getServicios', () => {
    it('should GET /servicios and return array', () => {
      const mockServicios: ServicioApi[] = [
        { id: 1, nombre: 'Podología', descripcion: null, duracion: 60, precio: '30000' },
      ];

      let result: ServicioApi[] | undefined;
      service.getServicios().subscribe(s => (result = s));

      const req = httpMock.expectOne(`${environment.apiUrl}/servicios`);
      expect(req.request.method).toBe('GET');
      req.flush(mockServicios);

      expect(result).toEqual(mockServicios);
    });

    it('should call the correct URL', () => {
      service.getServicios().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/servicios`);
      req.flush([]);
    });
  });

  describe('getDisponibilidad', () => {
    it('should GET /disponibilidad with fecha param', () => {
      const mockSlots: HorarioDisponible[] = [
        { hora: '09:00', disponible: true },
        { hora: '10:00', disponible: false },
      ];

      let result: HorarioDisponible[] | undefined;
      service.getDisponibilidad('2026-05-01').subscribe(h => (result = h));

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/disponibilidad` && r.params.get('fecha') === '2026-05-01'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockSlots);

      expect(result).toEqual(mockSlots);
    });

    it('should include servicio_id param when provided', () => {
      service.getDisponibilidad('2026-05-01', 3).subscribe();

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/disponibilidad`
          && r.params.get('fecha') === '2026-05-01'
          && r.params.get('servicio_id') === '3'
      );
      req.flush([]);
    });

    it('should not include servicio_id param when not provided', () => {
      service.getDisponibilidad('2026-05-01').subscribe();

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/disponibilidad`
      );
      expect(req.request.params.has('servicio_id')).toBe(false);
      req.flush([]);
    });
  });

  describe('crearCita', () => {
    const payload: CitaPayload = {
      nombre: 'María',
      apellido: 'García',
      email: 'maria@test.cl',
      telefono: '+56912345678',
      servicio_id: 1,
      fecha: '2026-05-10',
      hora: '10:00',
    };

    it('should POST /citas with payload', () => {
      const mockResponse = { id: 1, fecha: '2026-05-10', hora: '10:00', estado: 'pendiente', servicio: {} as ServicioApi };

      let result: unknown;
      service.crearCita(payload).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/citas`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);

      expect(result).toEqual(mockResponse);
    });
  });
});
