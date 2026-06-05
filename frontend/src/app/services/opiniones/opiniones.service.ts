import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Shape returned by the backend (`OpinionOut`). */
export interface Opinion {
  id: number;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  foto_url: string | null;
  texto: string;
  puntuacion: number;
  servicios_ids: string | null;   // raw JSON text: array of service ids
  created_at: string;
  updated_at: string;
}

/** Payload accepted by `POST /opiniones` (`OpinionCreate`). */
export interface OpinionCreatePayload {
  nombre: string;
  apellido: string;
  texto: string;
  puntuacion: number;
  servicios_ids?: number[];
  email?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
}

/** Fields editable from the admin panel (`OpinionUpdate`). */
export interface OpinionUpdatePayload {
  nombre?: string;
  apellido?: string;
  email?: string | null;
  texto?: string;
  puntuacion?: number;
}

@Injectable({ providedIn: 'root' })
export class OpinionesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /opiniones — public list, newest first. */
  listar(): Observable<Opinion[]> {
    return this.http.get<Opinion[]>(`${this.base}/opiniones`);
  }

  /** POST /opiniones — public; a visitor leaves a review. */
  crear(payload: OpinionCreatePayload): Observable<Opinion> {
    return this.http.post<Opinion>(`${this.base}/opiniones`, payload);
  }

  /** PATCH /opiniones/{id} — admin only. */
  actualizar(id: number, payload: OpinionUpdatePayload): Observable<Opinion> {
    return this.http.patch<Opinion>(`${this.base}/opiniones/${id}`, payload);
  }

  /** DELETE /opiniones/{id} — admin only. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/opiniones/${id}`);
  }
}
