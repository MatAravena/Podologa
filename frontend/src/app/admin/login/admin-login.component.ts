import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule }    from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatIconModule }      from '@angular/material/icon';
import { catchError, of } from 'rxjs';

import { AdminAuthService } from '../../shared/admin/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login-page" aria-label="Inicio de sesión administrador">
      <div class="login-card">
        <div class="login-card__logo" aria-hidden="true">
          <mat-icon>admin_panel_settings</mat-icon>
        </div>
        <h1 class="login-card__title">Panel de administración</h1>
        <p class="login-card__sub">Libélula Podología y Terapias</p>

        @if (error()) {
          <p class="login-card__error" role="alert">{{ error() }}</p>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="login-form">
          <mat-form-field appearance="outline" class="login-form__field">
            <mat-label>Usuario</mat-label>
            <input matInput formControlName="username" autocomplete="username" />
            <mat-icon matPrefix>person</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="login-form__field">
            <mat-label>Contraseña</mat-label>
            <input
              matInput
              [type]="showPwd() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
            />
            <mat-icon matPrefix>lock</mat-icon>
            <button
              matSuffix
              mat-icon-button
              type="button"
              [attr.aria-label]="showPwd() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              (click)="showPwd.set(!showPwd())"
            >
              <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <button
            mat-raised-button
            type="submit"
            class="login-form__submit"
            [disabled]="loading() || form.invalid"
            aria-label="Iniciar sesión"
          >
            @if (loading()) {
              <ng-container>
                <mat-icon class="spin">sync</mat-icon>
                Verificando…
              </ng-container>
            } @else {
              <ng-container>
                <mat-icon>login</mat-icon>
                Iniciar sesión
              </ng-container>
            }
          </button>
        </form>

        <a routerLink="/" class="login-card__back">← Volver al sitio</a>
      </div>
    </main>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fff5f5 0%, #fff0f3 100%);
      padding: 24px;
    }
    .login-card {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 40px rgba(200,140,160,.18);
      padding: 48px 40px 40px;
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .login-card__logo { mat-icon { font-size: 48px; width: 48px; height: 48px; color: #d4697e; } }
    .login-card__title { font-family: 'Playfair Display', Georgia, serif; font-size: 1.5rem; font-weight: 700; color: #2d2d2d; margin: 8px 0 0; text-align: center; }
    .login-card__sub { font-size: .875rem; color: #9ca3af; margin: 0 0 16px; }
    .login-card__error { background: #fde8e8; color: #c53030; border-radius: 8px; padding: 10px 16px; font-size: .875rem; width: 100%; text-align: center; }
    .login-card__back { margin-top: 16px; font-size: .8125rem; color: #9ca3af; text-decoration: underline; }
    .login-card__back:hover { color: #d4697e; }
    .login-form { width: 100%; display: flex; flex-direction: column; gap: 4px; }
    .login-form__field { width: 100%; }
    .login-form__submit { width: 100%; height: 50px; margin-top: 8px; background: linear-gradient(135deg, #d4a017, #e8be4a) !important; color: #fff !important; font-weight: 600 !important; border-radius: 50px !important; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AdminLoginComponent {
  private readonly auth   = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly fb     = inject(FormBuilder);

  readonly loading  = signal(false);
  readonly error    = signal('');
  readonly showPwd  = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.getRawValue()).pipe(
      catchError(err => {
        this.error.set(
          err.status === 401
            ? 'Usuario o contraseña incorrectos.'
            : 'Error de conexión. Intenta de nuevo.'
        );
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(res => {
      if (res) this.router.navigate(['/admin/opiniones']);
    });
  }
}
