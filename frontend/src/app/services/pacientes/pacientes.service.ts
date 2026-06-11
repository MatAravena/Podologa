import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** A clinical note (`NotaPacienteOut`). */
export interface Nota {
  id: number;
  paciente_id: number;
  cita_id: number | null;
  contenido: string;
  tipo: string;
  visible_paciente: boolean;
  created_at: string;
  updated_at: string;
}

/** A patient summary (`PacienteOut`). */
export interface Paciente {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  access_token: string | null;
  created_at: string;
}

/** A patient with their full clinical-note log. */
export interface PacienteDetalle extends Paciente {
  notas_clinicas: Nota[];
}

/** Body for creating/updating a patient. Only `nombre` is required. */
export interface PacienteInput {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  notas?: string | null;
}

/** Body for creating/updating a note. */
export interface NotaInput {
  contenido: string;
  tipo: string;
  visible_paciente: boolean;
}

/** A note as exposed in the public patient portal. */
export interface NotaPortal {
  id: number;
  contenido: string;
  tipo: string;
  visible_paciente: boolean;
  created_at: string;
}

/** The public portal payload (`GET /pacientes/{token}/perfil`). */
export interface Portal {
  nombre: string;
  notas_clinicas: NotaPortal[];
}

/** Channel for a manual patient notification. */
export type CanalNotificacion = 'email' | 'whatsapp';

/** Body for `POST /admin/pacientes/{id}/notificar`. */
export interface NotificarInput {
  canales: CanalNotificacion[];
  incluir_notas: boolean;
  proxima_cita: string | null; // ISO date (YYYY-MM-DD) or null
}

/** Per-channel outcome (`CanalResultado`). */
export interface CanalResultado {
  canal: CanalNotificacion;
  enviado: boolean;
  detalle: string;
}

/** Response of `POST /admin/pacientes/{id}/notificar`. */
export interface NotificarResponse {
  resultados: CanalResultado[];
}

@Injectable({ providedIn: 'root' })
export class PacientesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET /admin/pacientes — admin list. */
  listar(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(`${this.base}/admin/pacientes`);
  }

  /** GET /admin/pacientes/{id} — full profile with notes. */
  obtener(id: number): Observable<PacienteDetalle> {
    return this.http.get<PacienteDetalle>(`${this.base}/admin/pacientes/${id}`);
  }

  /** POST /admin/pacientes — create a patient manually (walk-in). */
  crear(body: PacienteInput): Observable<Paciente> {
    return this.http.post<Paciente>(`${this.base}/admin/pacientes`, body);
  }

  /** PATCH /admin/pacientes/{id} — edit a patient's data. */
  actualizar(id: number, body: Partial<PacienteInput>): Observable<Paciente> {
    return this.http.patch<Paciente>(`${this.base}/admin/pacientes/${id}`, body);
  }

  /** DELETE /admin/pacientes/{id} — remove a patient (cascades citas + notas). */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/pacientes/${id}`);
  }

  /** POST /admin/pacientes/{id}/notas — add a clinical note. */
  crearNota(pacienteId: number, body: NotaInput): Observable<Nota> {
    return this.http.post<Nota>(`${this.base}/admin/pacientes/${pacienteId}/notas`, body);
  }

  /** PATCH /admin/pacientes/{id}/notas/{notaId} — edit a note. */
  actualizarNota(pacienteId: number, notaId: number, body: NotaInput): Observable<Nota> {
    return this.http.patch<Nota>(`${this.base}/admin/pacientes/${pacienteId}/notas/${notaId}`, body);
  }

  /** DELETE /admin/pacientes/{id}/notas/{notaId}. */
  eliminarNota(pacienteId: number, notaId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/pacientes/${pacienteId}/notas/${notaId}`);
  }

  /** POST /admin/pacientes/{id}/generar-token — (re)generate the portal token. */
  generarToken(pacienteId: number): Observable<Paciente> {
    return this.http.post<Paciente>(`${this.base}/admin/pacientes/${pacienteId}/generar-token`, {});
  }

  /** GET /pacientes/{token}/perfil — public portal access (no login). */
  perfilPublico(token: string): Observable<Portal> {
    return this.http.get<Portal>(`${this.base}/pacientes/${token}/perfil`);
  }

  /** POST /admin/pacientes/{id}/notificar — manually send notes / next-date to the patient. */
  notificar(pacienteId: number, body: NotificarInput): Observable<NotificarResponse> {
    return this.http.post<NotificarResponse>(
      `${this.base}/admin/pacientes/${pacienteId}/notificar`,
      body,
    );
  }
}
