import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MiHistorialComponent } from './mi-historial.component';
import { environment } from '../../environments/environment';
import { Portal } from '../services/pacientes/pacientes.service';

const API = environment.apiUrl;

const PORTAL: Portal = {
  nombre: 'Ana Pérez',
  notas_clinicas: [
    { id: 1, contenido: 'Hidratar', tipo: 'sugerencia', visible_paciente: true, created_at: '2026-01-01' },
  ],
};

let tokenValue: string | null = 'tok123';
const routeStub = { snapshot: { paramMap: { get: () => tokenValue } } };

describe('MiHistorialComponent', () => {
  let fixture: ComponentFixture<MiHistorialComponent>;
  let component: MiHistorialComponent;
  let http: HttpTestingController;

  function setup(token: string | null = 'tok123') {
    tokenValue = token;
    TestBed.configureTestingModule({
      imports: [MiHistorialComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    });
    fixture = TestBed.createComponent(MiHistorialComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => http?.verify());

  it('loads the portal profile for a valid token', () => {
    setup('tok123');
    http.expectOne(`${API}/pacientes/tok123/perfil`).flush(PORTAL);
    expect(component.perfil()?.nombre).toBe('Ana Pérez');
    expect(component.loading()).toBe(false);
    expect(component.notFound()).toBe(false);
  });

  it('shows notFound when the token is missing', () => {
    setup(null);
    http.expectNone(`${API}/pacientes/null/perfil`);
    expect(component.notFound()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('shows notFound when the lookup fails (bad/expired token)', () => {
    setup('bad');
    http.expectOne(`${API}/pacientes/bad/perfil`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(component.notFound()).toBe(true);
  });

  it('tipoLabel maps known types and falls back to "Nota"', () => {
    setup('tok123');
    http.expectOne(`${API}/pacientes/tok123/perfil`).flush(PORTAL);
    expect(component.tipoLabel('sugerencia')).toBe('Sugerencia de tratamiento');
    expect(component.tipoLabel('xyz')).toBe('Nota');
  });
});
