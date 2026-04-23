import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { GaleriaComponent, GaleriaPostApi } from './galeria.component';
import { environment } from '../../environments/environment';

const MOCK_POSTS: GaleriaPostApi[] = [
  { id: 1, titulo: 'Post 1', descripcion: 'Desc 1', media_url: '/uploads/img1.jpg',           media_type: 'image', published: true,  created_at: '2026-01-01' },
  { id: 2, titulo: 'Post 2', descripcion: null,     media_url: 'https://cdn.example.com/2.jpg', media_type: 'image', published: false, created_at: '2026-01-02' },
];

describe('GaleriaComponent', () => {
  let fixture: ComponentFixture<GaleriaComponent>;
  let component: GaleriaComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GaleriaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GaleriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/galeria`).flush(MOCK_POSTS);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load posts from API and set loading to false', () => {
    expect(component.posts().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('should start with no selected post', () => {
    expect(component.selected()).toBeNull();
  });

  it('openLightbox should set the selected post', () => {
    component.openLightbox(MOCK_POSTS[0]);
    expect(component.selected()).toBe(MOCK_POSTS[0]);
  });

  it('closeLightbox should clear the selected post', () => {
    component.openLightbox(MOCK_POSTS[0]);
    component.closeLightbox();
    expect(component.selected()).toBeNull();
  });

  it('mediaUrl should return an absolute URL unchanged', () => {
    expect(component.mediaUrl(MOCK_POSTS[1])).toBe('https://cdn.example.com/2.jpg');
  });

  it('mediaUrl should resolve a relative URL against the API base', () => {
    const base = environment.apiUrl.replace('/api', '');
    expect(component.mediaUrl(MOCK_POSTS[0])).toBe(`${base}/uploads/img1.jpg`);
  });
});
