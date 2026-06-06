import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule }   from '@angular/material/button';
import { MatCardModule }     from '@angular/material/card';
import { MatIconModule }     from '@angular/material/icon';
import { MatInputModule }    from '@angular/material/input';
import { MatFormFieldModule} from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { OpinionesService, Opinion } from '../services/opiniones/opiniones.service';
import { ServiciosService, Servicio as ServicioApi } from '../services/servicios/servicios.service';
import { ContactoService }     from '../services/contacto/contacto.service';
import { AppIconComponent }    from '../shared/icon/app-icon.component';
import { resolveColor }        from '../shared/colors/brand-colors';
import { StarRatingComponent } from '../shared/star-rating/star-rating.component';

interface Servicio { nombre: string; descripcion: string; icono: string; color: string; }
interface Razon    { titulo: string; descripcion: string; icono: string; }
interface Stat     { valor: string; etiqueta: string; }

/** View model for an opinion card (derived from the backend `Opinion`). */
interface TestimonioView {
  id: number;
  nombre: string;
  apellido: string;
  fecha: string;
  calificacion: number;
  comentario: string;
  fotoUrl: string | null;
  servicios: string[];
}

/** At least 1 service must be checked */
function atLeastOneServicio(control: AbstractControl): ValidationErrors | null {
  const val: Record<string, boolean> = control.value ?? {};
  return Object.values(val).some(v => v) ? null : { required: true };
}

@Component({
  selector: 'app-home',
  imports: [
    AppIconComponent,
    RouterLink,
    NgOptimizedImage,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatSnackBarModule,
    StarRatingComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly fb       = inject(FormBuilder);
  private readonly snack    = inject(MatSnackBar);
  private readonly serviciosService = inject(ServiciosService);
  private readonly opinionesService = inject(OpinionesService);
  readonly contactoService          = inject(ContactoService);
  private readonly isBrowser   = isPlatformBrowser(inject(PLATFORM_ID));

  readonly servicioIds   = signal<Map<string, number>>(new Map());
  /** Reverse map id → service name, used to label opinion service tags. */
  private readonly serviciosPorId = signal<Map<number, string>>(new Map());

  // ── Servicios (real data from the backend) ───────────────────────
  /** Service cards, loaded from `GET /servicios` (empty while loading). */
  readonly servicios = signal<Servicio[]>([]);
  /** True until the first services response arrives (drives the skeleton). */
  readonly cargandoServicios = signal(true);

  readonly razones = signal<Razon[]>([
    { titulo: 'Profesional Certificada', descripcion: 'Más de 10 años de experiencia y formación continua en podología clínica y terapias complementarias.', icono: 'sobre_mi' },
    { titulo: 'Atención Personalizada',  descripcion: 'Cada paciente recibe un tratamiento adaptado a sus necesidades específicas y objetivos de salud.', icono: 'clientes' },
    { titulo: 'Ambiente Tranquilo',       descripcion: 'Un espacio cálido y acogedor diseñado para que te sientas en calma desde el primer momento.', icono: 'inicio' },
    { titulo: 'Horarios Flexibles',       descripcion: 'Horas adaptadas a tu rutina. Reserva online de manera rápida y sencilla las 24 horas.', icono: 'horarios' },
  ]);

  readonly stats = signal<Stat[]>([
    { valor: '+10',  etiqueta: 'Años de experiencia' },
    { valor: '+500', etiqueta: 'Pacientes atendidos' },
    { valor: '7',    etiqueta: 'Especialidades' },
    { valor: '100%', etiqueta: 'Dedicación' },
  ]);

  /** Service names for the review-form checkboxes, derived from loaded services. */
  readonly nombresServicios = computed(() => this.servicios().map(s => s.nombre));

  // ── Review form ───────────────────────────────────────────────────
  readonly calificacion = signal<number>(5);
  readonly fotoPreview  = signal<string | null>(null);
  readonly enviando     = signal(false);
  readonly enviado      = signal(false);

  /** Build a dynamic group with one checkbox control per service name. */
  private buildServiciosGroup(names: readonly string[]) {
    const group: Record<string, [boolean]> = {};
    for (const s of names) group[s] = [false];
    return this.fb.group(group, { validators: atLeastOneServicio });
  }

  readonly form = this.fb.group({
    nombre:   ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    comentario: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(600)]],
    serviciosGroup: this.buildServiciosGroup([]),
    // Optional
    email:    ['', [Validators.email]],
    telefono: ['', [Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)]],
  });

  /** Derived: which service names are checked */
  readonly serviciosSeleccionados = computed(() => {
    const vals = this.form.get('serviciosGroup')?.value as Record<string, boolean> ?? {};
    return Object.entries(vals).filter(([, v]) => v).map(([k]) => k);
  });

  // ── Opiniones (real data from the backend) ───────────────────────
  private readonly _opiniones = signal<Opinion[]>([]);

  /** Opinions mapped to the card view model, newest first. */
  readonly testimonios = computed<TestimonioView[]>(() => {
    const porId = this.serviciosPorId();
    return this._opiniones().map(op => ({
      id:           op.id,
      nombre:       op.nombre,
      apellido:     op.apellido,
      fecha:        op.created_at,
      calificacion: op.puntuacion,
      comentario:   op.texto,
      fotoUrl:      op.foto_url,
      servicios:    this.parseServicios(op.servicios_ids, porId),
    }));
  });

  readonly totalTestimonios = computed(() => this._opiniones().length);

  readonly promedioCalificacion = computed(() => {
    const list = this._opiniones();
    if (!list.length) return 0;
    return list.reduce((sum, op) => sum + op.puntuacion, 0) / list.length;
  });

  /** Parse the raw JSON `servicios_ids` into readable service names. */
  private parseServicios(raw: string | null, porId: Map<number, string>): string[] {
    if (!raw) return [];
    try {
      const ids = JSON.parse(raw) as number[];
      return ids.map(id => porId.get(id)).filter((n): n is string => !!n);
    } catch {
      return [];
    }
  }

  ngOnInit(): void {
    this.contactoService.load();
    if (!this.isBrowser) return;
    this.serviciosService.listar().pipe(
      catchError(() => of([] as ServicioApi[]))
    ).subscribe(list => {
      this.cargandoServicios.set(false);
      if (list.length === 0) return;
      const map   = new Map<string, number>();
      const byId  = new Map<number, string>();
      for (const s of list) { map.set(s.nombre, s.id); byId.set(s.id, s.nombre); }
      this.servicioIds.set(map);
      this.serviciosPorId.set(byId);
      this.servicios.set(list.map(s => ({
        nombre:      s.nombre,
        descripcion: s.descripcion ?? '',
        icono:       s.icono ?? 'bienestar',
        color:       resolveColor(s.icono_color),
      })));
      // Rebuild the review-form checkboxes to match the real service names.
      this.form.setControl('serviciosGroup', this.buildServiciosGroup(list.map(s => s.nombre)));
    });

    this.opinionesService.listar().pipe(
      catchError(() => of([] as Opinion[]))
    ).subscribe(list => this._opiniones.set(list));
  }

  servicioId(nombre: string): number | null {
    return this.servicioIds().get(nombre) ?? null;
  }

  // ── Photo upload ──────────────────────────────────────────────────
  onFotoChange(event: Event): void {
    if (!this.isBrowser) return;
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.snack.open('La foto no debe superar 2 MB.', 'OK', { duration: 4000 });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.fotoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeFoto(): void {
    this.fotoPreview.set(null);
  }

  // ── Submit ────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid || this.calificacion() === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);

    const v = this.form.getRawValue() as {
      nombre: string;
      apellido: string;
      comentario: string;
      serviciosGroup: Record<string, boolean>;
      email: string;
      telefono: string;
    };

    const serviciosIds = Object.entries(v.serviciosGroup)
      .filter(([, checked]) => checked)
      .map(([name]) => this.servicioId(name))
      .filter((id): id is number => id !== null);

    this.opinionesService.crear({
      nombre:        v.nombre.trim(),
      apellido:      v.apellido.trim(),
      texto:         v.comentario.trim(),
      puntuacion:    this.calificacion(),
      servicios_ids: serviciosIds,
      email:    v.email?.trim() || null,
      telefono: v.telefono?.trim() || null,
      foto_url: this.fotoPreview() ?? null,
    }).pipe(
      catchError(() => {
        this.enviando.set(false);
        this.snack.open('No pudimos guardar tu opinión. Inténtalo de nuevo.', 'Cerrar', { duration: 5000 });
        return of(null);
      })
    ).subscribe(opinion => {
      if (!opinion) return;
      this._opiniones.update(list => [opinion, ...list]);
      this.enviando.set(false);
      this.enviado.set(true);
      this.form.reset();
      this.calificacion.set(5);
      this.fotoPreview.set(null);

      this.snack.open('¡Gracias por tu opinión! Ya aparece en el sitio.', 'Cerrar', {
        duration: 5000,
        panelClass: ['snack-success'],
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  getServicioCtrl(name: string) {
    return this.form.get(`serviciosGroup.${name}`);
  }

  escribirOtraOpinion(): void {
    this.enviado.set(false);
  }
}
