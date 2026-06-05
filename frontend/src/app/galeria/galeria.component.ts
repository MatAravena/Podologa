import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { GaleriaService, GaleriaPost } from '../services/galeria/galeria.service';

/** Re-exported so admin/galeria and the specs keep a single import site. */
export type GaleriaPostApi = GaleriaPost;

@Component({
  selector: 'app-galeria',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './galeria.component.html',
  styleUrl: './galeria.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GaleriaComponent implements OnInit {
  private readonly galeriaService = inject(GaleriaService);

  readonly posts    = signal<GaleriaPost[]>([]);
  readonly loading  = signal(true);
  readonly selected = signal<GaleriaPost | null>(null);

  ngOnInit(): void {
    this.galeriaService.listar().pipe(
      catchError(() => of([] as GaleriaPost[]))
    ).subscribe(list => {
      this.posts.set(list);
      this.loading.set(false);
    });
  }

  openLightbox(post: GaleriaPost): void {
    this.selected.set(post);
  }

  closeLightbox(): void {
    this.selected.set(null);
  }

  mediaUrl(post: GaleriaPost): string {
    return this.galeriaService.mediaUrl(post.media_url);
  }
}
