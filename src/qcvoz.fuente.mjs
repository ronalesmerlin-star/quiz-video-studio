// QuizClip · Voces naturales (IA) que funcionan dentro del teléfono, sin internet después de descargarlas.
// Motor: Piper (código abierto) + ONNX Runtime Web. Las voces se descargan una vez y se guardan en el teléfono.
import * as ort from 'onnxruntime-web/wasm';
import { createPiperPhonemize } from './phonemize_glue.mjs';

const ORT_VER = '1.30.0';
const SRC = {
  ortWasm: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VER}/dist/ort-wasm-simd-threaded.wasm`,
  phWasm: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
  phData: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
  voices: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/',
};
const CACHE = 'qc-voces-v1';
const ENGINE_FILES = ['ortWasm', 'phWasm', 'phData'];
let over = {}; // para pruebas: rutas locales
function url(k) { return over[k] || SRC[k]; }
function vpath(key) { // es_MX-claude-high -> es/es_MX/claude/high/es_MX-claude-high.onnx
  const [loc, name, q] = key.split('-'); return `${loc.split('_')[0]}/${loc}/${name}/${q}/${key}.onnx`;
}
function vurl(key, ext) { return over.voiceBase ? over.voiceBase(key, ext) : SRC.voices + vpath(key) + ext; }

async function cacheGet(u) { try { const c = await caches.open(CACHE); const r = await c.match(u); return r ? await r.arrayBuffer() : null; } catch (e) { return null; } }
async function cachePut(u, buf) { try { const c = await caches.open(CACHE); await c.put(u, new Response(buf)); } catch (e) { } }
async function fetchBuf(u, onProg) {
  const hit = await cacheGet(u); if (hit) return hit;
  const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status);
  const total = +r.headers.get('content-length') || 0; const rd = r.body && r.body.getReader();
  let buf;
  if (!rd) buf = await r.arrayBuffer();
  else { const parts = []; let got = 0; for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProg && onProg(got, total); }
    const out = new Uint8Array(got); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } buf = out.buffer; }
  await cachePut(u, buf); return buf;
}
async function has(u) { try { const c = await caches.open(CACHE); return !!(await c.match(u)); } catch (e) { return false; } }

const SIZE = { engine: 33e6 };
export async function engineReady() { for (const k of ENGINE_FILES) if (!(await has(url(k)))) return false; return true; }
export async function voiceReady(key) { return (await has(vurl(key, ''))) && (await has(vurl(key, '.json'))) && engineReady(); }
export async function download(key, onProg) {
  const list = [];
  if (!(await engineReady())) for (const k of ENGINE_FILES) list.push(url(k));
  list.push(vurl(key, '.json'), vurl(key, ''));
  const sizes = list.map(u => u.endsWith('.onnx') ? 63e6 : u.endsWith('.data') ? 18e6 : u.endsWith('ort-wasm-simd-threaded.wasm') ? 14e6 : 6e5);
  const T = sizes.reduce((a, b) => a + b, 0); let done = 0;
  for (let i = 0; i < list.length; i++) { await fetchBuf(list[i], (g, t) => onProg && onProg(Math.min(.999, (done + (t ? g / t * sizes[i] : Math.min(g, sizes[i]))) / T))); done += sizes[i]; }
  onProg && onProg(1);
}
export async function remove(key) { try { const c = await caches.open(CACHE); await c.delete(vurl(key, '')); await c.delete(vurl(key, '.json')); } catch (e) { } }

let ortInit = null, ph = null; const SESS = new Map();
async function initOrt() {
  if (!ortInit) ortInit = (async () => {
    ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false; ort.env.wasm.simd = true;
    ort.env.wasm.wasmBinary = await fetchBuf(url('ortWasm'));
  })();
  return ortInit;
}
async function blobUrl(k, type) { const b = await fetchBuf(url(k)); return URL.createObjectURL(new Blob([b], { type })); }
let PHU = null;
async function phonemize(text, voice) {
  if (!PHU) PHU = { w: await blobUrl('phWasm', 'application/wasm'), d: await blobUrl('phData', 'application/octet-stream') };
  return new Promise(async (resolve, reject) => {
    let out = null;
    const m = await createPiperPhonemize({ print: d => { try { out = JSON.parse(d).phoneme_ids; resolve(out); } catch (e) { reject(e); } }, printErr: e => { }, locateFile: u => u.endsWith('.wasm') ? PHU.w : u.endsWith('.data') ? PHU.d : u });
    m.callMain(['-l', voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
    setTimeout(() => { if (!out) reject(new Error('phonemize')); }, 20000);
  });
}
async function session(key) {
  if (SESS.has(key)) return SESS.get(key);
  const p = (async () => { await initOrt(); const cfg = JSON.parse(new TextDecoder().decode(await fetchBuf(vurl(key, '.json'))));
    const s = await ort.InferenceSession.create(new Uint8Array(await fetchBuf(vurl(key, ''))), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }); return { s, cfg }; })();
  SESS.set(key, p); p.catch(() => SESS.delete(key)); return p;
}
// cola: el motor procesa una frase a la vez
let Q = Promise.resolve();
export function synth(text, key, rate = 1, speaker = 0) {
  const job = Q.then(async () => {
    const { s, cfg } = await session(key);
    const parts = String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?¡¿…])\s+/).filter(Boolean);
    const sr = cfg.audio.sample_rate, chunks = []; let n = 0;
    for (const t of parts.length ? parts : [text]) {
      const ids = await phonemize(t, cfg.espeak.voice);
      const feeds = { input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]), input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([cfg.inference.noise_scale, cfg.inference.length_scale / (rate || 1), cfg.inference.noise_w]), [3]) };
      if (cfg.num_speakers > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(speaker)]), [1]);
      const r = await s.run(feeds); const pcm = r.output.data; chunks.push(pcm); n += pcm.length + Math.round(sr * .12);
    }
    const out = new Float32Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length + Math.round(sr * .12); }
    let mx = 0; for (let i = 0; i < out.length; i++) mx = Math.max(mx, Math.abs(out[i])); if (mx > 0) { const g = .92 / mx; for (let i = 0; i < out.length; i++) out[i] *= g; }
    return { pcm: out, sr };
  });
  Q = job.catch(() => { }); return job;
}
export function wav(pcm, sr) {
  const b = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(b), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true); return b;
}
export function _override(o) { over = o || {}; }
