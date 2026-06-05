import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { catchError, of }  from 'rxjs';
import { AppIconComponent } from '../shared/icon/app-icon.component';
import { resolveColor }     from '../shared/colors/brand-colors';
import { ServiciosService, Servicio } from '../services/servicios/servicios.service';

/** Re-exported for the component spec. */
export type ServicioApi = Servicio;

@Component({
  selector: 'app-servicios',
  imports: [RouterLink, DecimalPipe, MatButtonModule, MatIconModule, AppIconComponent],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiciosComponent implements OnInit {
  private readonly serviciosService = inject(ServiciosService);
  private readonly route = inject(ActivatedRoute);

  readonly servicio  = signal<Servicio | null>(null);
  readonly loading   = signal(true);
  readonly notFound  = signal(false);
  readonly fotos     = signal<string[]>([]);
  readonly lightbox  = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.serviciosService.obtener(id!).pipe(
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

  readonly resolveColor = resolveColor;

  openLightbox(url: string): void { this.lightbox.set(url); }
  closeLightbox(): void           { this.lightbox.set(null); }
}
