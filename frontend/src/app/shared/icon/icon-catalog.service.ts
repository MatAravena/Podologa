import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

interface IconManifest {
  icons: string[];
}

/**
 * Loads the list of available custom SVG icons from
 * /assets/icons/manifest.json (generated at build time from the 32px folder).
 */
@Injectable({ providedIn: 'root' })
export class IconCatalogService {
  private readonly http = inject(HttpClient);

  readonly icons = signal<string[]>([]);
  private loaded = false;

  /** Loads the manifest once; safe to call repeatedly. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<IconManifest>('/assets/icons/manifest.json').pipe(
      catchError(() => of({ icons: [] } as IconManifest)),
      tap((m) => this.icons.set(m.icons ?? [])),
    ).subscribe();
  }
}
