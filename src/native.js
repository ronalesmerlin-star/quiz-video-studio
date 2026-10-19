// Puente con Android: guarda archivos en Documentos/QuizClip y abre el menú de compartir.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const CHUNK = 3 * 1024 * 1024; // múltiplo de 3 para que cada trozo en base64 sea válido
function toB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

async function writeBlob(path, directory, blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  for (let i = 0; i < buf.length || i === 0; i += CHUNK) {
    const data = toB64(buf.subarray(i, i + CHUNK));
    if (i === 0) await Filesystem.writeFile({ path, directory, data, recursive: true });
    else await Filesystem.appendFile({ path, directory, data });
    if (buf.length === 0) break;
  }
  return (await Filesystem.getUri({ path, directory })).uri;
}

async function saveFile(blob, filename) {
  let savedTo = '';
  try { await writeBlob('QuizClip/' + filename, Directory.Documents, blob); savedTo = 'Documentos/QuizClip'; } catch (e) { /* algunos teléfonos no permiten escribir en Documentos */ }
  const uri = await writeBlob(filename, Directory.Cache, blob);
  try { await Share.share({ title: filename, files: [uri] }); } catch (e) { /* el usuario cerró el menú de compartir */ }
  return savedTo;
}

// Compartir un texto, un enlace y, si hay, una imagen (Reto del día y duelos)
async function share(o) {
  const files = [];
  if (o.blob) { try { files.push(await writeBlob(o.name || 'quizclip.png', Directory.Cache, o.blob)); } catch (e) { } }
  await Share.share({ title: 'QuizClip', text: o.text, url: o.url, ...(files.length ? { files } : {}), dialogTitle: 'QuizClip' });
}

// Voz femenina o masculina: se elige entre las voces instaladas en el teléfono
const VG = () => { try { return localStorage.getItem('qvs-vg') || 'f'; } catch (e) { return 'f'; } };
// códigos de las voces de Google (motor más común en Android)
const GF = new Set(['eea', 'eec', 'esc', 'esf', 'iob', 'iog', 'sfg', 'tpc', 'tpf', 'gba', 'gbc', 'gbg', 'afs', 'pte', 'sfs', 'aua', 'auc', 'cfb', 'cfc']);
const GM = new Set(['eed', 'eef', 'esd', 'iol', 'iom', 'tpd', 'gbb', 'gbd', 'rjs', 'ptd', 'jmn', 'pmj', 'aub', 'aud', 'cfd']);
function genderOf(name) {
  const n = String(name || '').toLowerCase();
  if (/female|mujer|femin/.test(n)) return 'f';
  if (/male|hombre|mascul/.test(n)) return 'm';
  const m = n.match(/-x-([a-z]{3})[-#]/); if (m) { if (GF.has(m[1])) return 'f'; if (GM.has(m[1])) return 'm'; }
  return '';
}
let VLIST = null;
async function voices() { if (!VLIST) { try { VLIST = (await TextToSpeech.getSupportedVoices()).voices || []; } catch (e) { VLIST = []; } } return VLIST; }
async function pickVoice(lang) {
  const g = VG(), vs = await voices(), L2 = lang.slice(0, 2).toLowerCase(), LL = lang.toLowerCase();
  const norm = v => String(v.lang || '').toLowerCase().replace('_', '-');
  const idx = vs.map((v, i) => ({ v, i })).filter(x => norm(x.v).startsWith(L2));
  const rank = x => (norm(x.v) === LL ? 0 : 2) + (x.v.localService === false ? 1 : 0);
  idx.sort((a, b) => rank(a) - rank(b));
  const hit = idx.find(x => genderOf(x.v.name) === g);
  if (hit) return { index: hit.i, name: hit.v.name, pitch: 1.0 };
  return { index: undefined, name: '', pitch: g === 'm' ? 0.8 : 1.1 };
}

// Voz del teléfono (motor de texto a voz de Android): gratis y sin internet
async function speak(text, lang, rate) {
  const p = await pickVoice(lang);
  await TextToSpeech.speak({ text, lang, rate: rate || 1.0, pitch: p.pitch, volume: 1.0, category: 'ambient', queueStrategy: 0, ...(p.index !== undefined ? { voice: p.index } : {}) });
}
async function stopSpeak() { try { await TextToSpeech.stop(); } catch (e) { } }
async function hasLang(lang) { try { return (await TextToSpeech.isLanguageSupported({ lang })).supported; } catch (e) { return true; } }
async function installVoices() { try { await TextToSpeech.openInstall(); } catch (e) { } }

// Voz del narrador como archivo WAV (pieza propia de la app, en Java), para meterla dentro del video
const VozArchivo = registerPlugin('VozArchivo');
async function synth(text, lang, rate) {
  const p = await pickVoice(lang);
  const r = await VozArchivo.synth({ text, lang, rate: rate || 1.0, voiceName: p.name, pitch: p.pitch });
  const bin = atob(r.data), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
}

// Bloquea capturas y grabación de pantalla mientras se ven los textos de la app
const Proteccion = registerPlugin('Proteccion');
async function secure(on) { try { await Proteccion.set({ on: !!on }); } catch (e) { } }

window.NativeApp = { isNative: Capacitor.isNativePlatform(), platform: Capacitor.getPlatform(), saveFile, share, speak, stopSpeak, hasLang, installVoices, synth, secure };
