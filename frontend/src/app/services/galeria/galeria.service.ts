import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** A gallery post as returned by the backend (`GaleriaPostOut`). */
export interface GaleriaPost {
  id: number;
  titulo: string;
  descripcion: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  published: boolean;
  created_at: string;
}

/** Response of `POST /galeria/{id}/generar-caption`. */
export interface CaptionOut {
  caption: string;
  ai_generated: boolean;
}

@Injectable({ providedIn: 'root' })
export class GaleriaService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /galeria — list posts. */
  listar(): Observable<GaleriaPost[]> {
    return this.http.get<GaleriaPost[]>(`${this.base}/galeria`);
  }

  /** POST /galeria — upload a photo/video (multipart). Admin only. */
  subir(data: FormData): Observable<GaleriaPost> {
    return this.http.post<GaleriaPost>(`${this.base}/galeria`, data);
  }

  /** POST /galeria/{id}/generar-caption — AI caption draft. Admin only. */
  generarCaption(id: number, body: { tono: string | null; contexto_extra: string | null }): Observable<CaptionOut> {
    return this.http.post<CaptionOut>(`${this.base}/galeria/${id}/generar-caption`, body);
  }

  /** POST /galeria/{id}/publicar — publish to social networks. Admin only. */
  publicar(id: number, body: { caption: string | null }): Observable<GaleriaPost> {
    return this.http.post<GaleriaPost>(`${this.base}/galeria/${id}/publicar`, body);
  }

  /** DELETE /galeria/{id} — admin only. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/galeria/${id}`);
  }

  /** Resolve a (possibly relative) media URL against the API host. */
  mediaUrl(mediaUrl: string): string {
    if (mediaUrl.startsWith('http')) return mediaUrl;
    return `${this.base.replace('/api', '')}${mediaUrl}`;
  }
}
