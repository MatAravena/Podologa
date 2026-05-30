import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img [src]="src()" [width]="size()" [height]="size()" alt="" aria-hidden="true"
               [class.icon-img--inverted]="inverted()" class="icon-img">`,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; }
    .icon-img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .icon-img--inverted { filter: brightness(0) invert(1); }
  `],
})
export class AppIconComponent {
  readonly name     = input.required<string>();
  readonly size     = input<16 | 24 | 32>(24);
  readonly inverted = input<boolean>(false);

  readonly src = computed(() => `/assets/icons/${this.size()}px/${this.name()}.svg`);
}
