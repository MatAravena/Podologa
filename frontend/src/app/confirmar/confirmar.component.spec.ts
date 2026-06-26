import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ConfirmarComponent } from './confirmar.component';
import { environment } from '../../environments/environment';
import { ConfirmacionApi } from '../services/reservas/reservas.service';

const API = environment.apiUrl;

const CITA: ConfirmacionApi = {
  servicio: 'Podología',
  fecha: '2026-07-01',
  hora: '10:00',
  estado: 'pendiente',
  paciente_confirmo: null,
  paciente_nombre: 'Ana',
};

let tokenValue: string | null = 'tok123';
const routeStub = { snapshot: { paramMap: { get: () => tokenValue } } };

describe('ConfirmarComponent', () => {
  let fixture: ComponentFixture<ConfirmarComponent>;
  let component: ConfirmarComponent;
  let http: HttpTestingController;

  function setup(token: string | null = 'tok123') {
    tokenValue = token;
    TestBed.configureTestingModule({
      imports: [ConfirmarComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    });
    fixture = TestBed.createComponent(ConfirmarComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => http?.verify());

  it('loads the cita for a valid token', () => {
    setup('tok123');
    http.expectOne(`${API}/citas/confirmar/tok123`).flush(CITA);
    expect(component.cita()?.servicio).toBe('Podología');
    expect(component.loading()).toBe(false);
    expect(component.notFound()).toBe(false);
  });

  it('shows notFound when the token is missing', () => {
    setup(null);
    http.expectNone(`${API}/citas/confirmar/`);
    expect(component.notFound()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('shows notFound when the lookup fails', () => {
    setup('bad');
    http.expectOne(`${API}/citas/confirmar/bad`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(component.notFound()).toBe(true);
  });

  it('responder(true) posts the confirmation and records the result', () => {
    setup('tok123');
    http.expectOne(`${API}/citas/confirmar/tok123`).flush(CITA);

    component.responder(true);
    const req = http.expectOne(`${API}/citas/confirmar/tok123`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ asistira: true });
    req.flush({ ...CITA, paciente_confirmo: true });

    expect(component.resultado()).toBe(true);
    expect(component.yaRespondida).toBe(true);
    expect(component.saving()).toBe(false);
  });

  it('yaRespondida reflects a previously answered cita', () => {
    setup('tok123');
    http.expectOne(`${API}/citas/confirmar/tok123`).flush({ ...CITA, paciente_confirmo: false });
    expect(component.yaRespondida).toBe(true);
  });
});
