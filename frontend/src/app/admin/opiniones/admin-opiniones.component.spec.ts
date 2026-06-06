import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AdminOpinionesComponent, OpinionApi } from './admin-opiniones.component';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { environment } from '../../../environments/environment';

const MOCK_OPINIONES: OpinionApi[] = [
  { id: 1, nombre: 'María', apellido: 'García', email: 'maria@test.cl', telefono: null, foto_url: null, texto: 'Excelente', puntuacion: 5, servicios_ids: null, created_at: '2026-01-01T10:00:00', updated_at: '2026-01-01T10:00:00' },
  { id: 2, nombre: 'Juan',  apellido: 'Pérez',  email: null,            telefono: null, foto_url: null, texto: 'Muy bueno', puntuacion: 4, servicios_ids: null, created_at: '2026-01-02T11:00:00', updated_at: '2026-01-02T11:00:00' },
];

describe('AdminOpinionesComponent', () => {
  let fixture: ComponentFixture<AdminOpinionesComponent>;
  let component: AdminOpinionesComponent;
  let httpMock: HttpTestingController;

  const authSpy = { logout: vi.fn(), isLoggedIn: () => true, token: () => 'mock-token' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOpinionesComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: authSpy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminOpinionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/opiniones`).flush(MOCK_OPINIONES);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load opiniones from API on init', () => {
    expect(component.opiniones().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('should start with deleting=null', () => {
    expect(component.deleting()).toBeNull();
  });

  it('should render the opinion count in the DOM', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('2');
  });

  it('confirmDelete should do nothing when confirm is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const before = component.opiniones().length;
    component.confirmDelete(MOCK_OPINIONES[0]);
    // No HTTP request should have been made
    httpMock.expectNone(`${environment.apiUrl}/opiniones/1`);
    expect(component.opiniones().length).toBe(before);
  });

  it('confirmDelete should remove the opinion from the list after a 204 success', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const before = component.opiniones().length;
    component.confirmDelete(MOCK_OPINIONES[0]);
    const req = httpMock.expectOne(`${environment.apiUrl}/opiniones/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(component.opiniones().length).toBe(before - 1);
    expect(component.opiniones().some(o => o.id === 1)).toBe(false);
  });

  it('confirmDelete should keep the opinion in the list when the request fails', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const before = component.opiniones().length;
    component.confirmDelete(MOCK_OPINIONES[0]);
    httpMock.expectOne(`${environment.apiUrl}/opiniones/1`)
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    expect(component.opiniones().length).toBe(before);
  });
});
