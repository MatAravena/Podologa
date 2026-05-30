import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule }    from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatIconModule }      from '@angular/material/icon';
import { MatSelectModule }    from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, of } from 'rxjs';

import { AdminAuthService }    from '../../shared/admin/admin-auth.service';
import { AdminNavbarComponent } from '../../shared/admin/admin-navbar/admin-navbar.component';
import { StarRatingComponent }  from '../../shared/star-rating/star-rating.component';
import { environment }          from '../../../environments/environment';

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
    AdminNavbarComponent,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    StarRatingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-opiniones.component.html',
  styleUrl:    './admin-opiniones.component.scss',
})
export class AdminOpinionesComponent implements OnInit {
  private readonly http  = inject(HttpClient);
  private readonly snack = inject(MatSnackBar);
  private readonly fb    = inject(FormBuilder);
  readonly auth          = inject(AdminAuthService);

  readonly opiniones  = signal<OpinionApi[]>([]);
  readonly loading    = signal(true);
  readonly deleting   = signal<number | null>(null);
  readonly saving     = signal(false);
  readonly editing    = signal<OpinionApi | null>(null);
  readonly creating   = signal(false);

  readonly puntuaciones = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

  readonly form = this.fb.nonNullable.group({
    nombre:     ['', [Validators.required, Validators.minLength(2)]],
    apellido:   ['', Validators.required],
    email:      [''],
    texto:      ['', [Validators.required, Validators.minLength(10)]],
    puntuacion: [5, Validators.required],
  });

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

  startCreate(): void {
    this.editing.set(null);
    this.creating.set(true);
    this.form.reset({ puntuacion: 5 });
  }

  startEdit(op: OpinionApi): void {
    this.creating.set(false);
    this.editing.set(op);
    this.form.patchValue({
      nombre:     op.nombre,
      apellido:   op.apellido,
      email:      op.email ?? '',
      texto:      op.texto,
      puntuacion: op.puntuacion,
    });
  }

  cancel(): void {
    this.editing.set(null);
    this.creating.set(false);
    this.form.reset({ puntuacion: 5 });
  }

  submitForm(): void {
    if (this.form.invalid) return;
    if (this.editing()) {
      this.update();
    } else {
      this.create();
    }
  }

  private create(): void {
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.http.post<OpinionApi>(`${environment.apiUrl}/opiniones`, {
      nombre:     v.nombre,
      apellido:   v.apellido,
      email:      v.email || null,
      texto:      v.texto,
      puntuacion: v.puntuacion,
    }).pipe(
      catchError(() => {
        this.snack.open('Error al crear la opinión.', 'Cerrar', { duration: 4000 });
        this.saving.set(false);
        return of(null);
      })
    ).subscribe(op => {
      this.saving.set(false);
      if (op) {
        this.opiniones.update(list => [op, ...list]);
        this.cancel();
        this.snack.open('Opinión creada.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private update(): void {
    const op = this.editing();
    if (!op) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.http.patch<OpinionApi>(`${environment.apiUrl}/opiniones/${op.id}`, {
      nombre:     v.nombre,
      apellido:   v.apellido,
      email:      v.email || null,
      texto:      v.texto,
      puntuacion: v.puntuacion,
    }).pipe(
      catchError(() => {
        this.snack.open('Error al guardar los cambios.', 'Cerrar', { duration: 4000 });
        this.saving.set(false);
        return of(null);
      })
    ).subscribe(updated => {
      this.saving.set(false);
      if (updated) {
        this.opiniones.update(list => list.map(o => o.id === updated.id ? updated : o));
        this.cancel();
        this.snack.open('Opinión actualizada.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  confirmDelete(op: OpinionApi): void {
    const ok = confirm(`¿Eliminar la opinión de ${op.nombre} ${op.apellido}?\nEsta acción no se puede deshacer.`);
    if (!ok) return;
    this.deleting.set(op.id);
    this.http.delete(`${environment.apiUrl}/opiniones/${op.id}`).pipe(
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
        this.opiniones.update(list => list.filter(o => o.id !== op.id));
        if (this.editing()?.id === op.id) this.cancel();
        this.snack.open('Opinión eliminada.', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
