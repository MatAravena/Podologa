import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada';

export interface CitaAdmin {
  id: number;
  fecha: string;            // "YYYY-MM-DD"
  hora: string;             // "HH:MM:SS"
  duracion: number;
  estado: EstadoCita;
  paciente_nombre: string;
  paciente_email: string | null;
  paciente_telefono: string | null;
  servicio_nombre: string | null;
  precio_final: number | null;
  paciente_confirmo: boolean | null;
  confirmacion_48h_enviada: boolean;
  confirmacion_24h_enviada: boolean;
  sincronizada_calendar: boolean;
}

export interface CitasFiltro {
  desde?: string;           // "YYYY-MM-DD"
  hasta?: string;           // "YYYY-MM-DD"
  estado?: EstadoCita;
}

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /admin/citas — appointments for the admin agenda */
  listar(filtro: CitasFiltro = {}): Observable<CitaAdmin[]> {
    let params = new HttpParams();
    if (filtro.desde)  params = params.set('desde', filtro.desde);
    if (filtro.hasta)  params = params.set('hasta', filtro.hasta);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    return this.http.get<CitaAdmin[]>(`${this.base}/admin/citas`, { params });
  }
}
