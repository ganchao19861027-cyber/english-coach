/* 闯关出题引擎：所有题目由内容库实时生成，题量无限 */
import { DIALOGUES, PATTERNS, WORDS, WORDS_BY_DECK, proTerms } from '../data/index.js';
import { sample, shuffle, uniqBy, wordsOnly } from './util.js';

export const GAMES = [
  { id: 'listen', name: '听音选义', sub: '听发音，选意思', ico: 'headphones', tone: 'b', desc: '训练听力识别，先听懂再选。' },
  { id: 'meaning', name: '看词选义', sub: '看英文，选中文', ico: 'book-open', tone: 'p', desc: '快速建立词形与意思的链接。' },
  { id: 'spell', name: '拼写挑战', sub: '听发音，拼单词', ico: 'keyboard', tone: 'v', desc: '输出型训练，记得更牢。' },
  { id: 'scramble', name: '句子拼装', sub: '把词排成句子', ico: 'list-ordered', tone: 'c', desc: '训练语序与句型。' },
  { id: 'respond', name: '情景应答', sub: '选出最合适的回答', ico: 'messages-square', tone: 'g', desc: '真实对话里的反应速度。' },
  { id: 'match', name: '中英配对', sub: '连线配对，越快越好', ico: 'layers', tone: 'a', desc: '短时记忆与快速回忆。' },
  { id: 'speed', name: '极速抢答', sub: '60 秒混合题', ico: 'timer', tone: 'c', desc: '混合题型，考验反应。' },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);

const meanings = (w) => w.zh.split(/[；;，,]/)[0].trim();

const distract = (target, pool, n = 3) => {
  const sameDeck = pool.filter((w) => w.id !== target.id && w.deck === target.deck);
  const others = pool.filter((w) => w.id !== target.id && w.deck !== target.deck);
  const picks = [...sample(sameDeck, n), ...sample(others, n)];
  return uniqBy(picks, (x) => x.zh).slice(0, n);
};

export const deckPool = (deckIds = ['core']) =>
  deckIds.flatMap((id) => WORDS_BY_DECK[id] || []);

/* ---------- 单选题 ---------- */
export const makeChoice = (word, pool, { reverse = false } = {}) => {
  const ds = distract(word, pool, 3);
  if (ds.length < 3) return null;
  const options = shuffle([
    { text: reverse ? word.en : meanings(word), ok: true, id: word.id },
    ...ds.map((d) => ({ text: reverse ? d.en : meanings(d), ok: false, id: d.id })),
  ]);
  return {
    type: reverse ? 'meaning' : 'listen',
    wordId: word.id,
    prompt: reverse ? word.en : '听发音，选出正确意思',
    speak: reverse ? '' : word.en,
    sub: reverse ? word.ipa : '',
    options,
    answer: options.findIndex((o) => o.ok),
    word,
  };
};

export const makeSpell = (word, pool) => {
  const wrong1 = sample(pool.filter((w) => w.id !== word.id && Math.abs(w.en.length - word.en.length) <= 3), 1)[0];
  return {
    type: 'spell',
    wordId: word.id,
    prompt: meanings(word),
    speak: word.en,
    answer: word.en,
    hint: word.en.slice(0, Math.max(1, Math.floor(word.en.length / 3))) + '…',
    ipa: word.ipa,
    example: word.ex,
    distractor: wrong1,
    word,
  };
};

/* ---------- 句子排序 ---------- */
const SC_VOWEL = /^[aeiou]/i;
export const makeScramble = (sentence) => {
  const parts = String(sentence.en).split(/\s+/).filter(Boolean);
  if (parts.length < 4 || parts.length > 12) return null;
  const tokensArr = parts.map((t, i) => ({ t, i }));
  let shuffled = shuffle(tokensArr);
  if (shuffled.every((x, i) => x.i === i)) shuffled = shuffle(tokensArr);
  return {
    type: 'scramble',
    prompt: sentence.zh,
    from: sentence.from,
    answer: sentence.en,
    tokens: shuffled,
    speak: sentence.en,
  };
};

/* ---------- 情景应答 ---------- */
export const makeRespond = (dialogue, idx) => {
  const [, en, zh] = dialogue.lines[idx];
  const next = dialogue.lines[idx + 1];
  if (!next) return null;
  const others = [];
  for (const d of DIALOGUES) {
    for (const [, e] of d.lines) {
      if (e !== next[1] && !others.includes(e)) others.push(e);
    }
  }
  const wrongs = sample(others, 3);
  if (wrongs.length < 3) return null;
  const options = shuffle([
    { text: next[1], ok: true },
    ...wrongs.map((t) => ({ text: t, ok: false })),
  ]);
  return {
    type: 'respond',
    prompt: en,
    sub: zh,
    scene: `${dialogue.title} · ${dialogue.scene}`,
    speak: en,
    options,
    answer: options.findIndex((o) => o.ok),
  };
};

/* ---------- 配对 ---------- */
export const makeMatch = (pool, n = 6) => {
  const picks = sample(pool, n);
  if (picks.length < 4) return null;
  return {
    type: 'match',
    pairs: picks.map((w) => ({ id: w.id, en: w.en, zh: meanings(w), ipa: w.ipa })),
  };
};

/* ---------- 组装整套题 ---------- */
export const buildSet = (kind, deckIds, count = 10) => {
  const pool = deckPool(deckIds);
  const words = sample(pool, Math.min(pool.length, count * 2));
  const qs = [];
  const sentences = [];
  for (const d of DIALOGUES) d.lines.forEach((l, i) => sentences.push({ d, i, line: l }));

  if (kind === 'match') {
    const q = makeMatch(pool, 6);
    return q ? [q] : [];
  }

  for (let i = 0; i < count * 3 && qs.length < count; i++) {
    if (kind === 'meaning') {
      const w = words[i % words.length];
      const q = makeChoice(w, pool, { reverse: true });
      if (q) qs.push(q);
    } else if (kind === 'listen') {
      const w = words[i % words.length];
      const q = makeChoice(w, pool, { reverse: false });
      if (q) qs.push(q);
    } else if (kind === 'spell') {
      const w = words[i % words.length];
      qs.push(makeSpell(w, pool));
    } else if (kind === 'scramble') {
      const s = sample(sentences, 1)[0];
      const q = makeScramble({ en: s.line[1], zh: s.line[2], from: s.d.title });
      if (q) qs.push(q);
    } else if (kind === 'respond') {
      const s = sample(sentences, 1)[0];
      const q = makeRespond(s.d, s.i);
      if (q) qs.push(q);
    }
  }
  return uniqBy(qs, (q) => q.wordId || (q.type + '|' + q.prompt + '|' + (q.answer ?? '')));
};

export const buildMixed = (deckIds, count = 12) => {
  const out = [];
  const kinds = ['listen', 'meaning', 'spell', 'scramble', 'respond'];
  let i = 0;
  while (out.length < count && i < count * 4) {
    const kind = kinds[i % kinds.length];
    const q = buildSet(kind, deckIds, 1)[0];
    if (q || kind === 'match') out.push(...(q ? [q] : []));
    i++;
  }
  return out;
};

export const dailyChallenge = () => buildMixed(['core', 'social', 'work'], 12);

/* ---------- 评分辅助 ---------- */
export const spellingCheck = (input, answer) => {
  const a = wordsOnly(answer).join('');
  const b = wordsOnly(input).join('');
  if (a === b) return { ok: true, sim: 1 };
  const sim = 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
  return { ok: false, sim };
};

const levenshtein = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
};

export const starsFor = (correct, total) => {
  const r = total ? correct / total : 0;
  if (r >= 0.95) return 3;
  if (r >= 0.75) return 2;
  if (r >= 0.5) return 1;
  return 0;
};

export { PATTERNS, proTerms };
