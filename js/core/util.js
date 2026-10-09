/* English Coach — shared helpers */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const shuffle = (arr, rnd = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];

export const sample = (arr, n, rnd = Math.random) => shuffle(arr, rnd).slice(0, Math.max(0, n));

export const uniqBy = (arr, keyFn) => {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
};

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- dates (local, day-granular) ---------- */
export const DAY = 86400000;

export const dayKey = (d = new Date()) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};

export const parseKey = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const dateDiff = (aKey, bKey) =>
  Math.round((parseKey(aKey).getTime() - parseKey(bKey).getTime()) / DAY);

export const addDays = (key, n) => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

export const fmtDate = (key, opt = { month: 'long', day: 'numeric', weekday: 'long' }) =>
  parseKey(key).toLocaleDateString('zh-CN', opt);

export const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

export const weekdayShort = (key) =>
  ['日', '一', '二', '三', '四', '五', '六'][parseKey(key).getDay()];

/* ---------- text ---------- */
export const stripPunct = (w) => String(w).replace(/^[^A-Za-z0-9'’-]+|[^A-Za-z0-9'’-]+$/g, '');

export const normWord = (w) => stripPunct(w).toLowerCase().replace(/[’]/g, "'");

const IRREG = {
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  has: 'have', had: 'have', having: 'have', does: 'do', did: 'do', done: 'do', doing: 'do',
  went: 'go', gone: 'go', goes: 'go', said: 'say', says: 'say', made: 'make', took: 'take',
  taken: 'take', came: 'come', got: 'get', gotten: 'get', gave: 'give', given: 'give',
  saw: 'see', seen: 'see', knew: 'know', known: 'know', thought: 'think', told: 'tell',
  found: 'find', left: 'leave', felt: 'feel', kept: 'keep', held: 'hold', brought: 'bring',
  bought: 'buy', sent: 'send', built: 'build', spent: 'spend', sold: 'sell', met: 'meet',
  ran: 'run', ate: 'eat', eaten: 'eat', drank: 'drink', drank2: 'drink', wrote: 'write',
  written: 'write', read: 'read', spoke: 'speak', spoken: 'speak', broke: 'break',
  chosen: 'choose', chose: 'choose', drove: 'drive', driven: 'drive', flew: 'fly',
  grew: 'grow', grown: 'grow', lost: 'lose', put: 'put', set: 'set', led: 'lead',
  won: 'win', sat: 'sit', stood: 'stand', understood: 'understand', became: 'become',
  began: 'begin', begun: 'begin', forgot: 'forget', forgot2: 'forget', froze: 'freeze',
  children: 'child', men: 'man', women: 'woman', people: 'person', feet: 'foot',
  teeth: 'tooth', mice: 'mouse', geese: 'goose', data: 'data', criteria: 'criterion',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad', more: 'more', most: 'more',
};

export const lemmaCandidates = (word) => {
  const w = normWord(word);
  const out = new Set([w]);
  if (!w) return [];
  if (IRREG[w]) out.add(IRREG[w]);
  if (w.endsWith("'s")) out.add(w.slice(0, -2));
  if (w.endsWith('ies') && w.length > 4) out.add(w.slice(0, -3) + 'y');
  if (w.endsWith('es') && w.length > 3) out.add(w.slice(0, -2));
  if (w.endsWith('s') && w.length > 3) out.add(w.slice(0, -1));
  if (w.endsWith('ed') && w.length > 4) { out.add(w.slice(0, -2)); out.add(w.slice(0, -1)); }
  if (w.endsWith('ing') && w.length > 5) {
    out.add(w.slice(0, -3));
    out.add(w.slice(0, -3) + 'e');
    if (/([b-df-hj-np-tv-z])\1$/.test(w.slice(0, -3))) out.add(w.slice(0, -4));
  }
  if (w.endsWith('er') && w.length > 4) out.add(w.slice(0, -2));
  if (w.endsWith('est') && w.length > 5) out.add(w.slice(0, -3));
  if (w.endsWith('ly') && w.length > 4) out.add(w.slice(0, -2));
  return [...out];
};

export const tokens = (text) => String(text).split(/(\s+|[,.!?;:"()\[\]—–-])/);

export const wordsOnly = (text) =>
  (String(text).match(/[A-Za-z][A-Za-z'’-]*/g) || []).map((w) => w.toLowerCase());

/* word-level similarity between what was said and what was expected (0..1) */
export const wordScore = (expected, said) => {
  const a = wordsOnly(expected);
  const b = wordsOnly(said);
  if (!a.length) return 0;
  if (!b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const same = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + same);
    }
  }
  return clamp(1 - dp[a.length][b.length] / Math.max(a.length, b.length), 0, 1);
};

export const pct = (v) => Math.round(clamp(v, 0, 1) * 100);

/* ---------- misc ---------- */
export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const debounce = (fn, ms = 250) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export const haptic = (p = 8) => {
  try { navigator.vibrate?.(p); } catch {}
};

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isSafari = () => /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

export const storageOK = (() => {
  try {
    localStorage.setItem('__t', '1');
    localStorage.removeItem('__t');
    return true;
  } catch { return false; }
})();

export const fmtNum = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : String(n));

export const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
