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
} from '../services/reservas/reservas.service';
import { ContactoService } from '../services/contacto/contacto.service';
import { DisponibilidadService } from '../services/disponibilidad/disponibilidad.service';

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
  readonly contactoService = inject(ContactoService);
  readonly disponibilidadService = inject(DisponibilidadService);

  // ── Remote state (all from the backend) ──────────────────────────
  readonly serviciosApi     = signal<ServicioApi[]>([]);
  readonly cargandoServicios = signal(true);
  readonly horariosApi      = signal<HorarioDisponible[]>([]);
  readonly cargandoHorarios = signal(false);
  readonly promociones      = signal<PromocionVigenteApi[]>([]);

  /** Services loaded from `GET /servicios` (empty while loading / on failure). */
  readonly servicios = computed(() => this.serviciosApi());

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
    this.contactoService.load();
    this.disponibilidadService.loadHorarioSemana();
    this.service.getServicios().pipe(
      catchError(() => of([] as ServicioApi[])),
      finalize(() => this.cargandoServicios.set(false)),
    ).subscribe(list => this.serviciosApi.set(list));

    // Reload disponibilidad and promotions whenever fecha or servicio changes
    this.form.get('fecha')!.valueChanges.subscribe(() => this.loadDisponibilidad());
    this.form.get('servicio_id')!.valueChanges.subscribe(() => {
      this.loadDisponibilidad();
      this.loadPromociones();
    });
  }

  private loadPromociones(): void {
    const servicioId = Number(this.form.get('servicio_id')!.value);
    if (!servicioId) return;
    this.service.getPromocionesVigentes(servicioId).pipe(
      catchError(() => of([] as PromocionVigenteApi[])),
    ).subscribe(p => this.promociones.set(p));
  }

  private loadDisponibilidad(): void {
    const fecha = this.form.get('fecha')!.value;
    const servicioId = Number(this.form.get('servicio_id')!.value);
    if (!fecha) return;

    this.cargandoHorarios.set(true);
    this.form.get('hora')!.reset();

    this.service.getDisponibilidad(fecha, servicioId || undefined).pipe(
      catchError(() => of([] as HorarioDisponible[])),
      finalize(() => this.cargandoHorarios.set(false)),
    ).subscribe(h => this.horariosApi.set(h));
  }

  // ── Submit ────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.enviando.set(true);
    const v = this.form.getRawValue();

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
  }

  resetForm(): void {
    this.enviado.set(false);
    this.form.reset();
    this.horariosApi.set([]);
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
