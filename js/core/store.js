/* English Coach — state, persistence, SRS, XP, streaks, achievements */
import { addDays, clamp, dateDiff, dayKey, storageOK, uid } from './util.js';

const KEY = 'ec.state.v1';
const HISTORY_CAP = 400;

export const DEFAULT_SETTINGS = {
  voiceURI: '',
  rate: 0.95,
  accent: 'en-US',
  showZh: true,
  autoPlay: true,
  tapLook: true,
  slowFirst: false,
  reminderTime: '20:00',
  reminderOn: true,
  remindWeekend: true,
  sound: true,
  goalPerDay: 1,
  onlineLookup: true,
  theme: 'auto',
  hapticsOn: true,
};

const freshState = () => ({
  v: 1,
  id: uid('u'),
  created: Date.now(),
  profile: {
    name: '',
    level: 'beginner',
    goal: 'conversation',
    dailyMinutes: 30,
    startDate: dayKey(),
    track: 'both',
  },
  settings: { ...DEFAULT_SETTINGS },
  stats: {
    xp: 0, coins: 0, streak: 0, bestStreak: 0, lastStudy: '',
    minutes: 0, sessions: 0, answers: 0, correct: 0,
    speakTries: 0, speakBest: 0, gameWins: 0, perfectDays: 0,
  },
  days: {},
  srs: {},
  words: { learned: {}, starred: {}, wrong: {}, seen: {} },
  badges: {},
  history: [],
  gameBest: {},
  dialoguesDone: {},
  createdAt: Date.now(),
});

const listeners = new Set();
let state = freshState();
let saveTimer = null;

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (evt) => listeners.forEach((fn) => { try { fn(state, evt); } catch (e) { console.error(e); } });

export const getState = () => state;

export const load = () => {
  if (!storageOK) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...freshState(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) } };
      state.stats = { ...freshState().stats, ...(parsed.stats || {}) };
      state.words = { learned: {}, starred: {}, wrong: {}, seen: {}, ...(parsed.words || {}) };
    }
  } catch (e) {
    console.warn('[store] load failed, starting fresh', e);
  }
  return state;
};

export const save = (immediate = false) => {
  if (!storageOK) return;
  clearTimeout(saveTimer);
  const doIt = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('[store] save failed', e); }
  };
  if (immediate) doIt(); else saveTimer = setTimeout(doIt, 200);
};

export const set = (fn, evt = 'change', immediate = false) => {
  fn(state);
  save(immediate);
  emit(evt);
};

/* ---------- profile / settings ---------- */
export const updateProfile = (patch) => set((s) => Object.assign(s.profile, patch), 'profile');
export const updateSettings = (patch) => set((s) => Object.assign(s.settings, patch), 'settings');

/* ---------- XP / levels ---------- */
export const levelInfo = (xp) => {
  let level = 1, need = 260, base = 0;
  while (xp >= base + need && level < 99) { base += need; level++; need = Math.round(need * 1.22); }
  return { level, base, need, into: xp - base, ratio: (xp - base) / need };
};

export const LEVEL_TITLES = [
  '刚开口', '敢开口', '能搭话', '日常能聊', '场景达人', '交流顺畅',
  '职场自如', '商务沟通', '专业讲解', '谈判高手', '客户顾问', '双语思维',
];
export const levelTitle = (level) => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 2))];

export const addXP = (n, reason = '') => {
  if (!n) return;
  set((s) => {
    s.stats.xp += n;
    s.history.unshift({ t: Date.now(), xp: n, reason });
    if (s.history.length > HISTORY_CAP) s.history.length = HISTORY_CAP;
  }, 'xp');
};

export const addCoins = (n) => set((s) => { s.stats.coins = Math.max(0, s.stats.coins + n); }, 'coins');

/* ---------- day records ---------- */
export const todayRec = (key = dayKey()) => {
  if (!state.days[key]) state.days[key] = { tasks: {}, xp: 0, minutes: 0, speak: 0, words: 0, games: 0, perfect: false };
  return state.days[key];
};

export const taskDone = (taskId, key = dayKey()) => !!state.days[key]?.tasks?.[taskId];

export const markTask = (taskId, ok = true) => {
  const key = dayKey();
  const rec = todayRec(key);
  const was = !!rec.tasks[taskId];
  if (ok && !was) { rec.tasks[taskId] = Date.now(); }
  else if (!ok) { delete rec.tasks[taskId]; }
  save(); emit('tasks');
  return { changed: was !== ok };
};

export const addMinutes = (n) => set((s) => { todayRec().minutes += n; s.stats.minutes += n; }, 'time');

export const touchDay = () => {
  const key = dayKey();
  set((s) => {
    const rec = todayRec(key);
    rec.last = Date.now();
    if (s.stats.lastStudy !== key) {
      const gap = s.stats.lastStudy ? dateDiff(key, s.stats.lastStudy) : 999;
      if (gap === 1) s.stats.streak += 1;
      else if (gap > 1) s.stats.streak = 1;
      else if (!s.stats.lastStudy) s.stats.streak = 1;
      s.stats.bestStreak = Math.max(s.stats.bestStreak, s.stats.streak);
      s.stats.lastStudy = key;
    }
  }, 'streak', true);
};

export const dayComplete = (key = dayKey()) => {
  const rec = state.days[key];
  if (!rec) return false;
  return Object.keys(rec.tasks || {}).length > 0;
};

/* ---------- spaced repetition (Leitner/SM-2 hybrid) ---------- */
const BOX_MINUTES = [0, 15, 60 * 8, 60 * 24, 60 * 24 * 3, 60 * 24 * 7, 60 * 24 * 16, 60 * 24 * 38, 60 * 24 * 90];

export const cardFor = (wordId) => {
  if (!state.srs[wordId]) {
    state.srs[wordId] = { box: 0, due: 0, reps: 0, lapses: 0, ease: 2.5, last: 0 };
  }
  return state.srs[wordId];
};

/** grade: 0 = 忘了, 1 = 有点难, 2 = 记得, 3 = 太简单 */
export const gradeCard = (wordId, grade) => {
  const now = Date.now();
  const c = cardFor(wordId);
  c.reps += 1;
  c.last = now;
  if (grade === 0) {
    c.box = 1; c.lapses += 1; c.ease = clamp(c.ease - 0.2, 1.3, 2.8);
  } else {
    c.ease = clamp(c.ease + (grade === 3 ? 0.14 : grade === 1 ? -0.06 : 0.04), 1.3, 2.8);
    const step = grade === 1 ? 1 : grade === 3 ? 2 : 1;
    c.box = clamp(c.box + step, 1, BOX_MINUTES.length - 1);
  }
  const mins = BOX_MINUTES[c.box] || 15;
  const easeBoost = c.ease / 2.5;
  c.due = now + Math.round(mins * easeBoost) * 60000;
  state.words.seen[wordId] = (state.words.seen[wordId] || 0) + 1;
  if (grade >= 2) state.words.learned[wordId] = true;
  if (grade === 0) state.words.wrong[wordId] = (state.words.wrong[wordId] || 0) + 1;
  set(() => {}, 'srs', true);
  return c;
};

export const isDue = (wordId, now = Date.now()) => {
  const c = state.srs[wordId];
  if (!c) return false;
  return c.due <= now;
};

export const dueList = (pool, now = Date.now()) => {
  const ids = pool.map((w) => w.id).filter((id) => isDue(id, now));
  ids.sort((a, b) => (state.srs[a]?.due || 0) - (state.srs[b]?.due || 0));
  return ids;
};

export const newList = (pool, n) =>
  pool.filter((w) => !state.srs[w.id]).slice(0, n).map((w) => w.id);

export const masteryOf = (pool) => {
  if (!pool.length) return 0;
  let sum = 0;
  for (const w of pool) {
    const c = state.srs[w.id];
    sum += c ? clamp((c.box - 1) / 6, 0, 1) : 0;
  }
  return sum / pool.length;
};

export const deckStats = (pool) => {
  const now = Date.now();
  let seen = 0, learned = 0, due = 0, fresh = 0;
  for (const w of pool) {
    const c = state.srs[w.id];
    if (!c) { fresh++; continue; }
    seen++;
    if (c.due <= now) due++;
    if (state.words.learned[w.id]) learned++;
  }
  return { total: pool.length, seen, learned, due, fresh };
};

/* ---------- answers ---------- */
export const recordAnswer = (correct, wordId = null, meta = {}) => {
  set((s) => {
    s.stats.answers += 1;
    if (correct) s.stats.correct += 1;
    const rec = todayRec();
    rec.xp = (rec.xp || 0) + (correct ? 10 : 2);
    if (wordId && !correct) s.words.wrong[wordId] = (s.words.wrong[wordId] || 0) + 1;
    if (wordId && correct) {
      const n = (s.words.wrong[wordId] || 0) - 1;
      if (n <= 0) delete s.words.wrong[wordId]; else s.words.wrong[wordId] = n;
    }
    if (meta.game) s.gameBest[meta.game] = Math.max(s.gameBest[meta.game] || 0, meta.score || 0);
  }, 'answer');
  addXP(correct ? 10 : 2);
};

export const toggleStar = (wordId) => {
  let on = false;
  set((s) => {
    if (s.words.starred[wordId]) delete s.words.starred[wordId];
    else { s.words.starred[wordId] = Date.now(); on = true; }
  }, 'star', true);
  return on;
};

export const markDialogueDone = (id, score = 1) => {
  set((s) => {
    const prev = s.dialoguesDone[id];
    s.dialoguesDone[id] = { times: (prev?.times || 0) + 1, best: Math.max(prev?.best || 0, score), last: Date.now() };
  }, 'dialogue', true);
};

/* ---------- achievements ---------- */
export const BADGES = [
  { id: 'first-step', name: '第一步', desc: '完成第一个任务', ico: 'rocket', tone: 'p' },
  { id: 'streak-3', name: '三日不断', desc: '连续学习 3 天', ico: 'flame', tone: 'a' },
  { id: 'streak-7', name: '一周坚持', desc: '连续学习 7 天', ico: 'flame', tone: 'a' },
  { id: 'streak-30', name: '月度铁人', desc: '连续学习 30 天', ico: 'medal', tone: 'a' },
  { id: 'words-50', name: '五十词汇', desc: '掌握 50 个单词', ico: 'book-open', tone: 'b' },
  { id: 'words-200', name: '两百词汇', desc: '掌握 200 个单词', ico: 'library', tone: 'b' },
  { id: 'words-400', name: '四百词汇', desc: '掌握 400 个单词', ico: 'graduation-cap', tone: 'b' },
  { id: 'speak-1', name: '第一句英语', desc: '完成首次跟读', ico: 'mic', tone: 'v' },
  { id: 'speak-50', name: '开口五十次', desc: '累计跟读 50 次', ico: 'mic-vocal', tone: 'v' },
  { id: 'speak-90', name: '发音九十', desc: '跟读得分达到 90', ico: 'badge-check', tone: 'v' },
  { id: 'dlg-5', name: '场景新手', desc: '完成 5 个场景对话', ico: 'messages-square', tone: 'c' },
  { id: 'dlg-20', name: '场景老手', desc: '完成 20 个场景对话', ico: 'message-square-quote', tone: 'c' },
  { id: 'game-first', name: '闯关开始', desc: '完成第一局游戏', ico: 'gamepad-2', tone: 'g' },
  { id: 'game-10', name: '闯关十局', desc: '完成 10 局游戏', ico: 'trophy', tone: 'g' },
  { id: 'pro-hvac', name: '暖通入门', desc: '完成暖通空调基础模块', ico: 'wind', tone: 'b' },
  { id: 'pro-bas', name: '楼控入门', desc: '完成楼宇自控基础模块', ico: 'cpu', tone: 'v' },
  { id: 'pro-talk', name: '产品讲解员', desc: '完成 10 次专业讲解演练', ico: 'presentation', tone: 'b' },
  { id: 'xp-1000', name: '千点经验', desc: '累计获得 1000 XP', ico: 'zap', tone: 'a' },
  { id: 'xp-5000', name: '五千经验', desc: '累计获得 5000 XP', ico: 'sparkles', tone: 'a' },
  { id: 'perfect', name: '满分一天', desc: '一天内完成全部计划任务', ico: 'party-popper', tone: 'p' },
];

export const earnedBadges = () => Object.keys(state.badges);

export const evaluateBadges = () => {
  const s = state;
  const learned = Object.keys(s.words.learned).length;
  const dlg = Object.keys(s.dialoguesDone).length;
  const tests = {
    'first-step': () => Object.values(s.days).some((d) => Object.keys(d.tasks || {}).length > 0),
    'streak-3': () => s.stats.streak >= 3,
    'streak-7': () => s.stats.streak >= 7,
    'streak-30': () => s.stats.streak >= 30,
    'words-50': () => learned >= 50,
    'words-200': () => learned >= 200,
    'words-400': () => learned >= 400,
    'speak-1': () => s.stats.speakTries >= 1,
    'speak-50': () => s.stats.speakTries >= 50,
    'speak-90': () => s.stats.speakBest >= 90,
    'dlg-5': () => dlg >= 5,
    'dlg-20': () => dlg >= 20,
    'game-first': () => s.stats.sessions >= 1,
    'game-10': () => s.stats.sessions >= 10,
    'pro-hvac': () => !!s.progress?.hvacDone,
    'pro-bas': () => !!s.progress?.basDone,
    'pro-talk': () => (s.progress?.talks || 0) >= 10,
    'xp-1000': () => s.stats.xp >= 1000,
    'xp-5000': () => s.stats.xp >= 5000,
    perfect: () => !!s.progress?.perfectDay,
  };
  const newly = [];
  for (const b of BADGES) {
    if (!s.badges[b.id] && tests[b.id]?.()) { s.badges[b.id] = Date.now(); newly.push(b); }
  }
  if (newly.length) { save(true); emit('badges'); }
  return newly;
};

/* ---------- export / import ---------- */
export const exportData = () => JSON.stringify({ ...state, exportedAt: Date.now() }, null, 1);

export const importData = (json) => {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !parsed.profile) throw new Error('不是有效的备份文件');
  state = { ...freshState(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) } };
  save(true); emit('import');
  return true;
};

export const resetAll = () => {
  state = freshState();
  save(true); emit('reset');
};

/* ---------- plan progress ---------- */
export const planDay = () => {
  const start = state.profile.startDate || dayKey();
  const diff = dateDiff(dayKey(), start);
  return clamp(Math.floor(diff) + 1, 1, 180);
};

export const planDayDate = (n) => {
  const start = state.profile.startDate || dayKey();
  return addDays(start, n - 1);
};

export const bumpProgress = (patch) => set((s) => { s.progress = { ...(s.progress || {}), ...patch }; }, 'progress', true);
