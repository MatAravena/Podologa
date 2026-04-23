import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();

  readonly links = [
    { label: 'Servicios',    fragment: 'servicios'    },
    { label: 'Sobre mí',     fragment: 'sobre-mi'     },
    { label: 'Galería',      route: '/galeria'         },
    { label: 'Opiniones',    fragment: 'opiniones'    },
    { label: 'Reservar hora',route: '/reservas'       },
    { label: 'Dejar opinión',fragment: 'dejar-opinion'},
  ];

  readonly servicios = [
    'Podología',
    'Reiki',
    'Reflexología',
    'Esencias Florales',
    'Auriculoterapia',
    'Masajes Linfáticos',
    'Tuina',
  ];
}
