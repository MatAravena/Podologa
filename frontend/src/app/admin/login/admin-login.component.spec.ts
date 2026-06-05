import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Component } from '@angular/core';

@Component({ template: '' })
class DummyComponent {}

import { AdminLoginComponent } from './admin-login.component';
import { AdminAuthService } from '../admin-auth/admin-auth.service';

describe('AdminLoginComponent', () => {
  let fixture: ComponentFixture<AdminLoginComponent>;
  let component: AdminLoginComponent;
  let authSpy: {
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authSpy = {
      login: vi.fn().mockReturnValue(of(null)),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent, NoopAnimationsModule],
      providers: [
        provideRouter([{ path: '**', component: DummyComponent }]),
        { provide: AdminAuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with form invalid (both fields empty)', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('should start with loading=false and no error', () => {
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('');
  });

  it('should start with password hidden', () => {
    expect(component.showPwd()).toBe(false);
  });

  it('should toggle password visibility', () => {
    component.showPwd.set(true);
    expect(component.showPwd()).toBe(true);
    component.showPwd.set(false);
    expect(component.showPwd()).toBe(false);
  });

  it('should not call login when form is invalid', () => {
    component.onSubmit();
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  it('should call login with credentials when form is valid', async () => {
    authSpy.login.mockReturnValue(of({ access_token: 'token', token_type: 'bearer' }));
    component.form.setValue({ username: 'admin', password: 'secret' });
    component.onSubmit();
    await fixture.whenStable();
    expect(authSpy.login).toHaveBeenCalledWith({ username: 'admin', password: 'secret' });
  });

  it('should set 401 error message on wrong credentials', async () => {
    authSpy.login.mockReturnValue(throwError(() => ({ status: 401 })));
    component.form.setValue({ username: 'admin', password: 'wrong' });
    component.onSubmit();
    await fixture.whenStable();
    expect(component.error()).toBe('Usuario o contraseña incorrectos.');
    expect(component.loading()).toBe(false);
  });

  it('should set connection error message on non-401 errors', async () => {
    authSpy.login.mockReturnValue(throwError(() => ({ status: 500 })));
    component.form.setValue({ username: 'admin', password: 'secret' });
    component.onSubmit();
    await fixture.whenStable();
    expect(component.error()).toBe('Error de conexión. Intenta de nuevo.');
    expect(component.loading()).toBe(false);
  });
});
