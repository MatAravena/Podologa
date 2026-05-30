import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Home is fully static — prerender it for instant first paint
  { path: '', renderMode: RenderMode.Prerender },

  // These routes fetch live API data; render client-side to avoid SSR localhost restrictions
  { path: 'reservas',            renderMode: RenderMode.Client },
  { path: 'galeria',             renderMode: RenderMode.Client },
  { path: 'admin/login',         renderMode: RenderMode.Client },
  { path: 'admin/opiniones',     renderMode: RenderMode.Client },
  { path: 'admin/galeria',       renderMode: RenderMode.Client },
  { path: 'admin/disponibilidad',renderMode: RenderMode.Client },
  { path: 'admin/promociones',   renderMode: RenderMode.Client },
  { path: 'admin/servicios',     renderMode: RenderMode.Client },
  { path: 'servicios/:id',       renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Client },
];
