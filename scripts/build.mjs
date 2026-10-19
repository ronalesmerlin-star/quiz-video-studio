// Arma la carpeta www/ que va dentro de la app: página, letras, librería de MP4 y puente nativo.
import { build } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync } from 'node:fs';
import { mkdirSync, copyFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
const W = 'www'; rmSync(W, { recursive: true, force: true }); mkdirSync(W + '/fonts', { recursive: true });
// El código de la app se ofusca para que no se pueda leer ni copiar fácilmente
let html = readFileSync('src/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('No encontré el script principal en src/index.html');
const obf = JavaScriptObfuscator.obfuscate(m[1], {
  compact: true, identifierNamesGenerator: 'hexadecimal', renameGlobals: false,
  stringArray: false,
  splitStrings: false, controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false, transformObjectKeys: false,
  unicodeEscapeSequence: false, target: 'browser'
}).getObfuscatedCode();
writeFileSync(W + '/app.js', obf);
html = html.replace(m[0], '<script src="app.js"></script>');
writeFileSync(W + '/index.html', html);
copyFileSync('node_modules/mp4-muxer/build/mp4-muxer.js', W + '/mp4-muxer.js');
await build({ entryPoints: ['src/native.js'], bundle: true, minify: true, format: 'iife', outfile: W + '/native.js', target: 'chrome100' });
const FONTS = [['poppins', 'Poppins', [400, 500, 600, 700]], ['fredoka', 'Fredoka', [500, 600, 700]], ['lilita-one', 'Lilita One', [400]], ['bungee', 'Bungee', [400]], ['baloo-2', 'Baloo 2', [600, 700, 800]]];
let css = '';
for (const [pkg, fam, weights] of FONTS) for (const w of weights) for (const sub of ['latin', 'latin-ext']) {
  const f = `${pkg}-${sub}-${w}-normal.woff2`; const src = `node_modules/@fontsource/${pkg}/files/${f}`;
  if (!readdirSync(`node_modules/@fontsource/${pkg}/files`).includes(f)) continue;
  copyFileSync(src, `${W}/fonts/${f}`);
  css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format('woff2')${sub === 'latin' ? ';unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' : ''}}\n`;
}
writeFileSync(W + '/fonts.css', css);
console.log('www listo');
