import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OpinionesService, Opinion } from './opiniones.service';
import { environment } from '../../../environments/environment';

const MOCK: Opinion = {
  id: 1, nombre: 'María', apellido: 'García', email: null, telefono: null,
  foto_url: null, texto: 'Excelente', puntuacion: 5, servicios_ids: null,
  created_at: '2026-01-01T10:00:00', updated_at: '2026-01-01T10:00:00',
};

describe('OpinionesService', () => {
  let service: OpinionesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), OpinionesService],
    });
    service = TestBed.inject(OpinionesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar should GET /opiniones', () => {
    let result: Opinion[] | undefined;
    service.listar().subscribe(r => (result = r));
    const req = httpMock.expectOne(`${environment.apiUrl}/opiniones`);
    expect(req.request.method).toBe('GET');
    req.flush([MOCK]);
    expect(result).toEqual([MOCK]);
  });

  it('crear should POST /opiniones with payload', () => {
    const payload = { nombre: 'Ana', apellido: 'Soto', texto: 'Genial', puntuacion: 4, servicios_ids: [1, 2] };
    service.crear(payload).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/opiniones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(MOCK);
  });

  it('actualizar should PATCH /opiniones/{id}', () => {
    service.actualizar(7, { texto: 'Editado' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/opiniones/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ texto: 'Editado' });
    req.flush(MOCK);
  });

  it('eliminar should DELETE /opiniones/{id}', () => {
    service.eliminar(7).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/opiniones/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
