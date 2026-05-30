export interface BrandColor {
  key:   string;
  label: string;
  hex:   string;
  rgb:   string;
  uso:   string;
}

export const BRAND_COLORS: BrandColor[] = [
  { key: 'rosa_empolvado', label: 'Rosa empolvado', hex: '#c2607a', rgb: '194, 96, 122',  uso: 'Navegación' },
  { key: 'dorado_mostaza', label: 'Dorado mostaza', hex: '#b88334', rgb: '184, 131, 52',  uso: 'Admin'      },
  { key: 'verde_salvia',   label: 'Verde salvia',   hex: '#748f5e', rgb: '116, 143, 94',  uso: 'Terapias'   },
  { key: 'ciruela',        label: 'Ciruela',        hex: '#a4708f', rgb: '164, 112, 143', uso: 'Marca'      },
];

export const BRAND_COLOR_MAP = new Map<string, BrandColor>(
  BRAND_COLORS.map(c => [c.key, c])
);

/** Resolve a color key to its hex value. Returns fallback if key is unknown. */
export function resolveColor(key: string | null | undefined, fallback = '#c2607a'): string {
  if (!key) return fallback;
  return BRAND_COLOR_MAP.get(key)?.hex ?? fallback;
}
