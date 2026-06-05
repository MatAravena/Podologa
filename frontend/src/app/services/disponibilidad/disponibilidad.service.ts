import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** A weekly or date-specific availability block (`BloqueDisponibilidadOut`). */
export interface Bloque {
  id: number;
  dia_semana: number | null;
  fecha_especifica: string | null;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  created_at: string;
}

/** A fully-blocked date (`FechaBloqueoOut`). */
export interface Bloqueo {
  id: number;
  fecha: string;
  motivo: string | null;
  activo: boolean;
  created_at: string;
}

/** Payload for `POST /admin/disponibilidad/bloques`. */
export interface BloqueCreate {
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  dia_semana?: number;
  fecha_especifica?: string;
}

/** Payload for `POST /admin/disponibilidad/bloqueos`. */
export interface BloqueoCreate {
  fecha: string;
  motivo: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /admin/disponibilidad/bloques. */
  listarBloques(): Observable<Bloque[]> {
    return this.http.get<Bloque[]>(`${this.base}/admin/disponibilidad/bloques`);
  }

  /** GET /admin/disponibilidad/bloqueos. */
  listarBloqueos(): Observable<Bloqueo[]> {
    return this.http.get<Bloqueo[]>(`${this.base}/admin/disponibilidad/bloqueos`);
  }

  /** POST /admin/disponibilidad/bloques. */
  crearBloque(payload: BloqueCreate): Observable<Bloque> {
    return this.http.post<Bloque>(`${this.base}/admin/disponibilidad/bloques`, payload);
  }

  /** DELETE /admin/disponibilidad/bloques/{id}. */
  eliminarBloque(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/disponibilidad/bloques/${id}`);
  }

  /** POST /admin/disponibilidad/bloqueos. */
  crearBloqueo(payload: BloqueoCreate): Observable<Bloqueo> {
    return this.http.post<Bloqueo>(`${this.base}/admin/disponibilidad/bloqueos`, payload);
  }

  /** DELETE /admin/disponibilidad/bloqueos/{id}. */
  eliminarBloqueo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/disponibilidad/bloqueos/${id}`);
  }
}
