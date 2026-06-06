import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { ContactoService } from '../../services/contacto/contacto.service';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { DisponibilidadService } from '../../services/disponibilidad/disponibilidad.service';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly contactoService = inject(ContactoService);
  private readonly serviciosService = inject(ServiciosService);
  readonly disponibilidadService = inject(DisponibilidadService);
  readonly year = new Date().getFullYear();

  /** Service names loaded from the backend (empty until loaded). */
  readonly servicios = signal<string[]>([]);

  constructor() {
    this.contactoService.load();
    this.disponibilidadService.loadHorarioSemana();
    this.serviciosService.listar().pipe(
      catchError(() => of([])),
    ).subscribe(list => this.servicios.set(list.map(s => s.nombre)));
  }

  readonly links = [
    { label: 'Servicios',    fragment: 'servicios'    },
    { label: 'Sobre mí',     fragment: 'sobre-mi'     },
    { label: 'Galería',      route: '/galeria'         },
    { label: 'Opiniones',    fragment: 'opiniones'    },
    { label: 'Reservar hora',route: '/reservas'       },
    { label: 'Dejar opinión',fragment: 'dejar-opinion'},
  ];
}
