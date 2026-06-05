import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
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
import { MatChipsModule }      from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DecimalPipe }          from '@angular/common';
import { catchError, of } from 'rxjs';

import { AdminAuthService }   from '../admin-auth/admin-auth.service';
import { AdminNavbarComponent } from '../admin-auth/admin-navbar/admin-navbar.component';
import { ServiciosService, Servicio } from '../../services/servicios/servicios.service';
import { PromocionesService, Promocion, PromocionCreate } from '../../services/promociones/promociones.service';

/** Re-exported for the component spec. */
export type ServicioApi = Servicio;
export type PromocionApi = Promocion;

@Component({
  selector: 'app-admin-promociones',
  imports: [
    AdminNavbarComponent,
    DatePipe,
    DecimalPipe,
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
  private readonly serviciosService   = inject(ServiciosService);
  private readonly promocionesService = inject(PromocionesService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb    = inject(FormBuilder);

  readonly promociones   = signal<Promocion[]>([]);
  readonly servicios     = signal<Servicio[]>([]);
  readonly loading       = signal(true);
  readonly saving        = signal(false);
  readonly deleting      = signal<number | null>(null);
  readonly globalToggle  = signal(false);

  readonly previewServicios = computed(() => {
    const pct = Number(this.form.get('porcentaje_descuento')?.value) || 0;
    if (pct <= 0) return [];
    return this.servicios().map(s => ({
      ...s,
      precioConDescuento: Math.round(Number(s.precio) * (1 - pct / 100)),
    }));
  });

  readonly form = this.fb.nonNullable.group({
    servicio_id:           [''],
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
    this.serviciosService.listar().pipe(
      catchError(() => of([] as Servicio[])),
    ).subscribe(list => this.servicios.set(list));
  }

  private loadPromociones(): void {
    this.promocionesService.listar().pipe(
      catchError(() => of([] as Promocion[])),
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

    if (!this.globalToggle() && !v.servicio_id) {
      this.snack.open('Selecciona un servicio o activa "Todos los servicios".', 'Cerrar', { duration: 4000 });
      return;
    }

    if (v.fecha_fin && v.fecha_inicio && v.fecha_fin < v.fecha_inicio) {
      this.snack.open('La fecha de fin debe ser posterior a la de inicio.', 'Cerrar', { duration: 4000 });
      return;
    }

    if ((v.hora_inicio && !v.hora_fin) || (!v.hora_inicio && v.hora_fin)) {
      this.snack.open('Si defines un rango horario, debes completar ambas horas.', 'Cerrar', { duration: 4000 });
      return;
    }

    const payload: PromocionCreate = {
      servicio_id:          this.globalToggle() ? null : (Number(v.servicio_id) || null),
      porcentaje_descuento: v.porcentaje_descuento,
      descripcion:          v.descripcion || null,
      fecha_inicio:         v.fecha_inicio,
      fecha_fin:            v.fecha_fin,
      hora_inicio:          v.hora_inicio || null,
      hora_fin:             v.hora_fin || null,
    };

    this.saving.set(true);
    this.promocionesService.crear(payload).pipe(
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
    this.promocionesService.actualizar(promo.id, { activo: !promo.activo }).pipe(
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
    const target = promo.servicio?.nombre ?? 'todos los servicios';
    const ok = confirm(`¿Eliminar la promoción "${promo.porcentaje_descuento}% off ${target}"?\nEsta acción no se puede deshacer.`);
    if (!ok) return;

    this.deleting.set(promo.id);
    this.promocionesService.eliminar(promo.id).pipe(
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
