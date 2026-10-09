/* English Coach — TTS, speech recognition, recording */

let voices = [];
let voicesReady = false;
const voiceListeners = new Set();

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const PREFERRED = [
  'Samantha', 'Alex', 'Ava', 'Allison', 'Susan', 'Karen', 'Daniel', 'Moira', 'Tessa',
  'Google US English', 'Google UK English Female', 'Microsoft Aria Online (Natural) - English (United States)',
];

export const loadVoices = () =>
  new Promise((resolve) => {
    if (!ttsSupported) return resolve([]);
    const grab = () => {
      voices = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
      if (voices.length || voicesReady) {
        voicesReady = true;
        voiceListeners.forEach((fn) => fn(voices));
        resolve(voices);
        return true;
      }
      return false;
    };
    if (grab()) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (grab() || tries > 20) {
        clearInterval(t);
        if (!voices.length) { voicesReady = true; resolve(voices); }
      }
    }, 150);
    speechSynthesis.addEventListener?.('voiceschanged', () => { grab(); }, { once: true });
  });

export const getVoices = () => voices;

export const onVoices = (fn) => { voiceListeners.add(fn); return () => voiceListeners.delete(fn); };

export const pickVoice = (wantURI, accent = 'en-US') => {
  if (!voices.length) return null;
  if (wantURI) {
    const hit = voices.find((v) => v.voiceURI === wantURI || v.name === wantURI);
    if (hit) return hit;
  }
  const norm = (s) => s.replace('_', '-').toLowerCase();
  const sameAccent = voices.filter((v) => norm(v.lang).startsWith(accent.toLowerCase()));
  const pool = sameAccent.length ? sameAccent : voices;
  for (const name of PREFERRED) {
    const hit = pool.find((v) => v.name.includes(name));
    if (hit) return hit;
  }
  return pool.find((v) => v.localService) || pool[0];
};

let currentUtter = null;

export const stopSpeak = () => {
  if (!ttsSupported) return;
  try { speechSynthesis.cancel(); } catch {}
  currentUtter = null;
};

export const speak = (text, { rate = 0.95, accent = 'en-US', voiceURI = '', onEnd, pitch = 1 } = {}) => {
  if (!ttsSupported || !text) { onEnd?.(); return Promise.resolve(); }
  stopSpeak();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(String(text));
    const v = pickVoice(voiceURI, accent);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = accent; }
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => { currentUtter = null; onEnd?.(); resolve(); };
    u.onerror = () => { currentUtter = null; onEnd?.(); resolve(); };
    currentUtter = u;
    try { speechSynthesis.speak(u); } catch { resolve(); }
  });
};

export const speaking = () => ttsSupported && (speechSynthesis.speaking || !!currentUtter);

export const speakSeq = async (items, opts = {}) => {
  for (const it of items) {
    if (opts.signal?.cancelled) return;
    await speak(typeof it === 'string' ? it : it.text, typeof it === 'string' ? opts : { ...opts, ...it });
    await new Promise((r) => setTimeout(r, opts.gap ?? 260));
  }
};

/* ---------- speech recognition ---------- */
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const asrSupported = () => !!SR;

export const recognize = ({ lang = 'en-US', timeout = 9000, interim = true } = {}) => {
  if (!SR) return { promise: Promise.reject(new Error('unsupported')), stop() {} };
  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = interim;
  rec.continuous = false;
  rec.maxAlternatives = 3;
  let transcript = '', confidence = 0, done = false;
  let timer = null;
  const promise = new Promise((resolve, reject) => {
    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) confidence = e.results[i][0].confidence || confidence;
      }
      transcript = text;
    };
    rec.onerror = (e) => {
      if (done) return;
      done = true; clearTimeout(timer);
      reject(new Error(e.error || 'error'));
    };
    rec.onend = () => {
      if (done) return;
      done = true; clearTimeout(timer);
      resolve({ text: transcript.trim(), confidence });
    };
    try { rec.start(); } catch (e) { reject(e); }
    timer = setTimeout(() => { try { rec.stop(); } catch {} }, timeout);
  });
  return {
    promise,
    stop: () => { try { rec.stop(); } catch {} },
    abort: () => { try { rec.abort(); } catch {} },
  };
};

/* ---------- recording ---------- */
export const micSupported = () =>
  !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

export class Recorder {
  constructor() { this.chunks = []; this.rec = null; this.stream = null; this.analyser = null; }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', ''].find(
      (m) => !m || (window.MediaRecorder?.isTypeSupported?.(m) ?? false),
    );
    this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data?.size) this.chunks.push(e.data); };
    this.rec.start();

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    src.connect(this.analyser);
    this._audioCtx = ctx;
    return this;
  }

  level() {
    if (!this.analyser) return 0;
    const buf = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 3.4);
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.rec) return resolve(null);
      this.rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' });
        this.stream?.getTracks().forEach((t) => t.stop());
        this._audioCtx?.close?.();
        resolve({ blob, url: URL.createObjectURL(blob) });
      };
      try { this.rec.stop(); } catch { resolve(null); }
    });
  }

  cancel() {
    try { this.rec?.stop(); } catch {}
    this.stream?.getTracks().forEach((t) => t.stop());
    this._audioCtx?.close?.();
  }
}

/* ---------- pronunciation scoring ---------- */
import { pct, wordScore, wordsOnly } from './util.js';

export const scoreSpeech = (expected, heard) => {
  const sim = wordScore(expected, heard);
  const said = wordsOnly(heard);
  const want = wordsOnly(expected);
  const missing = want.filter((w) => !said.includes(w));
  const extra = said.filter((w) => !want.includes(w));
  const score = pct(sim);
  let feedback = '再试一次，把每个词都读清楚。';
  if (score >= 92) feedback = '非常棒，节奏和用词都很准。';
  else if (score >= 80) feedback = '很不错，只有个别词需要再注意。';
  else if (score >= 60) feedback = '基本听懂了，注意漏读的词。';
  else if (score >= 35) feedback = '能识别出一部分，放慢速度再读一遍。';
  return { score, missing, extra, feedback };
};

export const mockScore = (expected) => {
  const base = 62 + Math.round(Math.random() * 34);
  const want = wordsOnly(expected);
  const missing = Math.random() < 0.35 && want.length > 2 ? [want[want.length - 1]] : [];
  return { score: base, missing, extra: [], feedback: base >= 80 ? '语音恢复后可以更精确，先保持节奏。' : '继续跟读，注意口型。', mock: true };
};
