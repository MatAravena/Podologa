import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * StarRatingComponent
 * Supports half-stars (0.5 increments), interactive and display modes.
 *
 * Usage (display):     <app-star-rating [value]="4.5" />
 * Usage (interactive): <app-star-rating [value]="rating()" [interactive]="true" (valueChange)="rating.set($event)" />
 * Large variant:       <app-star-rating class="star-lg" ... />
 */
@Component({
  selector: 'app-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  host: {
    '[attr.role]':         'interactive() ? "slider" : "img"',
    '[attr.aria-label]':   'ariaLabel()',
    '[attr.aria-valuemin]':'interactive() ? "0" : null',
    '[attr.aria-valuemax]':'interactive() ? maxStars().toString() : null',
    '[attr.aria-valuenow]':'interactive() ? value().toString() : null',
    '[attr.tabindex]':     'interactive() ? "0" : null',
    '(keydown)':           'onKeydown($event)',
  },
  template: `
    <span class="stars" [class.stars--interactive]="interactive()">
      @for (star of stars; track star) {
        <span
          class="star-wrap"
          [attr.aria-hidden]="'true'"
          (mousemove)="onMouseMove($event, star)"
          (mouseleave)="onMouseLeave()"
          (click)="onStarClick($event, star)"
        >
          <!-- Full star background (empty fill) -->
          <svg class="star-svg star-svg--bg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
          <!-- Left-half fill (half star) -->
          <svg class="star-svg star-svg--left" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
               [class.star-svg--filled]="isHalfFilled(star, 'left')">
            <defs>
              <clipPath [id]="'clip-left-' + star">
                <rect x="0" y="0" width="12" height="24"/>
              </clipPath>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              [attr.clip-path]="'url(#clip-left-' + star + ')'"
            />
          </svg>
          <!-- Right-half fill (full star when both halves filled) -->
          <svg class="star-svg star-svg--right" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
               [class.star-svg--filled]="isHalfFilled(star, 'right')">
            <defs>
              <clipPath [id]="'clip-right-' + star">
                <rect x="12" y="0" width="12" height="24"/>
              </clipPath>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              [attr.clip-path]="'url(#clip-right-' + star + ')'"
            />
          </svg>
        </span>
      }
    </span>
    @if (showLabel()) {
      <span class="star-label">{{ value() | number:'1.1-1' }}</span>
    }
  `,
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  readonly value       = input<number>(0);
  readonly interactive = input<boolean>(false);
  readonly showLabel   = input<boolean>(false);
  readonly maxStars    = input<number>(5);

  readonly valueChange = output<number>();

  readonly hoverValue  = signal<number | null>(null);

  readonly displayValue = computed(() =>
    this.hoverValue() !== null ? this.hoverValue()! : this.value()
  );

  readonly ariaLabel = computed(() =>
    this.interactive()
      ? `Calificación: ${this.value()} de ${this.maxStars()} estrellas. Usá las flechas para cambiar.`
      : `${this.value()} de ${this.maxStars()} estrellas`
  );

  get stars(): number[] {
    return Array.from({ length: this.maxStars() }, (_, i) => i + 1);
  }

  isHalfFilled(star: number, half: 'left' | 'right'): boolean {
    const v = this.displayValue();
    return half === 'left' ? v >= star - 0.5 : v >= star;
  }

  onMouseMove(event: MouseEvent, star: number): void {
    if (!this.interactive()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hoverValue.set((event.clientX - rect.left) < rect.width / 2 ? star - 0.5 : star);
  }

  onMouseLeave(): void {
    if (!this.interactive()) return;
    this.hoverValue.set(null);
  }

  onStarClick(event: MouseEvent, star: number): void {
    if (!this.interactive()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.valueChange.emit((event.clientX - rect.left) < rect.width / 2 ? star - 0.5 : star);
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.valueChange.emit(Math.min(this.maxStars(), this.value() + 0.5));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.valueChange.emit(Math.max(0.5, this.value() - 0.5));
    }
  }
}
