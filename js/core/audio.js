/* 真人发音音频层：优先播放预生成的神经语音，缺失时回退到系统 TTS
   音频由 Piper（本地神经语音）+ LJSpeech 公有领域音色离线生成，
   文件名为文本的 FNV-1a 哈希，index.json 列出已生成的条目。 */

const INDEX_URL = './audio/index.json';
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** 与生成脚本保持完全一致的归一化：只统一引号与空白 */
export const audioKey = (text) =>
  String(text ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

export const fnv1a = (text) => {
  let h = FNV_OFFSET >>> 0;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

let index = null;
let loading = null;
let current = null;
let currentUrl = null;

export const loadAudioIndex = () => {
  if (index) return Promise.resolve(index);
  if (loading) return loading;
  loading = fetch(INDEX_URL, { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      index = {
        w: new Set(j?.w || []),
        s: new Set(j?.s || []),
        meta: j || null,
      };
      return index;
    })
    .catch(() => {
      index = { w: new Set(), s: new Set(), meta: null };
      return index;
    });
  return loading;
};

export const audioUrlFor = (text, kind = 's') => {
  if (!index) return null;
  const k = audioKey(text);
  if (!k) return null;
  const hash = fnv1a(k);
  if (index[kind]?.has(hash)) return `./audio/${kind}/${hash}.mp3`;
  const other = kind === 'w' ? 's' : 'w';
  if (index[other]?.has(hash)) return `./audio/${other}/${hash}.mp3`;
  return null;
};

/** 播放一条预生成音频；成功返回 true，失败返回 false（调用方回退 TTS） */
export const playClip = (url, { rate = 1, onEnd } = {}) =>
  new Promise((resolve) => {
    stopClip();
    let audio;
    try {
      audio = new Audio(url);
    } catch {
      resolve(false);
      return;
    }
    audio.preload = 'auto';
    audio.volume = 1;
    try { audio.preservesPitch = true; } catch {}
    try { audio.mozPreservesPitch = true; } catch {}
    try { audio.webkitPreservesPitch = true; } catch {}
    audio.playbackRate = rate;
    current = audio;
    currentUrl = url;
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (current === audio) { current = null; currentUrl = null; }
      onEnd?.();
      resolve(ok);
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    audio.onstalled = () => {};
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => finish(false));
    }
    // 兜底：极端情况下既不报错也不结束时释放
    setTimeout(() => finish(true), 30000);
  });

export const stopClip = () => {
  if (!current) return;
  const a = current;
  current = null;
  currentUrl = null;
  try { a.pause(); } catch {}
  try { a.currentTime = 0; } catch {}
};

export const playingClip = () => !!current;
export const clipState = () => ({ playing: !!current, url: currentUrl, ready: !!index, human: index ? index.w.size + index.s.size : 0 });

/** 预热索引（首次播放前调用，避免第一次点击等待） */
export const warmAudio = () => loadAudioIndex();
