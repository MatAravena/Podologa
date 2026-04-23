import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GaleriaPostApi {
  id: number;
  titulo: string;
  descripcion: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  published: boolean;
  created_at: string;
}

@Component({
  selector: 'app-galeria',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './galeria.component.html',
  styleUrl: './galeria.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GaleriaComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly posts    = signal<GaleriaPostApi[]>([]);
  readonly loading  = signal(true);
  readonly selected = signal<GaleriaPostApi | null>(null);

  readonly apiUrl = environment.apiUrl;

  ngOnInit(): void {
    this.http.get<GaleriaPostApi[]>(`${this.apiUrl}/galeria`).pipe(
      catchError(() => of([] as GaleriaPostApi[]))
    ).subscribe(list => {
      this.posts.set(list);
      this.loading.set(false);
    });
  }

  openLightbox(post: GaleriaPostApi): void {
    this.selected.set(post);
  }

  closeLightbox(): void {
    this.selected.set(null);
  }

  mediaUrl(post: GaleriaPostApi): string {
    if (post.media_url.startsWith('http')) return post.media_url;
    return `${this.apiUrl.replace('/api', '')}${post.media_url}`;
  }
}
