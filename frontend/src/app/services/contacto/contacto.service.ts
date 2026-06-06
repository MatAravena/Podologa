import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

/** A single open/close window. */
export interface Horario {
  open: string;
  close: string;
}

/** Weekly opening hours as stored in `config/app.json`. */
export interface BusinessHours {
  monday_friday?: Horario | null;
  saturday?: Horario | null;
  sunday?: Horario | null;
}

/** Public contact details (`GET /config/contacto`). */
export interface Contacto {
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  business_hours: BusinessHours | null;
}

@Injectable({ providedIn: 'root' })
export class ContactoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Loaded contact details, or null until loaded / on failure. */
  readonly contacto = signal<Contacto | null>(null);
  private loaded = false;

  /** WhatsApp deep-link built from the phone (digits only). */
  readonly whatsappUrl = computed(() => {
    const phone = this.contacto()?.phone ?? '';
    const digits = phone.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  });

  /** Instagram handle without the leading "@". */
  readonly instagramHandle = computed(() => (this.contacto()?.instagram ?? '').replace(/^@/, ''));

  /** Full Instagram profile URL. */
  readonly instagramUrl = computed(() => {
    const handle = this.instagramHandle();
    return handle ? `https://instagram.com/${handle}` : 'https://instagram.com/';
  });

  /** Full Facebook page URL. */
  readonly facebookUrl = computed(() => {
    const fb = this.contacto()?.facebook ?? '';
    return fb ? `https://facebook.com/${fb}` : 'https://facebook.com/';
  });

  /** Opening hours formatted for display, e.g. `{ dias: 'Lunes a Viernes', horario: '09:00 – 19:00' }`. */
  readonly horarios = computed<{ dias: string; horario: string }[]>(() => {
    const bh = this.contacto()?.business_hours ?? null;
    if (!bh) return [];
    const fmt = (h?: Horario | null) => (h ? `${h.open} – ${h.close}` : null);
    const out: { dias: string; horario: string }[] = [];
    const mf = fmt(bh.monday_friday); if (mf) out.push({ dias: 'Lunes a Viernes', horario: mf });
    const sa = fmt(bh.saturday);      if (sa) out.push({ dias: 'Sábados',          horario: sa });
    const su = fmt(bh.sunday);        if (su) out.push({ dias: 'Domingos',         horario: su });
    return out;
  });

  /** Loads the contact config once; safe to call repeatedly. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<Contacto>(`${this.base}/config/contacto`).pipe(
      catchError(() => of(null)),
    ).subscribe(c => this.contacto.set(c));
  }
}
