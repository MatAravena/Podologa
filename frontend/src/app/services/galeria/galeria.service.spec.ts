import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { GaleriaService, GaleriaPost } from './galeria.service';
import { environment } from '../../../environments/environment';

const MOCK: GaleriaPost = {
  id: 1, titulo: 'Antes y después', descripcion: null,
  media_url: '/media/foto.jpg', media_type: 'image', published: false,
  created_at: '2026-01-01T10:00:00',
};

describe('GaleriaService', () => {
  let service: GaleriaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), GaleriaService],
    });
    service = TestBed.inject(GaleriaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar should GET /galeria', () => {
    let result: GaleriaPost[] | undefined;
    service.listar().subscribe(r => (result = r));
    const req = httpMock.expectOne(`${environment.apiUrl}/galeria`);
    expect(req.request.method).toBe('GET');
    req.flush([MOCK]);
    expect(result).toEqual([MOCK]);
  });

  it('subir should POST multipart to /galeria', () => {
    const fd = new FormData();
    fd.append('titulo', 'Test');
    service.subir(fd).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/galeria`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(MOCK);
  });

  it('generarCaption should POST /galeria/{id}/generar-caption', () => {
    const body = { tono: 'cálido', contexto_extra: null };
    service.generarCaption(1, body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/galeria/1/generar-caption`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ caption: 'texto', ai_generated: true });
  });

  it('publicar should POST /galeria/{id}/publicar', () => {
    service.publicar(1, { caption: 'hola' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/galeria/1/publicar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ caption: 'hola' });
    req.flush(MOCK);
  });

  it('eliminar should DELETE /galeria/{id}', () => {
    service.eliminar(1).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/galeria/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('mediaUrl should return absolute URLs unchanged', () => {
    expect(service.mediaUrl('https://cdn.test/x.jpg')).toBe('https://cdn.test/x.jpg');
  });

  it('mediaUrl should resolve relative paths against the API host', () => {
    expect(service.mediaUrl('/media/foto.jpg')).toBe(
      `${environment.apiUrl.replace('/api', '')}/media/foto.jpg`
    );
  });
});
