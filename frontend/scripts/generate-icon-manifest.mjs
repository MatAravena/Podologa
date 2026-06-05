/**
 * Generates src/assets/icons/manifest.json from the SVG files in
 * src/assets/icons/32px/.
 *
 * Browsers cannot list a directory at runtime, so we precompute the icon
 * names into a JSON manifest that the app fetches via HttpClient.
 *
 * Runs automatically before `npm start` / `npm run build` (see package.json
 * prestart/prebuild hooks). Re-run manually after adding or removing icons:
 *     node scripts/generate-icon-manifest.mjs
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '..', 'src', 'assets', 'icons', '32px');
const OUTPUT = join(__dirname, '..', 'src', 'assets', 'icons', 'manifest.json');

const names = readdirSync(ICONS_DIR)
  .filter((f) => f.toLowerCase().endsWith('.svg'))
  .map((f) => f.replace(/\.svg$/i, ''))
  .sort((a, b) => a.localeCompare(b));

writeFileSync(OUTPUT, JSON.stringify({ icons: names }, null, 2) + '\n', 'utf8');

console.log(`[icon-manifest] wrote ${names.length} icons to assets/icons/manifest.json`);
