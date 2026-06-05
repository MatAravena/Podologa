import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule }    from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatCheckboxModule }  from '@angular/material/checkbox';
import { MatIconModule }      from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, of } from 'rxjs';

import { AdminAuthService }   from '../admin-auth/admin-auth.service';
import { AdminNavbarComponent } from '../admin-auth/admin-navbar/admin-navbar.component';
import { GaleriaService, GaleriaPost, CaptionOut } from '../../services/galeria/galeria.service';

/** Alias kept for template/spec readability. */
type GaleriaPostApi = GaleriaPost;

@Component({
  selector: 'app-admin-galeria',
  imports: [
    AdminNavbarComponent,
    DatePipe, 
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-galeria.component.html',
  styleUrl:    './admin-galeria.component.scss',
})
export class AdminGaleriaComponent implements OnInit {
  readonly auth   = inject(AdminAuthService);
  private readonly galeriaService = inject(GaleriaService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb    = inject(FormBuilder);

  readonly posts      = signal<GaleriaPostApi[]>([]);
  readonly loading    = signal(true);
  readonly uploading  = signal(false);
  readonly deleting   = signal<number | null>(null);
  readonly publishing = signal<number | null>(null);
  readonly preview    = signal<string | null>(null);

  // ── AI caption panel ────────────────────────────────────────────
  readonly captionPost      = signal<GaleriaPostApi | null>(null);
  readonly captionText      = signal('');
  readonly captionTono      = signal('');
  readonly captionContexto  = signal('');
  readonly generatingCaption = signal(false);
  readonly aiGenerated       = signal(false);

  private selectedFile: File | null = null;

  readonly form = this.fb.nonNullable.group({
    titulo:      ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    publicar:    [false],
  });

  ngOnInit(): void { this.loadPosts(); }

  private loadPosts(): void {
    this.galeriaService.listar().pipe(
      catchError(() => of([] as GaleriaPost[]))
    ).subscribe(list => { this.posts.set(list); this.loading.set(false); });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.preview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.selectedFile) return;
    const v = this.form.getRawValue();

    const fd = new FormData();
    fd.append('titulo',      v.titulo);
    fd.append('descripcion', v.descripcion ?? '');
    fd.append('publicar',    String(v.publicar));
    fd.append('file',        this.selectedFile);

    this.uploading.set(true);
    this.galeriaService.subir(fd).pipe(
      catchError(() => {
        this.snack.open('Error al subir el archivo.', 'Cerrar', { duration: 4000 });
        this.uploading.set(false);
        return of(null);
      })
    ).subscribe(post => {
      this.uploading.set(false);
      if (post) {
        this.posts.update(list => [post, ...list]);
        this.form.reset();
        this.selectedFile = null;
        this.preview.set(null);
        this.snack.open(
          v.publicar ? '¡Post subido y publicado en redes!' : 'Post subido correctamente.',
          'Cerrar', { duration: 4000 }
        );
      }
    });
  }

  // ── Caption panel ────────────────────────────────────────────────

  openCaptionPanel(post: GaleriaPostApi): void {
    this.captionPost.set(post);
    this.captionText.set(post.descripcion
      ? `${post.titulo}\n\n${post.descripcion}`
      : post.titulo);
    this.captionTono.set('');
    this.captionContexto.set('');
    this.aiGenerated.set(false);
  }

  closeCaptionPanel(): void {
    this.captionPost.set(null);
  }

  generateAiCaption(): void {
    const post = this.captionPost();
    if (!post) return;
    this.generatingCaption.set(true);
    this.galeriaService.generarCaption(post.id, {
      tono: this.captionTono() || null,
      contexto_extra: this.captionContexto() || null,
    }).pipe(
      catchError(() => of(null))
    ).subscribe((res: CaptionOut | null) => {
      this.generatingCaption.set(false);
      if (res) {
        this.captionText.set(res.caption);
        this.aiGenerated.set(res.ai_generated);
      } else {
        this.snack.open('No se pudo generar el caption. Revisa la clave de API.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  confirmPublish(): void {
    const post = this.captionPost();
    if (!post) return;
    this.publishing.set(post.id);
    this.galeriaService.publicar(post.id, {
      caption: this.captionText() || null,
    }).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      this.publishing.set(null);
      this.captionPost.set(null);
      if (res) {
        this.snack.open('¡Publicado en redes sociales!', 'Cerrar', { duration: 4000 });
        this.loadPosts();
      } else {
        this.snack.open('Error al publicar. Intenta nuevamente.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  deletePost(post: GaleriaPostApi): void {
    if (!confirm(`¿Eliminar "${post.titulo}"? Esta acción no se puede deshacer.`)) return;
    this.deleting.set(post.id);
    this.galeriaService.eliminar(post.id).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.deleting.set(null);
      this.posts.update(list => list.filter(p => p.id !== post.id));
      this.snack.open('Post eliminado.', 'Cerrar', { duration: 3000 });
    });
  }

  mediaUrl(post: GaleriaPostApi): string {
    return this.galeriaService.mediaUrl(post.media_url);
  }
}
