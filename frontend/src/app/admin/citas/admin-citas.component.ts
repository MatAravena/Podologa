import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { catchError, of } from 'rxjs';

import { AdminNavbarComponent } from '../admin-auth/admin-navbar/admin-navbar.component';
import { CitasService, CitaAdmin, EstadoCita } from '../../services/citas/citas.service';

interface EstadoOpcion { value: EstadoCita | ''; label: string; }

@Component({
  selector: 'app-admin-citas',
  imports: [
    AdminNavbarComponent,
    DatePipe,
    MatButtonModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-citas.component.html',
  styleUrl:    './admin-citas.component.scss',
})
export class AdminCitasComponent implements OnInit {
  private readonly citasService = inject(CitasService);

  readonly citas   = signal<CitaAdmin[]>([]);
  readonly loading = signal(true);

  // Filters — date/estado hit the backend; name filters client-side (instant).
  readonly desde  = signal('');
  readonly hasta  = signal('');
  readonly estado = signal<EstadoCita | ''>('');
  readonly nombre = signal('');

  readonly estados: EstadoOpcion[] = [
    { value: '',           label: 'Todos los estados' },
    { value: 'pendiente',  label: 'Pendiente' },
    { value: 'confirmada', label: 'Confirmada' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada',  label: 'Cancelada' },
  ];

  /** Citas filtered by the live name search (matches nombre + apellido). */
  private readonly citasFiltradas = computed(() => {
    const q = this.nombre().trim().toLowerCase();
    if (!q) return this.citas();
    return this.citas().filter(c => c.paciente_nombre.toLowerCase().includes(q));
  });

  /** Group filtered appointments by date for the agenda view. */
  readonly citasPorDia = computed(() => {
    const groups = new Map<string, CitaAdmin[]>();
    for (const c of this.citasFiltradas()) {
      const arr = groups.get(c.fecha) ?? [];
      arr.push(c);
      groups.set(c.fecha, arr);
    }
    return [...groups.entries()].map(([fecha, citas]) => ({ fecha, citas }));
  });

  /** Whether any appointments remain after the name filter. */
  readonly hayResultados = computed(() => this.citasFiltradas().length > 0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.citasService.listar({
      desde:  this.desde()  || undefined,
      hasta:  this.hasta()  || undefined,
      estado: this.estado() || undefined,
    }).pipe(
      catchError(() => of([] as CitaAdmin[]))
    ).subscribe(list => {
      this.citas.set(list);
      this.loading.set(false);
    });
  }

  limpiarFiltros(): void {
    this.desde.set('');
    this.hasta.set('');
    this.estado.set('');
    this.nombre.set('');
    this.load();
  }

  hora(c: CitaAdmin): string {
    return c.hora.slice(0, 5); // "HH:MM:SS" → "HH:MM"
  }

  estadoLabel(e: EstadoCita): string {
    return this.estados.find(o => o.value === e)?.label ?? e;
  }
}
