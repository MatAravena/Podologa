import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import {
  PacientesService, Paciente, PacienteDetalle, Nota, Portal, NotificarResponse,
} from './pacientes.service';
import { environment } from '../../../environments/environment';

const PACIENTE: Paciente = {
  id: 1, nombre: 'Ana Soto', email: 'ana@test.cl', telefono: null,
  notas: null, access_token: null, created_at: '2026-01-01T10:00:00',
};

const NOTA: Nota = {
  id: 9, paciente_id: 1, cita_id: null, contenido: 'Seguimiento',
  tipo: 'seguimiento', visible_paciente: false,
  created_at: '2026-01-01T10:00:00', updated_at: '2026-01-01T10:00:00',
};

describe('PacientesService', () => {
  let service: PacientesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PacientesService],
    });
    service = TestBed.inject(PacientesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar should GET /admin/pacientes', () => {
    let result: Paciente[] | undefined;
    service.listar().subscribe(r => (result = r));
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/pacientes`);
    expect(req.request.method).toBe('GET');
    req.flush([PACIENTE]);
    expect(result).toEqual([PACIENTE]);
  });

  it('obtener should GET /admin/pacientes/{id}', () => {
    const detalle: PacienteDetalle = { ...PACIENTE, notas_clinicas: [NOTA] };
    service.obtener(1).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/pacientes/1`);
    expect(req.request.method).toBe('GET');
    req.flush(detalle);
  });

  it('crearNota should POST /admin/pacientes/{id}/notas', () => {
    const body = { contenido: 'x', tipo: 'seguimiento', visible_paciente: true };
    service.crearNota(1, body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/pacientes/1/notas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(NOTA);
  });

  it('actualizarNota should PATCH /admin/pacientes/{id}/notas/{notaId}', () => {
    const body = { contenido: 'y', tipo: 'otro', visible_paciente: false };
    service.actualizarNota(1, 9, body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/pacientes/1/notas/9`);
    expect(req.request.method).toBe('PATCH');
    req.flush(NOTA);
  });

  it('eliminarNota should DELETE /admin/pacientes/{id}/notas/{notaId}', () => {
    service.eliminarNota(1, 9).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/pacientes/1/notas/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('generarToken should POST /admin/pacientes/{id}/generar-token', () => {
    service.generarToken(1).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/pacientes/1/generar-token`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...PACIENTE, access_token: 'tok123' });
  });

  it('perfilPublico should GET /pacientes/{token}/perfil', () => {
    const portal: Portal = { nombre: 'Ana', notas_clinicas: [] };
    service.perfilPublico('tok123').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pacientes/tok123/perfil`);
    expect(req.request.method).toBe('GET');
    req.flush(portal);
  });

  it('notificar should POST /admin/pacientes/{id}/notificar with channels and body', () => {
    const body = { canales: ['email', 'whatsapp'] as const, incluir_notas: true, proxima_cita: '2026-07-01' };
    const resp: NotificarResponse = {
      resultados: [
        { canal: 'email', enviado: true, detalle: 'Email enviado a ana@test.cl.' },
        { canal: 'whatsapp', enviado: false, detalle: 'Número de WhatsApp inválido o no registrado.' },
      ],
    };
    let result: NotificarResponse | undefined;
    service.notificar(1, { ...body, canales: [...body.canales] }).subscribe(r => (result = r));
    const req = httpMock.expectOne(`${environment.apiUrl}/admin/pacientes/1/notificar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ...body, canales: [...body.canales] });
    req.flush(resp);
    expect(result).toEqual(resp);
  });
});
