import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ContactoService, Contacto } from './contacto.service';
import { environment } from '../../../environments/environment';

const MOCK: Contacto = {
  phone: '+56 9 1234 5678', email: 'contacto@libelula.cl', address: 'Santiago, Chile',
  instagram: '@libelula.podologia', facebook: 'libelulapodologia',
  business_hours: {
    monday_friday: { open: '09:00', close: '19:00' },
    saturday:      { open: '09:00', close: '13:00' },
    sunday:        null,
  },
};

describe('ContactoService', () => {
  let service: ContactoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ContactoService],
    });
    service = TestBed.inject(ContactoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('load should GET /config/contacto and store the result', () => {
    service.load();
    const req = httpMock.expectOne(`${environment.apiUrl}/config/contacto`);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK);
    expect(service.contacto()).toEqual(MOCK);
  });

  it('load should be idempotent (only one request even if called twice)', () => {
    service.load();
    service.load();
    httpMock.expectOne(`${environment.apiUrl}/config/contacto`).flush(MOCK);
    // verify() in afterEach asserts no further outstanding requests
  });

  it('whatsappUrl should derive a digits-only wa.me link from the phone', () => {
    service.load();
    httpMock.expectOne(`${environment.apiUrl}/config/contacto`).flush(MOCK);
    expect(service.whatsappUrl()).toBe('https://wa.me/56912345678');
  });

  it('whatsappUrl should fall back to wa.me/ when phone is missing', () => {
    expect(service.whatsappUrl()).toBe('https://wa.me/');
  });

  it('contacto should stay null when the request fails', () => {
    service.load();
    httpMock.expectOne(`${environment.apiUrl}/config/contacto`).error(new ProgressEvent('error'));
    expect(service.contacto()).toBeNull();
  });

  it('instagramUrl/facebookUrl should build profile links from the handles', () => {
    service.load();
    httpMock.expectOne(`${environment.apiUrl}/config/contacto`).flush(MOCK);
    expect(service.instagramHandle()).toBe('libelula.podologia');
    expect(service.instagramUrl()).toBe('https://instagram.com/libelula.podologia');
    expect(service.facebookUrl()).toBe('https://facebook.com/libelulapodologia');
  });

  it('social URLs should fall back to the network home when no handle is set', () => {
    expect(service.instagramUrl()).toBe('https://instagram.com/');
    expect(service.facebookUrl()).toBe('https://facebook.com/');
  });

  it('horarios should format business_hours, skipping closed days', () => {
    service.load();
    httpMock.expectOne(`${environment.apiUrl}/config/contacto`).flush(MOCK);
    expect(service.horarios()).toEqual([
      { dias: 'Lunes a Viernes', horario: '09:00 – 19:00' },
      { dias: 'Sábados', horario: '09:00 – 13:00' },
    ]);
  });

  it('horarios should be empty when business_hours is missing', () => {
    expect(service.horarios()).toEqual([]);
  });
});
