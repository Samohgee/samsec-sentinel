import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const out = join(root, 'dist');

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const STATIC = [
    'index.html',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'sw.js',
    'favicon.ico',
];

const DIRS = ['pages', 'assets', 'components', 'data', 'docs'];

for (const file of STATIC) {
    const src = join(root, file);
    if (existsSync(src)) cpSync(src, join(out, file));
}

for (const dir of DIRS) {
    const src = join(root, dir);
    if (existsSync(src)) cpSync(src, join(out, dir), { recursive: true });
}

console.log('Build complete: static files written to dist/');
