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

import { ReservasService, ConfirmacionApi } from '../services/reservas/reservas.service';

@Component({
  selector: 'app-confirmar',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmar.component.html',
  styleUrl:    './confirmar.component.scss',
})
export class ConfirmarComponent implements OnInit {
  private readonly reservas = inject(ReservasService);
  private readonly route    = inject(ActivatedRoute);

  readonly cita     = signal<ConfirmacionApi | null>(null);
  readonly loading  = signal(true);
  readonly notFound = signal(false);
  readonly saving   = signal(false);
  /** null = not answered yet this session; true/false = the choice just made */
  readonly resultado = signal<boolean | null>(null);

  private token = '';

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) { this.notFound.set(true); this.loading.set(false); return; }
    this.token = token;

    this.reservas.getConfirmacion(token).pipe(
      catchError(() => of(null))
    ).subscribe(data => {
      if (!data) this.notFound.set(true);
      else this.cita.set(data);
      this.loading.set(false);
    });
  }

  /** True once the patient already answered (either this session or previously). */
  get yaRespondida(): boolean {
    return this.resultado() !== null || this.cita()?.paciente_confirmo != null;
  }

  responder(asistira: boolean): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.reservas.responderConfirmacion(this.token, asistira).pipe(
      catchError(() => of(null))
    ).subscribe(updated => {
      this.saving.set(false);
      if (updated) {
        this.cita.set(updated);
        this.resultado.set(asistira);
      }
    });
  }
}
