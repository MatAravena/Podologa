import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { forkJoin, of, catchError } from 'rxjs';
import { MatButtonModule }    from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatSelectModule }    from '@angular/material/select';
import { MatIconModule }      from '@angular/material/icon';
import { MatTabsModule }      from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AdminAuthService }   from '../admin-auth/admin-auth.service';
import { AdminNavbarComponent } from '../admin-auth/admin-navbar/admin-navbar.component';
import { DisponibilidadService, Bloque, Bloqueo, BloqueCreate } from '../../services/disponibilidad/disponibilidad.service';

/** Re-exported for templates/specs. */
export type BloqueApi = Bloque;
export type BloqueoApi = Bloqueo;

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-admin-disponibilidad',
  imports: [
    AdminNavbarComponent,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-disponibilidad.component.html',
  styleUrl:    './admin-disponibilidad.component.scss',
})
export class AdminDisponibilidadComponent implements OnInit {
  readonly auth   = inject(AdminAuthService);
  private readonly disponibilidadService = inject(DisponibilidadService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb    = inject(FormBuilder);

  readonly bloques     = signal<Bloque[]>([]);
  readonly bloqueos    = signal<Bloqueo[]>([]);
  readonly loading     = signal(true);
  readonly saving      = signal(false);
  readonly deletingBloque  = signal<number | null>(null);
  readonly deletingBloqueo = signal<number | null>(null);

  readonly dias = DIAS;
  readonly diaOpciones = DIAS.map((label, value) => ({ value, label }));

  // Grouped by dia_semana for display
  readonly bloquesSemanal = computed(() =>
    DIAS.map((nombre, idx) => ({
      dia: idx,
      nombre,
      bloques: this.bloques().filter(b => b.dia_semana === idx && b.activo),
    })).filter(g => g.bloques.length > 0)
  );

  readonly bloquesEspecificos = computed(() =>
    this.bloques().filter(b => b.fecha_especifica !== null && b.activo)
  );

  readonly bloqueForm = this.fb.nonNullable.group({
    tipo:             ['semanal'],
    dia_semana:       [0],
    fecha_especifica: [''],
    hora_inicio:      ['09:00', Validators.required],
    hora_fin:         ['18:00', Validators.required],
  });

  readonly bloqueoForm = this.fb.nonNullable.group({
    fecha:       ['', Validators.required],
    fecha_hasta: [''],
    motivo:      [''],
  }, { validators: this.fechaHastaValidator });

  readonly rangoBloqueo = computed(() => {
    const inicio = this.bloqueoForm.get('fecha')?.value;
    const hasta  = this.bloqueoForm.get('fecha_hasta')?.value;
    if (!inicio || !hasta || hasta < inicio) return 1;
    const ms = new Date(hasta).getTime() - new Date(inicio).getTime();
    return Math.round(ms / 86_400_000) + 1;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.disponibilidadService.listarBloques().pipe(
      catchError(() => of([] as Bloque[]))
    ).subscribe(list => this.bloques.set(list));

    this.disponibilidadService.listarBloqueos().pipe(
      catchError(() => of([] as Bloqueo[]))
    ).subscribe(list => { this.bloqueos.set(list); this.loading.set(false); });
  }

  // ── Bloques horarios ──────────────────────────────────────────────────────

  agregarBloque(): void {
    if (this.bloqueForm.invalid) return;
    const v = this.bloqueForm.getRawValue();

    const payload: BloqueCreate = {
      hora_inicio: v.hora_inicio,
      hora_fin:    v.hora_fin,
      activo:      true,
    };

    if (v.tipo === 'semanal') {
      payload.dia_semana = v.dia_semana;
    } else {
      if (!v.fecha_especifica) {
        this.snack.open('Debes seleccionar una fecha específica.', 'Cerrar', { duration: 3000 });
        return;
      }
      payload.fecha_especifica = v.fecha_especifica;
    }

    this.saving.set(true);
    this.disponibilidadService.crearBloque(payload).pipe(
      catchError(() => {
        this.snack.open('Error al guardar el bloque.', 'Cerrar', { duration: 4000 });
        this.saving.set(false);
        return of(null);
      })
    ).subscribe(bloque => {
      this.saving.set(false);
      if (bloque) {
        this.bloques.update(list => [...list, bloque]);
        this.bloqueForm.patchValue({ hora_inicio: '09:00', hora_fin: '18:00', fecha_especifica: '' });
        this.snack.open('Bloque horario agregado.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  eliminarBloque(id: number): void {
    if (!confirm('¿Eliminar este bloque horario?')) return;
    this.deletingBloque.set(id);
    this.disponibilidadService.eliminarBloque(id).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.deletingBloque.set(null);
      this.bloques.update(list => list.filter(b => b.id !== id));
      this.snack.open('Bloque eliminado.', 'Cerrar', { duration: 3000 });
    });
  }

  // ── Fechas bloqueadas ─────────────────────────────────────────────────────

  private fechaHastaValidator(group: AbstractControl): ValidationErrors | null {
    const inicio = group.get('fecha')?.value;
    const hasta  = group.get('fecha_hasta')?.value;
    if (hasta && inicio && hasta < inicio) {
      group.get('fecha_hasta')?.setErrors({ fechaHastaInvalida: true });
      return { fechaHastaInvalida: true };
    }
    const ctrl = group.get('fecha_hasta');
    if (ctrl?.errors?.['fechaHastaInvalida']) {
      ctrl.setErrors(null);
    }
    return null;
  }

  private dateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const cur = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  agregarBloqueo(): void {
    if (this.bloqueoForm.invalid) return;
    const v = this.bloqueoForm.getRawValue();
    const motivo = v.motivo || null;
    const fechas = (v.fecha_hasta && v.fecha_hasta >= v.fecha)
      ? this.dateRange(v.fecha, v.fecha_hasta)
      : [v.fecha];

    this.saving.set(true);

    const requests = fechas.map(fecha =>
      this.disponibilidadService.crearBloqueo({ fecha, motivo, activo: true })
        .pipe(catchError(() => of(null)))
    );

    forkJoin(requests).subscribe(results => {
      this.saving.set(false);
      const added = results.filter((r): r is Bloqueo => r !== null);
      if (added.length > 0) {
        this.bloqueos.update(list =>
          [...list, ...added].sort((a, b) => a.fecha.localeCompare(b.fecha))
        );
        this.bloqueoForm.reset();
        const skipped = fechas.length - added.length;
        const msg = skipped > 0
          ? `${added.length} fecha(s) bloqueadas (${skipped} ya existían).`
          : added.length === 1 ? 'Fecha bloqueada correctamente.' : `${added.length} fechas bloqueadas.`;
        this.snack.open(msg, 'Cerrar', { duration: 4000 });
      } else {
        this.snack.open('No se pudo bloquear ninguna fecha (¿ya existen?).', 'Cerrar', { duration: 4000 });
      }
    });
  }

  eliminarBloqueo(id: number): void {
    if (!confirm('¿Desbloquear esta fecha?')) return;
    this.deletingBloqueo.set(id);
    this.disponibilidadService.eliminarBloqueo(id).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.deletingBloqueo.set(null);
      this.bloqueos.update(list => list.filter(b => b.id !== id));
      this.snack.open('Fecha desbloqueada.', 'Cerrar', { duration: 3000 });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatHora(hora: string): string {
    return hora.substring(0, 5); // "HH:MM:SS" → "HH:MM"
  }

  diaNombre(idx: number): string {
    return DIAS[idx] ?? `Día ${idx}`;
  }
}
