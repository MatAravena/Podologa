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
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
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

import { TestimonialsService } from '../shared/testimonials/testimonials.service';
import { StarRatingComponent } from '../shared/star-rating/star-rating.component';

interface Servicio { nombre: string; descripcion: string; icono: string; }
interface ServicioApiMin { id: number; nombre: string; }
interface Razon    { titulo: string; descripcion: string; icono: string; }
interface Stat     { valor: string; etiqueta: string; }

/** At least 1 service must be checked */
function atLeastOneServicio(control: AbstractControl): ValidationErrors | null {
  const val: Record<string, boolean> = control.value ?? {};
  return Object.values(val).some(v => v) ? null : { required: true };
}

const NOMBRES_SERVICIOS = [
  'Podología',
  'Reiki',
  'Reflexología',
  'Esencias Florales',
  'Auriculoterapia',
  'Masajes Linfáticos',
  'Tuina',
] as const;

@Component({
  selector: 'app-home',
  imports: [
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
  private readonly http     = inject(HttpClient);
  readonly testimonialsService = inject(TestimonialsService);
  private readonly isBrowser   = isPlatformBrowser(inject(PLATFORM_ID));

  readonly servicioIds = signal<Map<string, number>>(new Map());

  // ── Static data ──────────────────────────────────────────────────
  readonly servicios = signal<Servicio[]>([
    { nombre: 'Podología',          descripcion: 'Diagnóstico y tratamiento integral del pie, uñas y piel. Cuidado profesional para tu bienestar y movilidad.', icono: 'healing' },
    { nombre: 'Reiki',              descripcion: 'Técnica de equilibrio energético que promueve la relajación profunda y la sanación natural del cuerpo y la mente.', icono: 'spa' },
    { nombre: 'Reflexología',       descripcion: 'Masaje terapéutico en puntos reflejos del pie que conectan con órganos y sistemas de todo el cuerpo.', icono: 'self_improvement' },
    { nombre: 'Esencias Florales',  descripcion: 'Terapia floral de Bach para equilibrar estados emocionales y acompañar procesos de cambio interior.', icono: 'local_florist' },
    { nombre: 'Auriculoterapia',    descripcion: 'Estimulación de puntos del pabellón auricular para tratar diversas condiciones de salud de forma natural.', icono: 'hearing' },
    { nombre: 'Masajes Linfáticos', descripcion: 'Técnica suave que activa el sistema linfático, reduce la retención de líquidos y refuerza las defensas.', icono: 'water_drop' },
    { nombre: 'Tuina',              descripcion: 'Masaje terapéutico de la medicina tradicional china sobre meridianos y puntos de acupresión del cuerpo.', icono: 'back_hand' },
  ]);

  readonly razones = signal<Razon[]>([
    { titulo: 'Profesional Certificada', descripcion: 'Más de 10 años de experiencia y formación continua en podología clínica y terapias complementarias.', icono: 'verified' },
    { titulo: 'Atención Personalizada',  descripcion: 'Cada paciente recibe un tratamiento adaptado a sus necesidades específicas y objetivos de salud.', icono: 'favorite' },
    { titulo: 'Ambiente Tranquilo',       descripcion: 'Un espacio cálido y acogedor diseñado para que te sientas en calma desde el primer momento.', icono: 'home' },
    { titulo: 'Horarios Flexibles',       descripcion: 'Horas adaptadas a tu rutina. Reserva online de manera rápida y sencilla las 24 horas.', icono: 'schedule' },
  ]);

  readonly stats = signal<Stat[]>([
    { valor: '+10',  etiqueta: 'Años de experiencia' },
    { valor: '+500', etiqueta: 'Pacientes atendidos' },
    { valor: '7',    etiqueta: 'Especialidades' },
    { valor: '100%', etiqueta: 'Dedicación' },
  ]);

  readonly nombresServicios = NOMBRES_SERVICIOS;

  // ── Review form ───────────────────────────────────────────────────
  readonly calificacion = signal<number>(5);
  readonly fotoPreview  = signal<string | null>(null);
  readonly enviando     = signal(false);
  readonly enviado      = signal(false);

  /** Build a dynamic group for the service checkboxes */
  private buildServiciosGroup() {
    const group: Record<string, [boolean]> = {};
    for (const s of NOMBRES_SERVICIOS) group[s] = [false];
    return this.fb.group(group, { validators: atLeastOneServicio });
  }

  readonly form = this.fb.group({
    nombre:   ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    comentario: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(600)]],
    serviciosGroup: this.buildServiciosGroup(),
    // Optional
    email:    ['', [Validators.email]],
    telefono: ['', [Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)]],
  });

  /** Derived: which service names are checked */
  readonly serviciosSeleccionados = computed(() => {
    const vals = this.form.get('serviciosGroup')?.value as Record<string, boolean> ?? {};
    return Object.entries(vals).filter(([, v]) => v).map(([k]) => k);
  });

  /** Promedio global from service */
  readonly promedioCalificacion = this.testimonialsService.promedioCalificacion;
  readonly totalTestimonios     = this.testimonialsService.totalTestimonios;
  readonly testimonios          = this.testimonialsService.testimonios;

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.http.get<ServicioApiMin[]>(`${environment.apiUrl}/servicios`).pipe(
      catchError(() => of([] as ServicioApiMin[]))
    ).subscribe(list => {
      const map = new Map<string, number>();
      for (const s of list) map.set(s.nombre, s.id);
      this.servicioIds.set(map);
    });
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

    const serviciosUsados = Object.entries(v.serviciosGroup)
      .filter(([, checked]) => checked)
      .map(([name]) => name);

    this.testimonialsService.agregar({
      nombre:       v.nombre.trim(),
      apellido:     v.apellido.trim(),
      comentario:   v.comentario.trim(),
      servicios:    serviciosUsados,
      calificacion: this.calificacion(),
      email:    v.email?.trim() || undefined,
      telefono: v.telefono?.trim() || undefined,
      fotoUrl:  this.fotoPreview() ?? undefined,
    });

    this.enviando.set(false);
    this.enviado.set(true);
    this.form.reset();
    this.calificacion.set(5);
    this.fotoPreview.set(null);

    this.snack.open('¡Gracias por tu opinión! Ya aparece en el sitio.', 'Cerrar', {
      duration: 5000,
      panelClass: ['snack-success'],
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
