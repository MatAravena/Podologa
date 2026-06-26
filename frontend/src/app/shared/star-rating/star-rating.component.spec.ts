import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StarRatingComponent } from './star-rating.component';

describe('StarRatingComponent', () => {
  let fixture: ComponentFixture<StarRatingComponent>;
  let component: StarRatingComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render 5 stars by default', () => {
    fixture.detectChanges();
    const stars = fixture.nativeElement.querySelectorAll('.star-wrap');
    expect(stars.length).toBe(5);
  });

  it('should render custom maxStars count', () => {
    fixture.componentRef.setInput('maxStars', 3);
    fixture.detectChanges();
    const stars = fixture.nativeElement.querySelectorAll('.star-wrap');
    expect(stars.length).toBe(3);
  });

  it('should have role=img in display mode', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('role')).toBe('img');
  });

  it('should have role=slider in interactive mode', () => {
    fixture.componentRef.setInput('interactive', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('role')).toBe('slider');
  });

  it('should not be focusable in display mode', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('tabindex')).toBeNull();
  });

  it('should be focusable in interactive mode', () => {
    fixture.componentRef.setInput('interactive', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('tabindex')).toBe('0');
  });

  describe('isHalfFilled', () => {
    it('left half should be filled when value >= star - 0.5', () => {
      fixture.componentRef.setInput('value', 3.5);
      fixture.detectChanges();
      // star=4 left half → 3.5 >= 3.5 → true
      expect(component.isHalfFilled(4, 'left')).toBe(true);
      // star=4 right half → 3.5 >= 4 → false
      expect(component.isHalfFilled(4, 'right')).toBe(false);
    });

    it('both halves filled for a full star', () => {
      fixture.componentRef.setInput('value', 4);
      fixture.detectChanges();
      expect(component.isHalfFilled(4, 'left')).toBe(true);
      expect(component.isHalfFilled(4, 'right')).toBe(true);
    });

    it('no halves filled for stars beyond value', () => {
      fixture.componentRef.setInput('value', 2);
      fixture.detectChanges();
      expect(component.isHalfFilled(3, 'left')).toBe(false);
      expect(component.isHalfFilled(3, 'right')).toBe(false);
    });
  });

  describe('keyboard navigation (interactive)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('interactive', true);
      fixture.componentRef.setInput('value', 3);
      fixture.detectChanges();
    });

    it('ArrowRight increases value by 0.5', () => {
      const emitted: number[] = [];
      component.valueChange.subscribe((v: number) => emitted.push(v));

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      fixture.nativeElement.dispatchEvent(event);

      expect(emitted).toEqual([3.5]);
    });

    it('ArrowLeft decreases value by 0.5', () => {
      const emitted: number[] = [];
      component.valueChange.subscribe((v: number) => emitted.push(v));

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      fixture.nativeElement.dispatchEvent(event);

      expect(emitted).toEqual([2.5]);
    });

    it('does not go below 0.5', () => {
      fixture.componentRef.setInput('value', 0.5);
      fixture.detectChanges();
      const emitted: number[] = [];
      component.valueChange.subscribe((v: number) => emitted.push(v));

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      fixture.nativeElement.dispatchEvent(event);

      expect(emitted).toEqual([0.5]);
    });

    it('does not exceed maxStars', () => {
      fixture.componentRef.setInput('value', 5);
      fixture.detectChanges();
      const emitted: number[] = [];
      component.valueChange.subscribe((v: number) => emitted.push(v));

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      fixture.nativeElement.dispatchEvent(event);

      expect(emitted).toEqual([5]);
    });
  });

  describe('mouse interaction (interactive)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('interactive', true);
      fixture.detectChanges();
    });

    function mouseEvent(clientX: number): MouseEvent {
      return {
        clientX,
        currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 20 }) },
      } as unknown as MouseEvent;
    }

    it('hovering the left half sets a half-star preview', () => {
      component.onMouseMove(mouseEvent(5), 4); // 5 < 10 → 3.5
      expect(component.hoverValue()).toBe(3.5);
      expect(component.displayValue()).toBe(3.5);
    });

    it('hovering the right half sets a full-star preview', () => {
      component.onMouseMove(mouseEvent(15), 4); // 15 >= 10 → 4
      expect(component.hoverValue()).toBe(4);
    });

    it('mouseleave clears the hover preview', () => {
      component.onMouseMove(mouseEvent(15), 4);
      component.onMouseLeave();
      expect(component.hoverValue()).toBeNull();
    });

    it('clicking emits the chosen value', () => {
      const emitted: number[] = [];
      component.valueChange.subscribe((v: number) => emitted.push(v));
      component.onStarClick(mouseEvent(5), 2);  // → 1.5
      component.onStarClick(mouseEvent(15), 2); // → 2
      expect(emitted).toEqual([1.5, 2]);
    });
  });

  describe('display mode ignores interaction', () => {
    beforeEach(() => fixture.detectChanges()); // interactive defaults to false

    it('onMouseMove / onStarClick / onKeydown are no-ops', () => {
      const emitted: number[] = [];
      component.valueChange.subscribe((v: number) => emitted.push(v));
      const ev = { clientX: 5, currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 20 }) } } as unknown as MouseEvent;
      component.onMouseMove(ev, 3);
      component.onStarClick(ev, 3);
      component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(component.hoverValue()).toBeNull();
      expect(emitted).toEqual([]);
    });
  });

  describe('showLabel', () => {
    it('does not show label by default', () => {
      fixture.componentRef.setInput('value', 4.5);
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('.star-label');
      expect(label).toBeNull();
    });

    it('shows label when showLabel=true', () => {
      fixture.componentRef.setInput('value', 4.5);
      fixture.componentRef.setInput('showLabel', true);
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('.star-label');
      expect(label).not.toBeNull();
      expect(label.textContent.trim()).toBe('4.5');
    });
  });
});
