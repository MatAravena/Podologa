import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AdminGaleriaComponent } from './admin-galeria.component';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { GaleriaPostApi } from '../../galeria/galeria.component';
import { environment } from '../../../environments/environment';

const MOCK_POSTS: GaleriaPostApi[] = [
  { id: 1, titulo: 'Post 1', descripcion: 'Desc uno', media_url: '/uploads/img1.jpg',              media_type: 'image', published: true,  created_at: '2026-01-01' },
  { id: 2, titulo: 'Post 2', descripcion: null,        media_url: 'https://cdn.example.com/2.jpg', media_type: 'image', published: false, created_at: '2026-01-02' },
];

describe('AdminGaleriaComponent', () => {
  let fixture: ComponentFixture<AdminGaleriaComponent>;
  let component: AdminGaleriaComponent;
  let httpMock: HttpTestingController;

  const authSpy = { logout: vi.fn(), isLoggedIn: () => true, token: () => 'mock-token' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGaleriaComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: authSpy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminGaleriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/galeria`).flush(MOCK_POSTS);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load posts on init and set loading to false', () => {
    expect(component.posts().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('should start with no caption panel open', () => {
    expect(component.captionPost()).toBeNull();
  });

  it('mediaUrl should return an absolute URL unchanged', () => {
    expect(component.mediaUrl(MOCK_POSTS[1])).toBe('https://cdn.example.com/2.jpg');
  });

  it('mediaUrl should resolve a relative URL against the API base', () => {
    const base = environment.apiUrl.replace('/api', '');
    expect(component.mediaUrl(MOCK_POSTS[0])).toBe(`${base}/uploads/img1.jpg`);
  });

  it('openCaptionPanel should set captionPost and build caption from title+description', () => {
    component.openCaptionPanel(MOCK_POSTS[0]);
    expect(component.captionPost()).toBe(MOCK_POSTS[0]);
    expect(component.captionText()).toBe('Post 1\n\nDesc uno');
  });

  it('openCaptionPanel should use title only when no description', () => {
    component.openCaptionPanel(MOCK_POSTS[1]);
    expect(component.captionText()).toBe('Post 2');
  });

  it('openCaptionPanel should reset tono and contexto', () => {
    component.captionTono.set('profesional');
    component.captionContexto.set('extra context');
    component.openCaptionPanel(MOCK_POSTS[0]);
    expect(component.captionTono()).toBe('');
    expect(component.captionContexto()).toBe('');
  });

  it('closeCaptionPanel should clear captionPost', () => {
    component.openCaptionPanel(MOCK_POSTS[0]);
    component.closeCaptionPanel();
    expect(component.captionPost()).toBeNull();
  });

  it('form should start invalid (titulo required)', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('form should become valid when titulo has at least 2 characters', () => {
    component.form.patchValue({ titulo: 'Mi post', descripcion: '', publicar: false });
    expect(component.form.valid).toBe(true);
  });

  const GAL = `${environment.apiUrl}/galeria`;

  it('onSubmit does nothing without a selected file', () => {
    component.form.patchValue({ titulo: 'Sin archivo' });
    component.onSubmit();
    httpMock.expectNone(GAL);
  });

  it('onSubmit uploads the post (POST /galeria) and prepends it', () => {
    (component as unknown as { selectedFile: File }).selectedFile =
      new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' });
    component.form.patchValue({ titulo: 'Nuevo post', descripcion: 'd', publicar: false });
    component.onSubmit();

    const req = httpMock.expectOne(GAL);
    expect(req.request.method).toBe('POST');
    const created: GaleriaPostApi = { id: 9, titulo: 'Nuevo post', descripcion: 'd', media_url: '/uploads/n.jpg', media_type: 'image', published: false, created_at: 'x' };
    req.flush(created);

    expect(component.posts()[0].id).toBe(9);
    expect(component.uploading()).toBe(false);
  });

  it('generateAiCaption fills the caption from the API', () => {
    component.openCaptionPanel(MOCK_POSTS[0]);
    component.generateAiCaption();
    const req = httpMock.expectOne(`${GAL}/1/generar-caption`);
    expect(req.request.method).toBe('POST');
    req.flush({ caption: 'Caption IA ✨', ai_generated: true });
    expect(component.captionText()).toBe('Caption IA ✨');
    expect(component.aiGenerated()).toBe(true);
    expect(component.generatingCaption()).toBe(false);
  });

  it('confirmPublish posts and reloads on success', () => {
    component.openCaptionPanel(MOCK_POSTS[1]);
    component.confirmPublish();
    const req = httpMock.expectOne(`${GAL}/2/publicar`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...MOCK_POSTS[1], published: true });
    // success path calls loadPosts() again
    httpMock.expectOne(GAL).flush(MOCK_POSTS);
    expect(component.captionPost()).toBeNull();
    expect(component.publishing()).toBeNull();
  });

  it('deletePost DELETEs after confirm and removes it', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deletePost(MOCK_POSTS[0]);
    const req = httpMock.expectOne(`${GAL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(component.posts().some(p => p.id === 1)).toBe(false);
  });

  it('deletePost does nothing when confirm is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.deletePost(MOCK_POSTS[0]);
    httpMock.expectNone(`${GAL}/1`);
  });
});
