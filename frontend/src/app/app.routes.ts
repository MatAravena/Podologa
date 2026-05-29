import { Routes } from '@angular/router';
import { adminAuthGuard } from './shared/admin/admin-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'reservas',
    loadComponent: () =>
      import('./reservas/reservas.component').then((m) => m.ReservasComponent),
  },
  {
    path: 'galeria',
    loadComponent: () =>
      import('./galeria/galeria.component').then((m) => m.GaleriaComponent),
  },
  {
    path: 'servicios/:id',
    loadComponent: () =>
      import('./servicios/detalle/servicio-detalle.component').then((m) => m.ServicioDetalleComponent),
  },
  // ── Admin ────────────────────────────────────────────────────────────────────
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin/opiniones',
    loadComponent: () =>
      import('./admin/opiniones/admin-opiniones.component').then((m) => m.AdminOpinionesComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'admin/galeria',
    loadComponent: () =>
      import('./admin/galeria/admin-galeria.component').then((m) => m.AdminGaleriaComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'admin/disponibilidad',
    loadComponent: () =>
      import('./admin/disponibilidad/admin-disponibilidad.component').then((m) => m.AdminDisponibilidadComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'admin/promociones',
    loadComponent: () =>
      import('./admin/promociones/admin-promociones.component').then((m) => m.AdminPromocionesComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'admin/servicios',
    loadComponent: () =>
      import('./admin/servicios/admin-servicios.component').then((m) => m.AdminServiciosComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'admin',
    redirectTo: 'admin/opiniones',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
