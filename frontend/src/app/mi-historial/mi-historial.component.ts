import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { catchError, of }  from 'rxjs';

import { PacientesService, Portal } from '../services/pacientes/pacientes.service';

/** Re-exported for the component spec. */
export type PortalApi = Portal;

const TIPO_LABELS: Record<string, string> = {
  seguimiento:  'Seguimiento',
  sugerencia:   'Sugerencia de tratamiento',
  recordatorio: 'Recordatorio',
  otro:         'Nota',
};

@Component({
  selector: 'app-mi-historial',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mi-historial.component.html',
  styleUrl:    './mi-historial.component.scss',
})
export class MiHistorialComponent implements OnInit {
  private readonly pacientesService = inject(PacientesService);
  private readonly route = inject(ActivatedRoute);

  readonly perfil   = signal<Portal | null>(null);
  readonly loading  = signal(true);
  readonly notFound = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) { this.notFound.set(true); this.loading.set(false); return; }

    this.pacientesService.perfilPublico(token).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (!data) this.notFound.set(true);
      else this.perfil.set(data);
      this.loading.set(false);
    });
  }

  tipoLabel(tipo: string): string {
    return TIPO_LABELS[tipo] ?? 'Nota';
  }
}
