// Arma la carpeta www/ que va dentro de la app: página, letras, librería de MP4 y puente nativo.
import { build } from 'esbuild';
import { mkdirSync, copyFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
const W = 'www'; rmSync(W, { recursive: true, force: true }); mkdirSync(W + '/fonts', { recursive: true });
copyFileSync('src/index.html', W + '/index.html');
copyFileSync('node_modules/mp4-muxer/build/mp4-muxer.js', W + '/mp4-muxer.js');
await build({ entryPoints: ['src/native.js'], bundle: true, minify: true, format: 'iife', outfile: W + '/native.js', target: 'chrome100' });
const FONTS = [['fredoka', 'Fredoka', [500, 600, 700]], ['lilita-one', 'Lilita One', [400]], ['bungee', 'Bungee', [400]], ['baloo-2', 'Baloo 2', [600, 700, 800]]];
let css = '';
for (const [pkg, fam, weights] of FONTS) for (const w of weights) for (const sub of ['latin', 'latin-ext']) {
  const f = `${pkg}-${sub}-${w}-normal.woff2`; const src = `node_modules/@fontsource/${pkg}/files/${f}`;
  if (!readdirSync(`node_modules/@fontsource/${pkg}/files`).includes(f)) continue;
  copyFileSync(src, `${W}/fonts/${f}`);
  css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format('woff2')${sub === 'latin' ? ';unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' : ''}}\n`;
}
writeFileSync(W + '/fonts.css', css);
console.log('www listo');
