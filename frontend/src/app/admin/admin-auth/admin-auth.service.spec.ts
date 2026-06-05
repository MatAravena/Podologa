import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

@Component({ template: '' })
class DummyComponent {}


import { AdminAuthService } from './admin-auth.service';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'libelula_admin_token';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: DummyComponent }]),
        AdminAuthService,
      ],
    });

    service = TestBed.inject(AdminAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should start not logged in when no token in localStorage', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('should be logged in when token exists in localStorage', () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');

    // Re-create the service to trigger _loadToken()
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: DummyComponent }]),
        AdminAuthService,
      ],
    });

    const freshService = TestBed.inject(AdminAuthService);
    expect(freshService.isLoggedIn()).toBe(true);
    expect(freshService.token()).toBe('existing-token');
  });

  describe('login', () => {
    it('should POST form-encoded credentials to /auth/login', () => {
      service.login({ username: 'admin', password: 'secret123' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
      expect(req.request.body).toContain('username=admin');
      req.flush({ access_token: 'jwt-token', token_type: 'bearer' });
    });

    it('should store token in signal and localStorage after successful login', () => {
      service.login({ username: 'admin', password: 'secret123' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ access_token: 'jwt-token', token_type: 'bearer' });

      expect(service.token()).toBe('jwt-token');
      expect(service.isLoggedIn()).toBe(true);
      expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-token');
    });
  });

  describe('logout', () => {
    it('should clear token signal and localStorage', () => {
      service.token.set('some-token');
      localStorage.setItem(TOKEN_KEY, 'some-token');

      service.logout();

      expect(service.token()).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });
});
