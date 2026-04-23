import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose 5 navigation links', () => {
    expect(component.links.length).toBe(5);
  });

  it('should render 5 desktop nav links', () => {
    const links = el.querySelectorAll('.navbar__links .navbar__link');
    expect(links.length).toBe(5);
  });

  it('should render a CTA button linking to /reservas', () => {
    const cta = el.querySelector('.navbar__cta');
    expect(cta).not.toBeNull();
    const href = cta?.getAttribute('ng-reflect-router-link')
      ?? cta?.getAttribute('routerLink')
      ?? cta?.getAttribute('href')
      ?? '';
    expect(href).toContain('reservas');
  });

  it('should start with menu closed', () => {
    expect(component.menuOpen()).toBe(false);
  });

  it('toggleMenu should open the menu', () => {
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);
  });

  it('toggleMenu called twice should close the menu', () => {
    component.toggleMenu();
    component.toggleMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('closeMenu should set menuOpen to false', () => {
    component.menuOpen.set(true);
    component.closeMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('should start with scrolled=false', () => {
    expect(component.scrolled()).toBe(false);
  });
});
