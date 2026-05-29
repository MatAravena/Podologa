import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { MatTableModule }    from '@angular/material/table';
import { MatChipsModule }    from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { catchError, of } from 'rxjs';

import { AdminAuthService }  from '../../shared/admin/admin-auth.service';
import { StarRatingComponent } from '../../shared/star-rating/star-rating.component';
import { environment } from '../../../environments/environment';

export interface OpinionApi {
  id: number;
  nombre: string;
  apellido: string;
  email: string | null;
  texto: string;
  puntuacion: number;
  servicios_ids: string | null;
  created_at: string;
}

@Component({
  selector: 'app-admin-opiniones',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    StarRatingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-shell">
      <!-- Top bar -->
      <header class="admin-bar">
        <span class="admin-bar__brand">
          <mat-icon>admin_panel_settings</mat-icon>
          Panel admin
        </span>
        <nav class="admin-bar__nav">
          <a routerLink="/admin/opiniones"     mat-button class="active">Opiniones</a>
          <a routerLink="/admin/galeria"        mat-button>Galería</a>
          <a routerLink="/admin/servicios"      mat-button>Servicios</a>
          <a routerLink="/admin/disponibilidad" mat-button>Disponibilidad</a>
          <a routerLink="/admin/promociones"    mat-button>Promociones</a>
        </nav>
        <div class="admin-bar__actions">
          <a routerLink="/" mat-button>
            <mat-icon>home</mat-icon> Sitio
          </a>
          <button mat-stroked-button (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Salir
          </button>
        </div>
      </header>

      <main class="admin-content">
        <h1 class="admin-content__title">
          Opiniones publicadas
          <span class="admin-content__count">({{ opiniones().length }})</span>
        </h1>

        @if (loading()) {
          <p class="admin-content__info">Cargando…</p>
        } @else if (opiniones().length === 0) {
          <p class="admin-content__info">No hay opiniones publicadas aún.</p>
        } @else {
          <div class="opinions-grid">
            @for (op of opiniones(); track op.id) {
              <article class="op-card">
                <div class="op-card__header">
                  <div>
                    <span class="op-card__name">{{ op.nombre }} {{ op.apellido }}</span>
                    @if (op.email) {
                      <span class="op-card__email">{{ op.email }}</span>
                    }
                  </div>
                  <time class="op-card__date">
                    {{ op.created_at | date:'d MMM yyyy' }}
                  </time>
                </div>

                <app-star-rating [value]="op.puntuacion" class="op-card__stars" />

                <p class="op-card__text">"{{ op.texto }}"</p>

                <div class="op-card__footer">
                  <button
                    mat-stroked-button
                    color="warn"
                    class="op-card__delete"
                    [disabled]="deleting() === op.id"
                    (click)="confirmDelete(op)"
                    [attr.aria-label]="'Eliminar opinión de ' + op.nombre"
                  >
                    <mat-icon>delete</mat-icon>
                    @if (deleting() === op.id) { Eliminando… } @else { Eliminar }
                  </button>
                </div>
              </article>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .admin-shell { min-height: 100vh; background: #fafafa; }
    .admin-bar {
      position: sticky; top: 0; z-index: 100;
      background: #2d1218; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px; gap: 16px;
    }
    .admin-bar__brand { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 1rem; }
    .admin-bar__brand mat-icon { color: #f5a0ab; }
    .admin-bar__actions { display: flex; gap: 8px; }
    .admin-bar__actions button, .admin-bar__actions a { color: #fff !important; }
    .admin-content { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .admin-content__title { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; color: #2d2d2d; margin: 0 0 24px; }
    .admin-content__count { font-size: 1rem; font-weight: 400; color: #9ca3af; }
    .admin-content__info { color: #6b7280; }
    .opinions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .op-card { background: #fff; border: 1px solid #f3e8e8; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 2px 12px rgba(200,140,160,.10); }
    .op-card__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .op-card__name { font-weight: 600; color: #2d2d2d; display: block; }
    .op-card__email { font-size: .8125rem; color: #9ca3af; display: block; }
    .op-card__date { font-size: .8125rem; color: #9ca3af; white-space: nowrap; }
    .op-card__text { font-size: .875rem; color: #6b7280; line-height: 1.6; margin: 0; flex: 1; }
    .op-card__footer { display: flex; justify-content: flex-end; }
    .op-card__delete { --mdc-outlined-button-outline-color: #e53e3e; color: #e53e3e !important; font-size: .8125rem; }
  `],
})
export class AdminOpinionesComponent implements OnInit {
  readonly auth    = inject(AdminAuthService);
  private readonly http   = inject(HttpClient);
  private readonly snack  = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly opiniones = signal<OpinionApi[]>([]);
  readonly loading   = signal(true);
  readonly deleting  = signal<number | null>(null);

  ngOnInit(): void {
    this.loadOpiniones();
  }

  private loadOpiniones(): void {
    this.http.get<OpinionApi[]>(`${environment.apiUrl}/opiniones`).pipe(
      catchError(() => of([] as OpinionApi[]))
    ).subscribe(list => {
      this.opiniones.set(list);
      this.loading.set(false);
    });
  }

  confirmDelete(op: OpinionApi): void {
    const ok = confirm(`¿Eliminar la opinión de ${op.nombre} ${op.apellido}?\nEsta acción no se puede deshacer.`);
    if (!ok) return;
    this.deleteOpinion(op.id);
  }

  private deleteOpinion(id: number): void {
    this.deleting.set(id);
    this.http.delete(`${environment.apiUrl}/opiniones/${id}`).pipe(
      catchError(err => {
        this.snack.open(
          err.status === 401 ? 'Sesión expirada. Inicia sesión de nuevo.' : 'Error al eliminar.',
          'Cerrar', { duration: 4000 }
        );
        if (err.status === 401) this.auth.logout();
        return of(null);
      })
    ).subscribe(res => {
      this.deleting.set(null);
      if (res !== null || res === undefined) {
        this.opiniones.update(list => list.filter(o => o.id !== id));
        this.snack.open('Opinión eliminada.', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
