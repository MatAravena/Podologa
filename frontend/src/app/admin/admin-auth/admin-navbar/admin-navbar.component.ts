import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { AdminAuthService } from '../admin-auth.service';
import { AppIconComponent } from '../../../shared/icon/app-icon.component';

@Component({
  selector: 'app-admin-navbar',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="admin-bar">
      <span class="admin-bar__brand">
        <app-icon name="panel" [size]="24" />
        Panel admin
      </span>

      <nav class="admin-bar__nav" aria-label="Navegación del panel admin">
        <a routerLink="/admin/citas"         routerLinkActive="active" mat-button>Citas</a>
        <a routerLink="/admin/opiniones"     routerLinkActive="active" mat-button>Opiniones</a>
        <a routerLink="/admin/galeria"        routerLinkActive="active" mat-button>Galería</a>
        <a routerLink="/admin/servicios"      routerLinkActive="active" mat-button>Servicios</a>
        <a routerLink="/admin/disponibilidad" routerLinkActive="active" mat-button>Disponibilidad</a>
        <a routerLink="/admin/promociones"    routerLinkActive="active" mat-button>Promociones</a>
        <a routerLink="/admin/pacientes"      routerLinkActive="active" mat-button>Pacientes</a>
      </nav>

      <div class="admin-bar__actions">
        <ng-content />
        <a routerLink="/" mat-button aria-label="Ir al sitio público">
          <app-icon name="inicio" [size]="24" /> Sitio
        </a>
        <button mat-stroked-button (click)="auth.logout()" aria-label="Cerrar sesión">
          <app-icon name="salir" [size]="24" /> Salir
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }

    .admin-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #e8e0da;
      flex-wrap: wrap;
    }

    .admin-bar__brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: #b5627e;
      font-size: 1rem;
      white-space: nowrap;

      mat-icon { color: #b5627e; }
    }

    .admin-bar__nav {
      display: flex;
      justify-content: center;
      gap: 0.25rem;
      flex-wrap: wrap;

      a { color: #5a3e35; }
      a.active { color: #b5627e !important; font-weight: 600; }
    }

    .admin-bar__actions {
      display: flex;
      gap: 0.25rem;
      justify-content: flex-end;
      align-items: center;

      a, button { color: #5a3e35; }
    }

    @media (max-width: 768px) {
      .admin-bar {
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
      }

      .admin-bar__brand { grid-column: 1; }
      .admin-bar__actions { grid-column: 2; grid-row: 1; }
      .admin-bar__nav {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
    }
  `],
})
export class AdminNavbarComponent {
  readonly auth = inject(AdminAuthService);
}
