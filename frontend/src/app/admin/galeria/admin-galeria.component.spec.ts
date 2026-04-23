import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AdminGaleriaComponent } from './admin-galeria.component';
import { AdminAuthService } from '../../shared/admin/admin-auth.service';
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
});
