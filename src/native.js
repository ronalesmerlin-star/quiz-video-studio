// Puente con Android: guarda archivos en Documentos/QuizVideoStudio y abre el menú de compartir.
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
  try { await writeBlob('QuizVideoStudio/' + filename, Directory.Documents, blob); savedTo = 'Documentos/QuizVideoStudio'; } catch (e) { /* algunos teléfonos no permiten escribir en Documentos */ }
  const uri = await writeBlob(filename, Directory.Cache, blob);
  try { await Share.share({ title: filename, files: [uri] }); } catch (e) { /* el usuario cerró el menú de compartir */ }
  return savedTo;
}

// Voz del teléfono (motor de texto a voz de Android): gratis y sin internet
async function speak(text, lang, rate) { await TextToSpeech.speak({ text, lang, rate: rate || 1.0, pitch: 1.0, volume: 1.0, category: 'ambient', queueStrategy: 0 }); }
async function stopSpeak() { try { await TextToSpeech.stop(); } catch (e) { } }
async function hasLang(lang) { try { return (await TextToSpeech.isLanguageSupported({ lang })).supported; } catch (e) { return true; } }
async function installVoices() { try { await TextToSpeech.openInstall(); } catch (e) { } }

// Voz del narrador como archivo WAV (pieza propia de la app, en Java), para meterla dentro del video
const VozArchivo = registerPlugin('VozArchivo');
async function synth(text, lang, rate) {
  const r = await VozArchivo.synth({ text, lang, rate: rate || 1.0 });
  const bin = atob(r.data), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
}

// Bloquea capturas y grabación de pantalla mientras se ven los textos de la app
const Proteccion = registerPlugin('Proteccion');
async function secure(on) { try { await Proteccion.set({ on: !!on }); } catch (e) { } }

window.NativeApp = { isNative: Capacitor.isNativePlatform(), platform: Capacitor.getPlatform(), saveFile, speak, stopSpeak, hasLang, installVoices, synth, secure };
