import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { catchError, of }  from 'rxjs';
import { environment }     from '../../../environments/environment';

export interface ServicioDetalleApi {
  id: number;
  nombre: string;
  descripcion: string | null;
  subtitulo: string | null;
  descripcion_larga: string | null;
  fotos_urls: string | null;   // JSON array
  duracion: number;
  precio: string;
}

const ICONO_MAP: Record<string, string> = {
  'Podología':          'healing',
  'Reiki':              'spa',
  'Reflexología':       'self_improvement',
  'Esencias Florales':  'local_florist',
  'Auriculoterapia':    'hearing',
  'Masajes Linfáticos': 'water_drop',
  'Tuina':              'back_hand',
};

@Component({
  selector: 'app-servicio-detalle',
  imports: [RouterLink, DecimalPipe, MatButtonModule, MatIconModule],
  templateUrl: './servicio-detalle.component.html',
  styleUrl: './servicio-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioDetalleComponent implements OnInit {
  private readonly http  = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly servicio  = signal<ServicioDetalleApi | null>(null);
  readonly loading   = signal(true);
  readonly notFound  = signal(false);
  readonly fotos     = signal<string[]>([]);
  readonly lightbox  = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<ServicioDetalleApi>(`${environment.apiUrl}/servicios/${id}`).pipe(
      catchError(() => of(null))
    ).subscribe(s => {
      if (!s) { this.notFound.set(true); }
      else {
        this.servicio.set(s);
        this.fotos.set(s.fotos_urls ? JSON.parse(s.fotos_urls) : []);
      }
      this.loading.set(false);
    });
  }

  icono(nombre: string): string {
    return ICONO_MAP[nombre] ?? 'healing';
  }

  openLightbox(url: string): void { this.lightbox.set(url); }
  closeLightbox(): void           { this.lightbox.set(null); }
}
