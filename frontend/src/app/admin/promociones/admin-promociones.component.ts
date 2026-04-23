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
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { MatButtonModule }    from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatSelectModule }    from '@angular/material/select';
import { MatIconModule }      from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule }     from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { catchError, of } from 'rxjs';

import { AdminAuthService } from '../../shared/admin/admin-auth.service';
import { environment }      from '../../../environments/environment';

export interface ServicioApi {
  id: number;
  nombre: string;
  duracion: number;
  precio: string;
}

export interface PromocionApi {
  id: number;
  servicio_id: number;
  porcentaje_descuento: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  activo: boolean;
  created_at: string;
  servicio: ServicioApi;
}

@Component({
  selector: 'app-admin-promociones',
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
    MatSlideToggleModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-promociones.component.html',
  styleUrl: './admin-promociones.component.scss',
})
export class AdminPromocionesComponent implements OnInit {
  readonly auth = inject(AdminAuthService);
  private readonly http  = inject(HttpClient);
  private readonly snack = inject(MatSnackBar);
  private readonly fb    = inject(FormBuilder);

  readonly promociones = signal<PromocionApi[]>([]);
  readonly servicios   = signal<ServicioApi[]>([]);
  readonly loading     = signal(true);
  readonly saving      = signal(false);
  readonly deleting    = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    servicio_id:           ['', Validators.required],
    porcentaje_descuento:  ['', [Validators.required, Validators.min(1), Validators.max(100)]],
    descripcion:           [''],
    fecha_inicio:          ['', Validators.required],
    fecha_fin:             ['', Validators.required],
    hora_inicio:           [''],
    hora_fin:              [''],
  });

  ngOnInit(): void {
    this.loadServicios();
    this.loadPromociones();
  }

  private loadServicios(): void {
    this.http.get<ServicioApi[]>(`${environment.apiUrl}/servicios`).pipe(
      catchError(() => of([] as ServicioApi[])),
    ).subscribe(list => this.servicios.set(list));
  }

  private loadPromociones(): void {
    this.http.get<PromocionApi[]>(`${environment.apiUrl}/promociones`).pipe(
      catchError(() => of([] as PromocionApi[])),
    ).subscribe(list => {
      this.promociones.set(list);
      this.loading.set(false);
    });
  }

  isVigente(promo: PromocionApi): boolean {
    const today = new Date().toISOString().split('T')[0];
    return promo.activo && promo.fecha_inicio <= today && promo.fecha_fin >= today;
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();

    // Validate date range
    if (v.fecha_fin && v.fecha_inicio && v.fecha_fin < v.fecha_inicio) {
      this.snack.open('La fecha de fin debe ser posterior a la de inicio.', 'Cerrar', { duration: 4000 });
      return;
    }

    // Validate optional hour range
    if ((v.hora_inicio && !v.hora_fin) || (!v.hora_inicio && v.hora_fin)) {
      this.snack.open('Si defines un rango horario, debes completar ambas horas.', 'Cerrar', { duration: 4000 });
      return;
    }

    const payload: Record<string, unknown> = {
      servicio_id:          Number(v.servicio_id),
      porcentaje_descuento: v.porcentaje_descuento,
      descripcion:          v.descripcion || null,
      fecha_inicio:         v.fecha_inicio,
      fecha_fin:            v.fecha_fin,
      hora_inicio:          v.hora_inicio || null,
      hora_fin:             v.hora_fin || null,
    };

    this.saving.set(true);
    this.http.post<PromocionApi>(`${environment.apiUrl}/promociones`, payload).pipe(
      catchError(err => {
        this.snack.open(
          err.status === 401 ? 'Sesión expirada.' : 'Error al crear la promoción.',
          'Cerrar', { duration: 4000 },
        );
        if (err.status === 401) this.auth.logout();
        return of(null);
      }),
    ).subscribe(promo => {
      this.saving.set(false);
      if (promo) {
        this.promociones.update(list => [promo, ...list]);
        this.form.reset();
        this.snack.open('Promoción creada.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  toggleActivo(promo: PromocionApi): void {
    this.http.patch<PromocionApi>(`${environment.apiUrl}/promociones/${promo.id}`, {
      activo: !promo.activo,
    }).pipe(
      catchError(() => {
        this.snack.open('Error al actualizar la promoción.', 'Cerrar', { duration: 4000 });
        return of(null);
      }),
    ).subscribe(updated => {
      if (updated) {
        this.promociones.update(list =>
          list.map(p => p.id === updated.id ? updated : p)
        );
      }
    });
  }

  deletePromo(promo: PromocionApi): void {
    const ok = confirm(`¿Eliminar la promoción "${promo.porcentaje_descuento}% off ${promo.servicio.nombre}"?\nEsta acción no se puede deshacer.`);
    if (!ok) return;

    this.deleting.set(promo.id);
    this.http.delete(`${environment.apiUrl}/promociones/${promo.id}`).pipe(
      catchError(err => {
        this.snack.open(
          err.status === 401 ? 'Sesión expirada.' : 'Error al eliminar.',
          'Cerrar', { duration: 4000 },
        );
        if (err.status === 401) this.auth.logout();
        return of(null);
      }),
    ).subscribe(res => {
      this.deleting.set(null);
      if (res !== undefined) {
        this.promociones.update(list => list.filter(p => p.id !== promo.id));
        this.snack.open('Promoción eliminada.', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
