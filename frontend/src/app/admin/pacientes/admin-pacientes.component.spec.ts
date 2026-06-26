import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AdminPacientesComponent } from './admin-pacientes.component';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { environment } from '../../../environments/environment';
import { Paciente, PacienteDetalle } from '../../services/pacientes/pacientes.service';

const API = environment.apiUrl;

const PACIENTES: Paciente[] = [
  { id: 1, nombre: 'Ana Pérez', email: 'ana@test.cl', telefono: '+56912345678', notas: null, access_token: null, created_at: '2026-01-01' },
  { id: 2, nombre: 'Beto Soto', email: null, telefono: '123', notas: null, access_token: null, created_at: '2026-01-01' },
];

const DETALLE: PacienteDetalle = {
  ...PACIENTES[0],
  notas_clinicas: [
    { id: 10, paciente_id: 1, cita_id: null, contenido: 'Hidratar', tipo: 'sugerencia', visible_paciente: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  ],
};

describe('AdminPacientesComponent', () => {
  let fixture: ComponentFixture<AdminPacientesComponent>;
  let component: AdminPacientesComponent;
  let http: HttpTestingController;

  const authSpy = { logout: vi.fn(), isLoggedIn: () => true, token: () => 'tok' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminPacientesComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: authSpy },
      ],
    });
    fixture = TestBed.createComponent(AdminPacientesComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Trigger ngOnInit and answer the initial list request. */
  function init(list: Paciente[] = PACIENTES): void {
    fixture.detectChanges();
    http.expectOne(`${API}/admin/pacientes`).flush(list);
  }

  /** Select patient 1 and answer the detail request. */
  function selectFirst(detalle: PacienteDetalle = DETALLE): void {
    component.selectPaciente(PACIENTES[0]);
    http.expectOne(`${API}/admin/pacientes/1`).flush(detalle);
  }

  it('loads patients on init', () => {
    init();
    expect(component.pacientes().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('filters patients by search term', () => {
    init();
    component.busqueda.set('beto');
    expect(component.pacientesFiltrados().map(p => p.id)).toEqual([2]);
  });

  it('selectPaciente loads detail and pre-checks channels', () => {
    init();
    selectFirst();
    expect(component.selected()?.id).toBe(1);
    // Ana has email + valid mobile → both channels available
    expect(component.emailDisponible()).toBe(true);
    expect(component.whatsappDisponible()).toBe(true);
  });

  it('whatsappDisponible is false for an invalid Chilean mobile', () => {
    init();
    component.selectPaciente(PACIENTES[1]);
    http.expectOne(`${API}/admin/pacientes/2`).flush({ ...PACIENTES[1], notas_clinicas: [] });
    expect(component.whatsappDisponible()).toBe(false);
  });

  it('creates a patient (POST) and selects it', () => {
    init();
    component.startCreatePaciente();
    component.pacienteForm.setValue({ nombre: 'Nueva', email: '', telefono: '', notas: '' });
    component.submitPaciente();

    const req = http.expectOne(`${API}/admin/pacientes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.nombre).toBe('Nueva');
    const creado = { id: 3, nombre: 'Nueva', email: null, telefono: null, notas: null, access_token: null, created_at: '2026-01-01' };
    req.flush(creado);
    // selectPaciente fires a detail GET
    http.expectOne(`${API}/admin/pacientes/3`).flush({ ...creado, notas_clinicas: [] });

    expect(component.pacientes().some(p => p.id === 3)).toBe(true);
    expect(component.formMode()).toBeNull();
  });

  it('surfaces 409 on duplicate email create', () => {
    init();
    component.startCreatePaciente();
    component.pacienteForm.setValue({ nombre: 'Dup', email: 'ana@test.cl', telefono: '', notas: '' });
    component.submitPaciente();
    http.expectOne(`${API}/admin/pacientes`).flush({ detail: 'dup' }, { status: 409, statusText: 'Conflict' });
    expect(component.savingPaciente()).toBe(false);
    expect(component.pacientes().length).toBe(2); // unchanged
  });

  it('edits the selected patient (PATCH)', () => {
    init();
    selectFirst();
    component.startEditPaciente();
    component.pacienteForm.patchValue({ telefono: '+56999998888' });
    component.submitPaciente();

    const req = http.expectOne(`${API}/admin/pacientes/1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...PACIENTES[0], telefono: '+56999998888' });
    expect(component.selected()?.telefono).toBe('+56999998888');
  });

  it('deletes the selected patient after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    init();
    selectFirst();
    component.deletePaciente();
    http.expectOne(`${API}/admin/pacientes/1`).flush(null);
    expect(component.selected()).toBeNull();
    expect(component.pacientes().some(p => p.id === 1)).toBe(false);
  });

  it('adds a clinical note (POST notas)', () => {
    init();
    selectFirst();
    component.notaForm.setValue({ contenido: 'Nueva nota', tipo: 'otro', visible_paciente: false });
    component.submitNota();
    const req = http.expectOne(`${API}/admin/pacientes/1/notas`);
    expect(req.request.method).toBe('POST');
    const nota = { id: 99, paciente_id: 1, cita_id: null, contenido: 'Nueva nota', tipo: 'otro', visible_paciente: false, created_at: 'x', updated_at: 'x' };
    req.flush(nota);
    expect(component.selected()?.notas_clinicas[0].id).toBe(99);
  });

  it('deletes a note after confirm (DELETE notas)', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    init();
    selectFirst();
    component.deleteNota(DETALLE.notas_clinicas[0]);
    http.expectOne(`${API}/admin/pacientes/1/notas/10`).flush(null);
    expect(component.selected()?.notas_clinicas.length).toBe(0);
  });

  it('generates a portal token (POST generar-token)', () => {
    init();
    selectFirst();
    component.generarToken();
    const req = http.expectOne(`${API}/admin/pacientes/1/generar-token`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...PACIENTES[0], access_token: 'newtok' });
    expect(component.selected()?.access_token).toBe('newtok');
  });

  it('puedeNotificar requires a channel and content', () => {
    init();
    selectFirst(); // Ana: email+whatsapp pre-checked, 1 visible note, incluir_notas true
    expect(component.puedeNotificar()).toBe(true);

    component.notificarForm.patchValue({ email: false, whatsapp: false });
    expect(component.puedeNotificar()).toBe(false);
  });

  it('notificar posts chosen channels and shows per-channel result', () => {
    init();
    selectFirst();
    component.notificarForm.patchValue({ email: true, whatsapp: false, incluir_notas: true });
    component.notificar();

    const req = http.expectOne(`${API}/admin/pacientes/1/notificar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.canales).toEqual(['email']);
    req.flush({ resultados: [{ canal: 'email', enviado: true, detalle: 'ok' }] });
    expect(component.enviandoNotif()).toBe(false);
  });

  it('tipoLabel maps known types and falls back', () => {
    expect(component.tipoLabel('sugerencia')).toContain('Sugerencia');
    expect(component.tipoLabel('desconocido')).toBe('desconocido');
  });
});
