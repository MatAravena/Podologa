import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let component: FooterComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the current year', () => {
    expect(el.textContent).toContain(String(new Date().getFullYear()));
  });

  it('should expose 7 services', () => {
    expect(component.servicios.length).toBe(7);
  });

  it('should expose 6 navigation links', () => {
    expect(component.links.length).toBe(6);
  });

  it('should list all 7 service names', () => {
    const text = el.textContent ?? '';
    const expected = ['Podología', 'Reiki', 'Reflexología', 'Esencias Florales', 'Auriculoterapia', 'Masajes Linfáticos', 'Tuina'];
    for (const name of expected) {
      expect(text).toContain(name);
    }
  });

  it('should include a link to /reservas', () => {
    const links = Array.from(el.querySelectorAll('a')) as HTMLElement[];
    const reservasLinks = links.filter(l =>
      l.getAttribute('href') === '/reservas' ||
      l.getAttribute('ng-reflect-router-link') === '/reservas' ||
      l.getAttribute('routerLink') === '/reservas'
    );
    expect(reservasLinks.length).toBeGreaterThan(0);
  });

  it('should render the brand name Libélula', () => {
    expect(el.textContent).toContain('Libélula');
  });
});
