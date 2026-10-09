/* 内容索引：词库归一化、词典、对话与句型查询 */
import { CORE_RAW, SOCIAL_RAW } from './vocab-core.js';
import { WORK_RAW } from './vocab-work.js';
import { HVAC_RAW } from './vocab-hvac.js';
import { BAS_RAW } from './vocab-bas.js';
import { EXTRA } from './dict-extra.js';
import { DIALOGUES_LIFE } from './dialogues.js';
import { DIALOGUES_PRO } from './dialogues-pro.js';
import { PATTERNS, DRILLS } from './patterns.js';
import { CONCEPTS, PRODUCTS, TALKS, FAQ, ACRONYMS, PRO_NOTE } from './pro.js';
import { PHASES, WEEKS, PLAN_DAYS, planForDay, phaseForDay, METHODS } from './plan.js';
import { lemmaCandidates, normWord } from '../core/util.js';

export const DECKS = [
  { id: 'core', name: '核心日常', sub: '生存与生活高频词', ico: 'book-open', tone: 'p', level: 1, phase: [1, 90] },
  { id: 'social', name: '社交旅行', sub: '闲聊、出行、感受表达', ico: 'messages-square', tone: 'c', level: 2, phase: [31, 120] },
  { id: 'work', name: '职场商务', sub: '会议、报价、谈判', ico: 'briefcase', tone: 'b', level: 3, phase: [61, 180] },
  { id: 'hvac', name: '暖通空调', sub: 'HVAC 术语与工程表达', ico: 'wind', tone: 'g', level: 4, phase: [121, 180] },
  { id: 'bas', name: '楼宇自控', sub: 'BAS、协议与控制序列', ico: 'cpu', tone: 'v', level: 5, phase: [151, 180] },
];

const RAW = { core: CORE_RAW, social: SOCIAL_RAW, work: WORK_RAW, hvac: HVAC_RAW, bas: BAS_RAW };

const buildWords = () => {
  const out = [];
  for (const deck of DECKS) {
    const rows = RAW[deck.id] || [];
    rows.forEach((r, i) => {
      const [en, ipa, pos, zh, ex, exZh] = r;
      out.push({
        id: `${deck.id}:${String(en).toLowerCase()}`,
        en, ipa, pos, zh, ex, exZh,
        deck: deck.id, idx: i, level: deck.level,
      });
    });
  }
  return out;
};

export const WORDS = buildWords();
export const WORDS_BY_DECK = Object.fromEntries(DECKS.map((d) => [d.id, WORDS.filter((w) => w.deck === d.id)]));
export const deckById = (id) => DECKS.find((d) => d.id === id);
export const wordById = (id) => WORDS.find((w) => w.id === id);

/* ---------- 词典 ---------- */
const DICT = new Map();
const put = (key, val) => {
  const k = normWord(key);
  if (!k || DICT.has(k)) return;
  DICT.set(k, val);
};

for (const w of WORDS) {
  put(w.en, { en: w.en, ipa: w.ipa, pos: w.pos, zh: w.zh, ex: w.ex, exZh: w.exZh, deck: w.deck, id: w.id, gloss: w.zh });
}
for (const [en, zh] of EXTRA) put(en, { en, zh, gloss: zh, pos: '—', ipa: '' });
for (const p of PATTERNS) put(p[0], { en: p[0], zh: p[1], gloss: p[1], pos: 'phr.', ipa: '', pattern: true });

export const lookup = (token) => {
  for (const cand of lemmaCandidates(token)) {
    const hit = DICT.get(cand);
    if (hit) return { ...hit, matched: cand, original: normWord(token) };
  }
  return null;
};

export const dictSize = () => DICT.size;

export const searchWords = (q, limit = 30) => {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  const out = [];
  for (const w of WORDS) {
    if (w.en.toLowerCase().includes(s) || w.zh.includes(q)) out.push(w);
    if (out.length >= limit) break;
  }
  return out;
};

/* ---------- 对话 ---------- */
export const DIALOGUES = [...DIALOGUES_LIFE, ...DIALOGUES_PRO];
export const dialogueById = (id) => DIALOGUES.find((d) => d.id === id);
export const DIALOGUE_CATS = [
  { id: 'all', name: '全部', ico: 'layers' },
  { id: 'daily', name: '日常生活', ico: 'house' },
  { id: 'social', name: '社交旅行', ico: 'messages-square' },
  { id: 'work', name: '职场商务', ico: 'briefcase' },
  { id: 'hvac', name: '暖通空调', ico: 'wind' },
  { id: 'bas', name: '楼宇自控', ico: 'cpu' },
  { id: 'pro', name: '项目实战', ico: 'route' },
];
export const dialoguesByCat = (cat) => (cat === 'all' ? DIALOGUES : DIALOGUES.filter((d) => d.cat === cat));
export const catName = (id) => DIALOGUE_CATS.find((c) => c.id === id)?.name || id;
export const catIco = (id) => DIALOGUE_CATS.find((c) => c.id === id)?.ico || 'message-circle';

/* ---------- 句型与发音 ---------- */
export { PATTERNS, DRILLS, CONCEPTS, PRODUCTS, TALKS, FAQ, ACRONYMS, PRO_NOTE, PHASES, WEEKS, PLAN_DAYS, planForDay, phaseForDay, METHODS };

export const patternsByTag = (tag) => (tag === 'all' ? PATTERNS : PATTERNS.filter((p) => p[2] === tag));
export const PATTERN_TAGS = [
  { id: 'all', name: '全部' },
  { id: 'daily', name: '生存口语' },
  { id: 'social', name: '日常社交' },
  { id: 'work', name: '职场' },
  { id: 'biz', name: '商务客户' },
  { id: 'hvac', name: '暖通' },
  { id: 'bas', name: '楼控' },
  { id: 'talk', name: '演讲演示' },
];

/* ---------- 学习句子池（跟读用） ---------- */
export const sentencePool = (deckIds = ['core']) => {
  const seen = new Set();
  const out = [];
  for (const d of DIALOGUES) {
    for (const [sp, en, zh] of d.lines) {
      const k = en.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ en, zh, from: d.title, id: d.id, speaker: sp });
    }
  }
  for (const w of WORDS) {
    if (!deckIds.includes(w.deck)) continue;
    const k = (w.ex || '').toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ en: w.ex, zh: w.exZh, from: '单词例句', id: w.id, word: w.en });
  }
  for (const p of PATTERNS) {
    const k = p[0].toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ en: p[0], zh: p[1], from: '句型库', id: 'pat:' + k.slice(0, 18) });
  }
  return out;
};

/* ---------- 专业术语池 ---------- */
export const proTerms = (area) => WORDS.filter((w) => w.deck === area);
export const proSentences = (area) => {
  const out = [];
  for (const c of CONCEPTS.filter((c) => c.area === area)) {
    for (const en of c.en) out.push({ en, zh: c.title, from: c.titleEn, id: c.id });
  }
  for (const t of TALKS) {
    for (const [en, zh] of t.script) out.push({ en, zh, from: t.title, id: t.id, pro: true });
  }
  return out;
};

export const stats = () => ({
  words: WORDS.length,
  dialogues: DIALOGUES.length,
  lines: DIALOGUES.reduce((n, d) => n + d.lines.length, 0),
  patterns: PATTERNS.length,
  drills: DRILLS.length,
  concepts: CONCEPTS.length,
  talks: TALKS.length,
  faq: FAQ.length,
  days: PLAN_DAYS.length,
  dict: DICT.size,
});
