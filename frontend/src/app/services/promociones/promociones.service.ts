import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Servicio } from '../servicios/servicios.service';

/** A promotion as returned by the backend (`PromocionOut`). */
export interface Promocion {
  id: number;
  servicio_id: number | null;
  porcentaje_descuento: number;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  activo: boolean;
  created_at: string;
  servicio: Servicio | null;   // embedded; null when the promo is global
}

/** Payload for `POST /promociones`. */
export interface PromocionCreate {
  servicio_id: number | null;
  porcentaje_descuento: string | number;
  descripcion?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
}

/** Payload for `PATCH /promociones/{id}` (e.g. toggling `activo`). */
export type PromocionUpdate = Partial<PromocionCreate> & { activo?: boolean };

@Injectable({ providedIn: 'root' })
export class PromocionesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /promociones — admin list of all promotions. */
  listar(): Observable<Promocion[]> {
    return this.http.get<Promocion[]>(`${this.base}/promociones`);
  }

  /** GET /promociones/vigentes?servicio_id=N — public, currently-active promos. */
  vigentes(servicioId?: number): Observable<Promocion[]> {
    let params = new HttpParams();
    if (servicioId) params = params.set('servicio_id', servicioId);
    return this.http.get<Promocion[]>(`${this.base}/promociones/vigentes`, { params });
  }

  /** POST /promociones — admin only. */
  crear(payload: PromocionCreate): Observable<Promocion> {
    return this.http.post<Promocion>(`${this.base}/promociones`, payload);
  }

  /** PATCH /promociones/{id} — admin only. */
  actualizar(id: number, payload: PromocionUpdate): Observable<Promocion> {
    return this.http.patch<Promocion>(`${this.base}/promociones/${id}`, payload);
  }

  /** DELETE /promociones/{id} — admin only. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/promociones/${id}`);
  }
}
