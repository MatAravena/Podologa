import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ServiciosService, Servicio } from './servicios.service';
import { environment } from '../../../environments/environment';

const MOCK: Servicio = {
  id: 1, nombre: 'Podología', descripcion: null, subtitulo: null, descripcion_larga: null,
  fotos_urls: null, icono: 'podologia', icono_color: 'rosa_empolvado', duracion: 45, precio: 25000,
};

describe('ServiciosService', () => {
  let service: ServiciosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ServiciosService],
    });
    service = TestBed.inject(ServiciosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar should GET /servicios', () => {
    let result: Servicio[] | undefined;
    service.listar().subscribe(r => (result = r));
    const req = httpMock.expectOne(`${environment.apiUrl}/servicios`);
    expect(req.request.method).toBe('GET');
    req.flush([MOCK]);
    expect(result).toEqual([MOCK]);
  });

  it('obtener should GET /servicios/{id}', () => {
    service.obtener(3).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/servicios/3`);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK);
  });

  it('crear should POST /servicios', () => {
    const payload = { nombre: 'Reiki', duracion: 60, precio: 20000 };
    service.crear(payload).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/servicios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(MOCK);
  });

  it('actualizar should PATCH /servicios/{id}', () => {
    service.actualizar(1, { precio: 26000 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/servicios/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ precio: 26000 });
    req.flush(MOCK);
  });

  it('eliminar should DELETE /servicios/{id}', () => {
    service.eliminar(1).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/servicios/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('subirFoto should POST multipart to /servicios/{id}/fotos', () => {
    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    service.subirFoto(1, file).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/servicios/1/fotos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(MOCK);
  });

  it('eliminarFoto should DELETE /servicios/{id}/fotos/{index}', () => {
    service.eliminarFoto(1, 2).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/servicios/1/fotos/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(MOCK);
  });
});
