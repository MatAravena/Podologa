import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule }    from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatSelectModule }    from '@angular/material/select';
import { MatIconModule }      from '@angular/material/icon';
import { MatTabsModule }      from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, of } from 'rxjs';

import { AdminAuthService } from '../../shared/admin/admin-auth.service';
import { environment }      from '../../../environments/environment';

export interface BloqueApi {
  id: number;
  dia_semana: number | null;
  fecha_especifica: string | null;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  created_at: string;
}

export interface BloqueoApi {
  id: number;
  fecha: string;
  motivo: string | null;
  activo: boolean;
  created_at: string;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-admin-disponibilidad',
  imports: [
    DatePipe,
    RouterLink,
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
  private readonly http  = inject(HttpClient);
  private readonly snack = inject(MatSnackBar);
  private readonly fb    = inject(FormBuilder);

  readonly bloques     = signal<BloqueApi[]>([]);
  readonly bloqueos    = signal<BloqueoApi[]>([]);
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
    fecha:  ['', Validators.required],
    motivo: [''],
  });

  readonly apiUrl = environment.apiUrl;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.http.get<BloqueApi[]>(`${this.apiUrl}/admin/disponibilidad/bloques`).pipe(
      catchError(() => of([] as BloqueApi[]))
    ).subscribe(list => this.bloques.set(list));

    this.http.get<BloqueoApi[]>(`${this.apiUrl}/admin/disponibilidad/bloqueos`).pipe(
      catchError(() => of([] as BloqueoApi[]))
    ).subscribe(list => { this.bloqueos.set(list); this.loading.set(false); });
  }

  // ── Bloques horarios ──────────────────────────────────────────────────────

  agregarBloque(): void {
    if (this.bloqueForm.invalid) return;
    const v = this.bloqueForm.getRawValue();

    const payload: Record<string, unknown> = {
      hora_inicio: v.hora_inicio,
      hora_fin:    v.hora_fin,
      activo:      true,
    };

    if (v.tipo === 'semanal') {
      payload['dia_semana'] = v.dia_semana;
    } else {
      if (!v.fecha_especifica) {
        this.snack.open('Debes seleccionar una fecha específica.', 'Cerrar', { duration: 3000 });
        return;
      }
      payload['fecha_especifica'] = v.fecha_especifica;
    }

    this.saving.set(true);
    this.http.post<BloqueApi>(`${this.apiUrl}/admin/disponibilidad/bloques`, payload).pipe(
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
    this.http.delete(`${this.apiUrl}/admin/disponibilidad/bloques/${id}`).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.deletingBloque.set(null);
      this.bloques.update(list => list.filter(b => b.id !== id));
      this.snack.open('Bloque eliminado.', 'Cerrar', { duration: 3000 });
    });
  }

  // ── Fechas bloqueadas ─────────────────────────────────────────────────────

  agregarBloqueo(): void {
    if (this.bloqueoForm.invalid) return;
    const v = this.bloqueoForm.getRawValue();
    this.saving.set(true);
    this.http.post<BloqueoApi>(`${this.apiUrl}/admin/disponibilidad/bloqueos`, {
      fecha:  v.fecha,
      motivo: v.motivo || null,
      activo: true,
    }).pipe(
      catchError(err => {
        const msg = err.status === 409
          ? `Ya existe un bloqueo para esa fecha.`
          : 'Error al guardar el bloqueo.';
        this.snack.open(msg, 'Cerrar', { duration: 4000 });
        this.saving.set(false);
        return of(null);
      })
    ).subscribe(bloqueo => {
      this.saving.set(false);
      if (bloqueo) {
        this.bloqueos.update(list => [...list, bloqueo].sort((a, b) => a.fecha.localeCompare(b.fecha)));
        this.bloqueoForm.reset();
        this.snack.open('Fecha bloqueada correctamente.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  eliminarBloqueo(id: number): void {
    if (!confirm('¿Desbloquear esta fecha?')) return;
    this.deletingBloqueo.set(id);
    this.http.delete(`${this.apiUrl}/admin/disponibilidad/bloqueos/${id}`).pipe(
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
