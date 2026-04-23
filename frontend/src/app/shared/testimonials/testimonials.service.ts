import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Testimonio {
  id: string;
  nombre: string;
  apellido: string;
  servicios: string[];
  comentario: string;
  calificacion: number;     // 0.5 – 5 in 0.5 increments
  fecha: string;            // ISO date string
  // Optional fields
  email?: string;
  telefono?: string;
  fotoUrl?: string;         // base64 data-URL
}

const STORAGE_KEY = 'libelula_testimonios';

/** Seed data shown before any real reviews come in */
const SEED: Testimonio[] = [
  {
    id: 'seed-1',
    nombre: 'Valentina',
    apellido: 'Rojas',
    servicios: ['Podología', 'Reflexología'],
    comentario:
      'Increíble experiencia. Llegué con un dolor crónico en los pies y después de tres sesiones la mejoría fue notable. El ambiente es muy tranquilo y la atención, impecable.',
    calificacion: 5,
    fecha: '2026-03-15',
  },
  {
    id: 'seed-2',
    nombre: 'Martín',
    apellido: 'Suárez',
    servicios: ['Reiki', 'Masajes Linfáticos'],
    comentario:
      'Vine por recomendación de una amiga y quedé encantado. El Reiki fue una experiencia completamente nueva para mí y salí sintiéndome renovado. Muy recomendable.',
    calificacion: 4.5,
    fecha: '2026-03-28',
  },
  {
    id: 'seed-3',
    nombre: 'Lucía',
    apellido: 'Fernández',
    servicios: ['Esencias Florales', 'Auriculoterapia'],
    comentario:
      'La profesional es muy dedicada y explica todo con paciencia. Las esencias florales me ayudaron mucho en un momento difícil. Totalmente recomendable.',
    calificacion: 5,
    fecha: '2026-04-01',
  },
];

@Injectable({ providedIn: 'root' })
export class TestimonialsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _testimonios = signal<Testimonio[]>(this.loadFromStorage());

  /** All testimonials sorted newest-first */
  readonly testimonios = computed(() =>
    [...this._testimonios()].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )
  );

  /** Average rating across all testimonials */
  readonly promedioCalificacion = computed(() => {
    const list = this._testimonios();
    if (!list.length) return 0;
    return list.reduce((sum, t) => sum + t.calificacion, 0) / list.length;
  });

  /** Total count */
  readonly totalTestimonios = computed(() => this._testimonios().length);

  agregar(data: Omit<Testimonio, 'id' | 'fecha'>): void {
    const nuevo: Testimonio = {
      ...data,
      id: `t-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
    };
    this._testimonios.update(list => [...list, nuevo]);
    this.saveToStorage();
  }

  private loadFromStorage(): Testimonio[] {
    if (!this.isBrowser) return [...SEED];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [...SEED];
      const parsed = JSON.parse(raw) as Testimonio[];
      return parsed.length ? parsed : [...SEED];
    } catch {
      return [...SEED];
    }
  }

  private saveToStorage(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._testimonios()));
    } catch {
      // quota exceeded — silently ignore
    }
  }
}
