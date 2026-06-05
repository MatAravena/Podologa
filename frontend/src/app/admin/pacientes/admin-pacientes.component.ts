import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule }    from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatSelectModule }    from '@angular/material/select';
import { MatCheckboxModule }  from '@angular/material/checkbox';
import { MatIconModule }      from '@angular/material/icon';
import { MatChipsModule }     from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, of } from 'rxjs';

import { AdminNavbarComponent } from '../admin-auth/admin-navbar/admin-navbar.component';
import { AdminAuthService }     from '../admin-auth/admin-auth.service';
import { PacientesService, Paciente, PacienteDetalle, Nota } from '../../services/pacientes/pacientes.service';

/** Re-exported for templates/specs. */
export type NotaApi = Nota;
export type PacienteApi = Paciente;
export type PacienteDetalleApi = PacienteDetalle;

export const TIPOS_NOTA = [
  { value: 'seguimiento',   label: 'Seguimiento post-cita' },
  { value: 'sugerencia',    label: 'Sugerencia de tratamiento' },
  { value: 'recordatorio',  label: 'Recordatorio preventivo' },
  { value: 'otro',          label: 'Otro' },
] as const;

@Component({
  selector: 'app-admin-pacientes',
  imports: [
    AdminNavbarComponent,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-pacientes.component.html',
  styleUrl:    './admin-pacientes.component.scss',
})
export class AdminPacientesComponent implements OnInit {
  private readonly pacientesService = inject(PacientesService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb    = inject(FormBuilder);
  readonly auth          = inject(AdminAuthService);

  readonly pacientes      = signal<PacienteApi[]>([]);
  readonly selected       = signal<PacienteDetalleApi | null>(null);
  readonly loading        = signal(true);
  readonly loadingDetalle = signal(false);
  readonly saving         = signal(false);
  readonly deletingNota   = signal<number | null>(null);
  readonly generandoToken = signal(false);
  readonly editingNota    = signal<NotaApi | null>(null);
  readonly busqueda       = signal('');

  readonly tiposNota = TIPOS_NOTA;

  readonly pacientesFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase();
    if (!q) return this.pacientes();
    return this.pacientes().filter(
      p => p.nombre.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    );
  });

  readonly notaForm = this.fb.nonNullable.group({
    contenido:         ['', [Validators.required, Validators.minLength(1)]],
    tipo:              ['seguimiento', Validators.required],
    visible_paciente:  [false],
  });

  ngOnInit(): void {
    this.loadPacientes();
  }

  private loadPacientes(): void {
    this.pacientesService.listar().pipe(
      catchError(() => of([] as Paciente[]))
    ).subscribe(list => {
      this.pacientes.set(list);
      this.loading.set(false);
    });
  }

  selectPaciente(p: PacienteApi): void {
    this.loadingDetalle.set(true);
    this.editingNota.set(null);
    this.notaForm.reset({ tipo: 'seguimiento', visible_paciente: false });
    this.pacientesService.obtener(p.id).pipe(
      catchError(() => of(null))
    ).subscribe(detalle => {
      this.loadingDetalle.set(false);
      if (detalle) this.selected.set(detalle);
    });
  }

  startEditNota(nota: NotaApi): void {
    this.editingNota.set(nota);
    this.notaForm.patchValue({
      contenido:        nota.contenido,
      tipo:             nota.tipo,
      visible_paciente: nota.visible_paciente,
    });
  }

  cancelEditNota(): void {
    this.editingNota.set(null);
    this.notaForm.reset({ tipo: 'seguimiento', visible_paciente: false });
  }

  submitNota(): void {
    if (this.notaForm.invalid || !this.selected()) return;
    const v = this.notaForm.getRawValue();
    const paciente = this.selected()!;

    if (this.editingNota()) {
      this.updateNota(paciente.id, this.editingNota()!.id, v);
    } else {
      this.createNota(paciente.id, v);
    }
  }

  private createNota(pacienteId: number, v: { contenido: string; tipo: string; visible_paciente: boolean }): void {
    this.saving.set(true);
    this.pacientesService.crearNota(pacienteId, v).pipe(
      catchError(() => {
        this.snack.open('Error al guardar la nota.', 'Cerrar', { duration: 4000 });
        this.saving.set(false);
        return of(null);
      })
    ).subscribe(nota => {
      this.saving.set(false);
      if (nota) {
        this.selected.update(p => p ? { ...p, notas_clinicas: [nota, ...p.notas_clinicas] } : p);
        this.notaForm.reset({ tipo: 'seguimiento', visible_paciente: false });
        this.snack.open('Nota agregada.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private updateNota(pacienteId: number, notaId: number, v: { contenido: string; tipo: string; visible_paciente: boolean }): void {
    this.saving.set(true);
    this.pacientesService.actualizarNota(pacienteId, notaId, v).pipe(
      catchError(() => {
        this.snack.open('Error al actualizar la nota.', 'Cerrar', { duration: 4000 });
        this.saving.set(false);
        return of(null);
      })
    ).subscribe(updated => {
      this.saving.set(false);
      if (updated) {
        this.selected.update(p => p ? {
          ...p,
          notas_clinicas: p.notas_clinicas.map(n => n.id === updated.id ? updated : n),
        } : p);
        this.cancelEditNota();
        this.snack.open('Nota actualizada.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  deleteNota(nota: NotaApi): void {
    if (!confirm('¿Eliminar esta nota? La acción no se puede deshacer.')) return;
    const paciente = this.selected();
    if (!paciente) return;
    this.deletingNota.set(nota.id);
    this.pacientesService.eliminarNota(paciente.id, nota.id).pipe(
      catchError(() => { this.snack.open('Error al eliminar.', 'Cerrar', { duration: 4000 }); return of(null); })
    ).subscribe(() => {
      this.deletingNota.set(null);
      this.selected.update(p => p ? {
        ...p,
        notas_clinicas: p.notas_clinicas.filter(n => n.id !== nota.id),
      } : p);
      if (this.editingNota()?.id === nota.id) this.cancelEditNota();
      this.snack.open('Nota eliminada.', 'Cerrar', { duration: 3000 });
    });
  }

  generarToken(): void {
    const paciente = this.selected();
    if (!paciente) return;
    if (paciente.access_token && !confirm('¿Regenerar el token? El enlace anterior dejará de funcionar.')) return;
    this.generandoToken.set(true);
    this.pacientesService.generarToken(paciente.id).pipe(
      catchError(() => { this.snack.open('Error al generar token.', 'Cerrar', { duration: 4000 }); return of(null); })
    ).subscribe(updated => {
      this.generandoToken.set(false);
      if (updated) {
        this.selected.update(p => p ? { ...p, access_token: updated.access_token } : p);
        this.pacientes.update(list => list.map(p => p.id === updated.id ? { ...p, access_token: updated.access_token } : p));
        this.snack.open('Token generado. Comparte el enlace con el paciente.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  portalUrl(token: string): string {
    return `${window.location.origin}/mi-historial/${token}`;
  }

  copyToken(token: string): void {
    navigator.clipboard.writeText(this.portalUrl(token))
      .then(() => this.snack.open('Enlace copiado al portapapeles.', 'Cerrar', { duration: 3000 }))
      .catch(() => this.snack.open('No se pudo copiar. Cópialo manualmente.', 'Cerrar', { duration: 4000 }));
  }

  tipoLabel(tipo: string): string {
    return TIPOS_NOTA.find(t => t.value === tipo)?.label ?? tipo;
  }
}
