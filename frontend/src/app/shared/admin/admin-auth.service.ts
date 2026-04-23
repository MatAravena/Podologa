import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginPayload { username: string; password: string; }
export interface TokenResponse { access_token: string; token_type: string; }

const TOKEN_KEY = 'libelula_admin_token';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http       = inject(HttpClient);
  private readonly router     = inject(Router);
  private readonly isBrowser  = isPlatformBrowser(inject(PLATFORM_ID));

  readonly token = signal<string | null>(this._loadToken());
  readonly isLoggedIn = () => !!this.token();

  login(payload: LoginPayload) {
    const form = new URLSearchParams();
    form.set('username', payload.username);
    form.set('password', payload.password);

    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).pipe(
      tap(res => {
        this.token.set(res.access_token);
        if (this.isBrowser) localStorage.setItem(TOKEN_KEY, res.access_token);
      })
    );
  }

  logout(): void {
    this.token.set(null);
    if (this.isBrowser) localStorage.removeItem(TOKEN_KEY);
    this.router.navigate(['/admin/login']);
  }

  private _loadToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }
}
