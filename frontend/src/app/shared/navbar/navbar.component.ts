import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  PLATFORM_ID,
  afterNextRender,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminAuthService } from '../admin/admin-auth.service';

interface NavLink {
  label: string;
  fragment?: string;
  route?: string;
}

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  host: {
    '[class.navbar--scrolled]': 'scrolled()',
  },
})
export class NavbarComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly auth = inject(AdminAuthService);

  readonly scrolled    = signal(false);
  readonly menuOpen    = signal(false);

  readonly links: NavLink[] = [
    { label: 'Sobre mí',    fragment: 'sobre-mi'    },
    { label: 'Servicios',   fragment: 'servicios'   },
    { label: 'Opiniones',   fragment: 'opiniones'   },
    { label: 'Contacto',    fragment: 'contacto'    },
    { label: 'Galería',     route: '/galeria'        },
  ];

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser) return;
      const handler = () => this.scrolled.set(window.scrollY > 20);
      window.addEventListener('scroll', handler, { passive: true });
    });
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
