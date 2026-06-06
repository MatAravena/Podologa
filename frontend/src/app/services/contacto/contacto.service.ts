import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Public contact details (`GET /config/contacto`). */
export interface Contacto {
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
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

  /** Loads the contact config once; safe to call repeatedly. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<Contacto>(`${this.base}/config/contacto`).pipe(
      catchError(() => of(null)),
    ).subscribe(c => this.contacto.set(c));
  }
}
