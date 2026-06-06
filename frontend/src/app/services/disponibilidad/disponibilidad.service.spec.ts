import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { DisponibilidadService, Bloque, Bloqueo } from './disponibilidad.service';
import { environment } from '../../../environments/environment';

const BLOQUE: Bloque = {
  id: 1, dia_semana: 0, fecha_especifica: null,
  hora_inicio: '09:00', hora_fin: '18:00', activo: true, created_at: '2026-01-01',
};

const BLOQUEO: Bloqueo = {
  id: 1, fecha: '2026-09-18', motivo: 'Feriado', activo: true, created_at: '2026-01-01',
};

describe('DisponibilidadService', () => {
  let service: DisponibilidadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DisponibilidadService],
    });
    service = TestBed.inject(DisponibilidadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadHorarioSemana should GET /disponibilidad/semana once and store the result', () => {
    const horario = [{ dias: 'Lunes a Viernes', horario: '09:00 – 19:00' }];
    service.loadHorarioSemana();
    service.loadHorarioSemana(); // idempotent — only one request
    const req = httpMock.expectOne(`${environment.apiUrl}/disponibilidad/semana`);
    expect(req.request.method).toBe('GET');
    req.flush(horario);
    expect(service.horarioSemana()).toEqual(horario);
  });

  it('horarioSemana should stay empty when the request fails', () => {
    service.loadHorarioSemana();
    httpMock.expectOne(`${environment.apiUrl}/disponibilidad/semana`)
      .error(new ProgressEvent('error'));
    expect(service.horarioSemana()).toEqual([]);
  });

  it('listarBloques should GET /admin/disponibilidad/bloques', () => {
    let result: Bloque[] | undefined;
    service.listarBloques().subscribe(r => (result = r));
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/disponibilidad/bloques`);
    expect(req.request.method).toBe('GET');
    req.flush([BLOQUE]);
    expect(result).toEqual([BLOQUE]);
  });

  it('listarBloqueos should GET /admin/disponibilidad/bloqueos', () => {
    service.listarBloqueos().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/disponibilidad/bloqueos`);
    expect(req.request.method).toBe('GET');
    req.flush([BLOQUEO]);
  });

  it('crearBloque should POST /admin/disponibilidad/bloques', () => {
    const payload = { hora_inicio: '09:00', hora_fin: '13:00', activo: true, dia_semana: 2 };
    service.crearBloque(payload).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/disponibilidad/bloques`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(BLOQUE);
  });

  it('eliminarBloque should DELETE /admin/disponibilidad/bloques/{id}', () => {
    service.eliminarBloque(5).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/disponibilidad/bloques/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('crearBloqueo should POST /admin/disponibilidad/bloqueos', () => {
    const payload = { fecha: '2026-09-18', motivo: 'Feriado', activo: true };
    service.crearBloqueo(payload).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/disponibilidad/bloqueos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(BLOQUEO);
  });

  it('eliminarBloqueo should DELETE /admin/disponibilidad/bloqueos/{id}', () => {
    service.eliminarBloqueo(5).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/disponibilidad/bloqueos/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
