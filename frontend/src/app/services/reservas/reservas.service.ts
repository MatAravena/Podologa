import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ServicioApi {
  id: number;
  nombre: string;
  descripcion: string | null;
  duracion: number;    // minutes
  precio: string;
}

export interface HorarioDisponible {
  hora: string;         // "HH:MM"
  disponible: boolean;
}

export interface CitaPayload {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  servicio_id: number;
  fecha: string;        // "YYYY-MM-DD"
  hora: string;         // "HH:MM"
  notas?: string;
}

export interface CitaResponse {
  id: number;
  fecha: string;
  hora: string;
  estado: string;
  servicio: ServicioApi;
}

export interface ConfirmacionApi {
  servicio: string;
  fecha: string;          // "YYYY-MM-DD"
  hora: string;           // "HH:MM"
  estado: string;
  paciente_confirmo: boolean | null;
  paciente_nombre: string;
}

export interface PromocionVigenteApi {
  id: number;
  servicio_id: number;
  porcentaje_descuento: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  hora_fin: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /servicios */
  getServicios(): Observable<ServicioApi[]> {
    return this.http.get<ServicioApi[]>(`${this.base}/servicios`);
  }

  /** GET /disponibilidad?fecha=YYYY-MM-DD&servicio_id=N */
  getDisponibilidad(fecha: string, servicioId?: number): Observable<HorarioDisponible[]> {
    let params = new HttpParams().set('fecha', fecha);
    if (servicioId) params = params.set('servicio_id', servicioId);
    return this.http.get<HorarioDisponible[]>(`${this.base}/disponibilidad`, { params });
  }

  /** POST /citas */
  crearCita(payload: CitaPayload): Observable<CitaResponse> {
    return this.http.post<CitaResponse>(`${this.base}/citas`, payload);
  }

  /** GET /promociones/vigentes?servicio_id=N */
  getPromocionesVigentes(servicioId?: number): Observable<PromocionVigenteApi[]> {
    let params = new HttpParams();
    if (servicioId) params = params.set('servicio_id', servicioId);
    return this.http.get<PromocionVigenteApi[]>(`${this.base}/promociones/vigentes`, { params });
  }

  /** GET /citas/confirmar/:token — details for the public confirmation page */
  getConfirmacion(token: string): Observable<ConfirmacionApi> {
    return this.http.get<ConfirmacionApi>(`${this.base}/citas/confirmar/${token}`);
  }

  /** POST /citas/confirmar/:token — patient confirms (true) or cancels (false) */
  responderConfirmacion(token: string, asistira: boolean): Observable<ConfirmacionApi> {
    return this.http.post<ConfirmacionApi>(`${this.base}/citas/confirmar/${token}`, { asistira });
  }
}
