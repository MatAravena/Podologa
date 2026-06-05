import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule }           from '@angular/material/button';
import { MatIconModule }             from '@angular/material/icon';
import { MatInputModule }            from '@angular/material/input';
import { MatFormFieldModule }        from '@angular/material/form-field';
import { MatProgressSpinnerModule }  from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, of } from 'rxjs';

import { AdminAuthService }     from '../admin-auth/admin-auth.service';
import { AdminNavbarComponent }  from '../admin-auth/admin-navbar/admin-navbar.component';
import { AppIconComponent }      from '../../shared/icon/app-icon.component';
import { IconCatalogService }    from '../../shared/icon/icon-catalog.service';
import { BRAND_COLORS, resolveColor } from '../../shared/colors/brand-colors';
import { ServiciosService, Servicio, ServicioCreate, ServicioUpdate } from '../../services/servicios/servicios.service';

/** Re-exported for the component spec. */
export type ServicioAdminApi = Servicio;


@Component({
  selector: 'app-admin-servicios',
  imports: [
    AdminNavbarComponent,
    AppIconComponent,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-servicios.component.html',
  styleUrl: './admin-servicios.component.scss',
})
export class AdminServiciosComponent implements OnInit {
  readonly auth   = inject(AdminAuthService);
  private readonly serviciosService = inject(ServiciosService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb    = inject(FormBuilder);
  private readonly iconCatalog = inject(IconCatalogService);

  readonly servicios        = signal<ServicioAdminApi[]>([]);
  readonly loading          = signal(true);
  readonly selected         = signal<ServicioAdminApi | null>(null);
  readonly creating         = signal(false);
  readonly saving           = signal(false);
  readonly uploadingFoto    = signal(false);
  readonly deletingFoto     = signal<number | null>(null);
  readonly deletingServicio = signal<number | null>(null);

  readonly fotos = computed(() => {
    const s = this.selected();
    return s?.fotos_urls ? (JSON.parse(s.fotos_urls) as string[]) : [];
  });

  readonly iconosDisponibles = this.iconCatalog.icons;
  readonly brandColors       = BRAND_COLORS;
  readonly resolveColor      = resolveColor;

  readonly form = this.fb.group({
    nombre:           ['', [Validators.required, Validators.minLength(2)]],
    descripcion:      [''],
    subtitulo:        [''],
    descripcion_larga:[''],
    icono:            [''],
    icono_color:      [''],
    duracion:         [0,  [Validators.required, Validators.min(1)]],
    precio:           [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.iconCatalog.load();
    this.loadServicios();
  }

  private loadServicios(): void {
    this.serviciosService.listar().pipe(
      catchError(() => of([] as Servicio[]))
    ).subscribe(list => {
      this.servicios.set(list);
      this.loading.set(false);
    });
  }

  select(s: ServicioAdminApi): void {
    this.creating.set(false);
    this.selected.set(s);
    this.form.patchValue({
      nombre:            s.nombre,
      descripcion:       s.descripcion ?? '',
      subtitulo:         s.subtitulo ?? '',
      descripcion_larga: s.descripcion_larga ?? '',
      icono:             s.icono ?? '',
      icono_color:       s.icono_color ?? '',
      duracion:          s.duracion,
      precio:            s.precio,
    });
  }

  deselect(): void {
    this.selected.set(null);
    this.creating.set(false);
    this.form.reset();
  }

  startCreate(): void {
    this.selected.set(null);
    this.creating.set(true);
    this.form.reset({ duracion: 0, precio: 0 });
  }

  cancelCreate(): void {
    this.creating.set(false);
    this.form.reset();
  }

  create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: ServicioCreate = {
      nombre:      v.nombre ?? '',
      descripcion: v.descripcion || null,
      icono:       v.icono || null,
      icono_color: v.icono_color || null,
      duracion:    Number(v.duracion),
      precio:      Number(v.precio),
    };
    this.serviciosService.crear(body).pipe(
      catchError(err => {
        this.snack.open(
          err.status === 401 ? 'Sesión expirada.' : 'Error al crear el servicio.',
          'Cerrar', { duration: 4000 }
        );
        if (err.status === 401) this.auth.logout();
        return of(null);
      })
    ).subscribe(created => {
      this.saving.set(false);
      if (created) {
        this.servicios.update(list => [...list, created]);
        this.creating.set(false);
        this.select(created);
        this.snack.open('Servicio creado.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  save(): void {
    if (this.form.invalid || !this.selected()) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: ServicioUpdate = {
      nombre:            v.nombre ?? '',
      descripcion:       v.descripcion || null,
      subtitulo:         v.subtitulo || null,
      descripcion_larga: v.descripcion_larga || null,
      icono:             v.icono || null,
      icono_color:       v.icono_color || null,
      duracion:          Number(v.duracion),
      precio:            Number(v.precio),
    };
    this.serviciosService.actualizar(this.selected()!.id, body).pipe(
      catchError(err => {
        this.snack.open(
          err.status === 401 ? 'Sesión expirada.' : 'Error al guardar.',
          'Cerrar', { duration: 4000 }
        );
        if (err.status === 401) this.auth.logout();
        return of(null);
      })
    ).subscribe(updated => {
      this.saving.set(false);
      if (updated) {
        this.servicios.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.select(updated); // re-patches all form fields including icono + icono_color
        this.snack.open('Cambios guardados.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  deleteServicio(s: ServicioAdminApi): void {
    if (!confirm(`¿Eliminar el servicio "${s.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.deletingServicio.set(s.id);
    this.serviciosService.eliminar(s.id).pipe(
      catchError(() => {
        this.snack.open('Error al eliminar el servicio.', 'Cerrar', { duration: 4000 });
        return of(null);
      })
    ).subscribe(() => {
      this.deletingServicio.set(null);
      this.servicios.update(list => list.filter(x => x.id !== s.id));
      if (this.selected()?.id === s.id) this.deselect();
      this.snack.open('Servicio eliminado.', 'Cerrar', { duration: 3000 });
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    this.uploadingFoto.set(true);
    this.serviciosService.subirFoto(this.selected()!.id, file).pipe(
      catchError(err => {
        this.snack.open(
          err.status === 415 ? 'Formato no permitido. Usa jpg, png o webp.' :
          err.status === 413 ? 'Imagen demasiado grande (máx 10 MB).' : 'Error al subir.',
          'Cerrar', { duration: 4000 }
        );
        return of(null);
      })
    ).subscribe(updated => {
      this.uploadingFoto.set(false);
      if (updated) {
        this.servicios.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.selected.set(updated);
        this.snack.open('Foto subida.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  deleteFoto(index: number): void {
    if (!confirm('¿Eliminar esta foto?')) return;
    this.deletingFoto.set(index);
    this.serviciosService.eliminarFoto(this.selected()!.id, index).pipe(
      catchError(() => {
        this.snack.open('Error al eliminar la foto.', 'Cerrar', { duration: 4000 });
        return of(null);
      })
    ).subscribe(updated => {
      this.deletingFoto.set(null);
      if (updated) {
        this.servicios.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.selected.set(updated);
        this.snack.open('Foto eliminada.', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
