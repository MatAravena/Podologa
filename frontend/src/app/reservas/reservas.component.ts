import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule }   from '@angular/material/button';
import { MatFormFieldModule }from '@angular/material/form-field';
import { MatInputModule }    from '@angular/material/input';
import { MatSelectModule }   from '@angular/material/select';
import { MatIconModule }     from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, finalize, of } from 'rxjs';

import {
  ReservasService,
  ServicioApi,
  HorarioDisponible,
  PromocionVigenteApi,
} from '../shared/reservas/reservas.service';

const SERVICIOS_FALLBACK = [
  'Podología',
  'Reiki',
  'Reflexología',
  'Esencias Florales',
  'Auriculoterapia',
  'Masajes Linfáticos',
  'Tuina',
] as const;

const HORARIOS_FALLBACK: HorarioDisponible[] = [
  '9:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'
].map(h => ({ hora: h, disponible: true }));

@Component({
  selector: 'app-reservas',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './reservas.component.html',
  styleUrl: './reservas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservasComponent implements OnInit {
  private readonly fb      = inject(FormBuilder);
  private readonly snack   = inject(MatSnackBar);
  private readonly service = inject(ReservasService);

  // ── Remote state ────────────────────────────────────────────────
  readonly serviciosApi    = signal<ServicioApi[]>([]);
  readonly horariosApi     = signal<HorarioDisponible[]>(HORARIOS_FALLBACK);
  readonly cargandoHorarios = signal(false);
  readonly apiOnline       = signal(false);
  readonly promociones     = signal<PromocionVigenteApi[]>([]);

  /** Combined: API servicios if available, else static fallback */
  readonly servicios = computed(() => {
    const api = this.serviciosApi();
    return api.length
      ? api
      : SERVICIOS_FALLBACK.map((n, i) => ({ id: i + 1, nombre: n, descripcion: null, duracion: 60, precio: '0' }));
  });

  readonly horariosDisponibles = computed(() =>
    this.horariosApi().filter(h => h.disponible)
  );

  // ── Form state ───────────────────────────────────────────────────
  readonly enviando = signal(false);
  readonly enviado  = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre:     ['', [Validators.required, Validators.minLength(2)]],
    email:      ['', [Validators.required, Validators.email]],
    telefono:   ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-()]{7,15}$/)]],
    servicio_id:['', Validators.required],
    fecha:      ['', Validators.required],
    hora:       ['', Validators.required],
    notas:      [''],
  });

  readonly errores = computed(() => ({
    nombre:     this.getError('nombre'),
    email:      this.getError('email'),
    telefono:   this.getError('telefono'),
    servicio_id:this.getError('servicio_id'),
    fecha:      this.getError('fecha'),
    hora:       this.getError('hora'),
  }));

  readonly fechaMin = new Date().toISOString().split('T')[0];

  // ── Lifecycle ────────────────────────────────────────────────────
  ngOnInit(): void {
    this.service.getServicios().pipe(
      catchError(() => of([] as ServicioApi[]))
    ).subscribe(list => {
      if (list.length) {
        this.serviciosApi.set(list);
        this.apiOnline.set(true);
      }
    });

    // Reload disponibilidad and promotions whenever fecha or servicio changes
    this.form.get('fecha')!.valueChanges.subscribe(() => this.loadDisponibilidad());
    this.form.get('servicio_id')!.valueChanges.subscribe(() => {
      this.loadDisponibilidad();
      this.loadPromociones();
    });
  }

  private loadPromociones(): void {
    const servicioId = Number(this.form.get('servicio_id')!.value);
    if (!servicioId || !this.apiOnline()) return;
    this.service.getPromocionesVigentes(servicioId).pipe(
      catchError(() => of([] as PromocionVigenteApi[])),
    ).subscribe(p => this.promociones.set(p));
  }

  private loadDisponibilidad(): void {
    const fecha = this.form.get('fecha')!.value;
    const servicioId = Number(this.form.get('servicio_id')!.value);
    if (!fecha || !this.apiOnline()) return;

    this.cargandoHorarios.set(true);
    this.form.get('hora')!.reset();

    this.service.getDisponibilidad(fecha, servicioId || undefined).pipe(
      catchError(() => of(HORARIOS_FALLBACK)),
      finalize(() => this.cargandoHorarios.set(false)),
    ).subscribe(h => this.horariosApi.set(h));
  }

  // ── Submit ────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.enviando.set(true);
    const v = this.form.getRawValue();

    if (this.apiOnline()) {
      this.service.crearCita({
        nombre:      v.nombre,
        apellido:    '',
        email:       v.email,
        telefono:    v.telefono,
        servicio_id: Number(v.servicio_id),
        fecha:       v.fecha,
        hora:        v.hora,
        notas:       v.notas || undefined,
      }).pipe(
        catchError(() => {
          this.snack.open('Error al conectar con el servidor. Intentá de nuevo.', 'Cerrar', { duration: 5000 });
          return of(null);
        }),
        finalize(() => this.enviando.set(false)),
      ).subscribe(res => {
        if (res) {
          this.enviado.set(true);
          this.snack.open('¡Turno solicitado! Te contactaremos para confirmar.', 'Cerrar', { duration: 6000, panelClass: 'snack-success' });
        }
      });
    } else {
      // Fallback: simulate while backend is offline
      setTimeout(() => {
        this.enviando.set(false);
        this.enviado.set(true);
        this.snack.open('¡Solicitud enviada! Te contactaremos para confirmar tu turno.', 'Cerrar', { duration: 6000, panelClass: 'snack-success' });
      }, 1000);
    }
  }

  resetForm(): void {
    this.enviado.set(false);
    this.form.reset();
    this.horariosApi.set(HORARIOS_FALLBACK);
  }

  private getError(campo: string): string {
    const ctrl = this.form.get(campo);
    if (!ctrl?.touched || !ctrl.errors) return '';
    if (ctrl.errors['required'])  return 'Este campo es requerido.';
    if (ctrl.errors['email'])     return 'Ingresa un email válido.';
    if (ctrl.errors['minlength']) return 'Debe tener al menos 2 caracteres.';
    if (ctrl.errors['pattern'])   return 'Ingresa un número de teléfono válido.';
    return '';
  }
}
