import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PromocionesService, Promocion } from './promociones.service';
import { environment } from '../../../environments/environment';

const MOCK: Promocion = {
  id: 1, servicio_id: null, porcentaje_descuento: '20', descripcion: null,
  fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31', hora_inicio: null, hora_fin: null,
  activo: true, created_at: '2026-01-01', servicio: null,
};

describe('PromocionesService', () => {
  let service: PromocionesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PromocionesService],
    });
    service = TestBed.inject(PromocionesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar should GET /promociones', () => {
    let result: Promocion[] | undefined;
    service.listar().subscribe(r => (result = r));
    const req = httpMock.expectOne(`${environment.apiUrl}/promociones`);
    expect(req.request.method).toBe('GET');
    req.flush([MOCK]);
    expect(result).toEqual([MOCK]);
  });

  it('vigentes should GET /promociones/vigentes with servicio_id param', () => {
    service.vigentes(5).subscribe();
    const req = httpMock.expectOne(
      r => r.url === `${environment.apiUrl}/promociones/vigentes` && r.params.get('servicio_id') === '5'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('vigentes should omit servicio_id param when not provided', () => {
    service.vigentes().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/promociones/vigentes`);
    expect(req.request.params.has('servicio_id')).toBe(false);
    req.flush([]);
  });

  it('crear should POST /promociones', () => {
    const payload = { servicio_id: null, porcentaje_descuento: '15', fecha_inicio: '2026-01-01', fecha_fin: '2026-02-01' };
    service.crear(payload).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/promociones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(MOCK);
  });

  it('actualizar should PATCH /promociones/{id}', () => {
    service.actualizar(1, { activo: false }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/promociones/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
    req.flush(MOCK);
  });

  it('eliminar should DELETE /promociones/{id}', () => {
    service.eliminar(1).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/promociones/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
