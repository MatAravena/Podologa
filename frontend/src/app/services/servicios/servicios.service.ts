import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** A service as returned by the backend (`ServicioOut`). */
export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  subtitulo: string | null;
  descripcion_larga: string | null;
  fotos_urls: string | null;   // raw JSON array of photo URLs
  icono: string | null;
  icono_color: string | null;
  duracion: number;            // minutes
  precio: number;              // Chilean pesos, integer
}

/** Payload for `POST /servicios`. */
export interface ServicioCreate {
  nombre: string;
  descripcion?: string | null;
  subtitulo?: string | null;
  descripcion_larga?: string | null;
  icono?: string | null;
  icono_color?: string | null;
  duracion: number;
  precio: number;
}

/** Payload for `PATCH /servicios/{id}`. */
export type ServicioUpdate = Partial<ServicioCreate>;

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /servicios — full list. */
  listar(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(`${this.base}/servicios`);
  }

  /** GET /servicios/{id} — single service detail. */
  obtener(id: number | string): Observable<Servicio> {
    return this.http.get<Servicio>(`${this.base}/servicios/${id}`);
  }

  /** POST /servicios — admin only. */
  crear(payload: ServicioCreate): Observable<Servicio> {
    return this.http.post<Servicio>(`${this.base}/servicios`, payload);
  }

  /** PATCH /servicios/{id} — admin only. */
  actualizar(id: number, payload: ServicioUpdate): Observable<Servicio> {
    return this.http.patch<Servicio>(`${this.base}/servicios/${id}`, payload);
  }

  /** DELETE /servicios/{id} — admin only. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/servicios/${id}`);
  }

  /** POST /servicios/{id}/fotos — upload a photo (multipart). Returns the updated service. */
  subirFoto(id: number, file: File): Observable<Servicio> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Servicio>(`${this.base}/servicios/${id}/fotos`, fd);
  }

  /** DELETE /servicios/{id}/fotos/{index} — remove a photo by index. Returns the updated service. */
  eliminarFoto(id: number, index: number): Observable<Servicio> {
    return this.http.delete<Servicio>(`${this.base}/servicios/${id}/fotos/${index}`);
  }
}
