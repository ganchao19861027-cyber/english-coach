/* 词库：SRS 记忆卡、新词学习、拼写练习、生词本 */
import { $, icon, bar, ring, sheet, toast, celebrate } from '../core/ui.js';
import { esc, pct, sample, shuffle } from '../core/util.js';
import {
  getState, deckStats, dueList, newList, gradeCard, markTask, recordAnswer,
  touchDay, toggleStar, masteryOf, addXP, todayRec, levelInfo,
} from '../core/store.js';
import { DECKS, WORDS, WORDS_BY_DECK, deckById, lookup, searchWords, PLAN_DAYS, planForDay } from '../data/index.js';
import { speak } from '../core/speech.js';
import { renderSentence } from '../core/tap.js';
import { planDay } from '../core/store.js';

const say = (t, opts = {}) => speak(t, { rate: getState().settings.rate, accent: getState().settings.accent, voiceURI: getState().settings.voiceURI, ...opts });

/* ---------- 词库首页 ---------- */
export const renderList = () => {
  const s = getState();
  const learned = Object.keys(s.words.learned).length;
  const starred = Object.keys(s.words.starred).length;
  const totalDue = dueList(WORDS).length;
  const plan = planForDay(planDay());

  return `
  <section class="section" style="margin-top:4px">
    <div class="card" style="background:var(--surface-2);box-shadow:none;border:0">
      <div class="row">
        ${ring({ value: learned / Math.max(1, WORDS.length), size: 58, stroke: 6 })}
        <div style="flex:1">
          <div class="small" style="font-weight:700">已掌握 ${learned} / ${WORDS.length} 个词</div>
          <div class="tiny muted" style="margin-top:2px">${totalDue > 0 ? `今天有 ${totalDue} 个词到期` : '今天没有到期单词'}</div>
        </div>
        <button class="btn sm primary" data-nav="#/words/review">${icon('play')}复习</button>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">今日要学</h2></div>
    <button class="card press" data-nav="#/words/learn" style="width:100%;text-align:left">
      <div class="row">
        <span class="list__ico p">${icon('sparkles')}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block">${esc(plan.phase.decks.map((d) => deckById(d)?.name).join(' + '))}</span>
          <span class="list__sub" style="display:block">按第 ${plan.day} 天节奏，学 ${plan.phase.id <= 2 ? 6 : 5} 个新词</span>
        </span>
        ${icon('chevron-right', 'chev')}
      </div>
    </button>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">词库分类</h2></div>
    <div class="list">
      ${DECKS.map((d) => {
        const pool = WORDS_BY_DECK[d.id] || [];
        const st = deckStats(pool);
        const tone = d.tone;
        return `<button class="list__row" data-nav="#/words/${d.id}">
          <span class="list__ico ${tone}">${icon(d.ico)}</span>
          <span style="flex:1;min-width:0">
            <span class="list__title" style="display:block">${esc(d.name)}</span>
            <span class="list__sub" style="display:block">${esc(d.sub)} · ${st.learned}/${st.total} 已掌握${st.due ? ` · ${st.due} 待复习` : ''}</span>
            <span style="display:block;margin-top:6px">${bar(st.seen / Math.max(1, st.total), tone === 'b' ? 'blue' : tone === 'v' ? 'violet' : tone === 'a' ? 'amber' : '')}</span>
          </span>
          ${icon('chevron-right', 'chev')}
        </button>`;
      }).join('')}
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">我的</h2></div>
    <div class="list">
      <button class="list__row" data-nav="#/words/starred">
        <span class="list__ico a">${icon('star')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">生词本</span>
        <span class="list__sub" style="display:block">${starred} 个收藏的单词</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/words/spell">
        <span class="list__ico v">${icon('keyboard')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">拼写练习</span>
        <span class="list__sub" style="display:block">听发音，拼出单词</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/search">
        <span class="list__ico b">${icon('search')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">查词</span>
        <span class="list__sub" style="display:block">中英互查，支持联网补充</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
    </div>
  </section>
  `;
};

/* ---------- 词库详情 ---------- */
export const renderDeck = (deckId) => {
  const deck = deckById(deckId);
  const pool = WORDS_BY_DECK[deckId] || [];
  const st = deckStats(pool);
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <div class="row">
        <span class="list__ico ${deck.tone}" style="width:44px;height:44px">${icon(deck.ico)}</span>
        <div style="flex:1">
          <div class="small" style="font-weight:700">${esc(deck.name)}</div>
          <div class="tiny muted">${esc(deck.sub)}</div>
        </div>
        <button class="btn sm primary" data-nav="#/words/review/${deckId}">${icon('play')}复习</button>
      </div>
      <div class="grid c4" style="margin-top:14px;gap:8px">
        <div><div class="stat__v" style="font-size:18px">${st.total}</div><div class="stat__k">总词数</div></div>
        <div><div class="stat__v" style="font-size:18px">${st.learned}</div><div class="stat__k">已掌握</div></div>
        <div><div class="stat__v" style="font-size:18px">${st.due}</div><div class="stat__k">待复习</div></div>
        <div><div class="stat__v" style="font-size:18px">${st.fresh}</div><div class="stat__k">未学习</div></div>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="row" style="gap:8px;margin-bottom:10px">
      <input class="card" id="word-filter" placeholder="筛选（输入中文或英文）" style="flex:1;border:1px solid var(--line);box-shadow:none;height:42px;padding:0 12px;font-size:15px">
    </div>
    <div class="list" id="word-list">
      ${pool.map((w) => wordRow(w)).join('')}
    </div>
  </section>`;
};

const wordRow = (w) => {
  const s = getState();
  const noted = s.words.learned[w.id];
  const wrong = s.words.wrong[w.id];
  return `<button class="list__row" data-word="${esc(w.en)}">
    <span style="flex:1;min-width:0">
      <span class="list__title" style="display:block">${esc(w.en)} <span class="tiny muted mono" style="font-weight:400">${esc(w.ipa)}</span></span>
      <span class="list__sub" style="display:block">${esc(w.zh)}</span>
    </span>
    ${wrong ? `<span class="tag c">错 ${wrong}</span>` : ''}
    ${noted ? `<span class="tag g">${icon('check')}</span>` : ''}
    <span class="iconbtn sm plain" data-say="${esc(w.en)}">${icon('volume-2')}</span>
  </button>`;
};

/* ---------- SRS 会话 ---------- */
let session = null;

const poolFor = (deckId) => (deckId ? WORDS_BY_DECK[deckId] || [] : WORDS);

export const startSession = (mode, deckId = '') => {
  const pool = poolFor(deckId);
  let queue = [];
  if (mode === 'review') {
    queue = dueList(pool, Date.now()).slice(0, 40).map((id) => pool.find((w) => w.id === id)).filter(Boolean);
    if (queue.length < 4) {
      const learned = pool.filter((w) => getState().words.learned[w.id] && !queue.includes(w));
      queue = queue.concat(sample(learned, 6 - queue.length));
    }
    if (!queue.length) queue = sample(pool, Math.min(10, pool.length));
  } else if (mode === 'learn') {
    const plan = planForDay(planDay());
    const want = plan.phase.id <= 2 ? 6 : 5;
    const decks = plan.phase.decks.concat(['core', 'social', 'work', 'hvac', 'bas']);
    for (const d of decks) {
      const p = WORDS_BY_DECK[d] || [];
      const nl = newList(p, want - queue.length);
      queue = queue.concat(nl.map((id) => p.find((w) => w.id === id)).filter(Boolean));
      if (queue.length >= want) break;
    }
    if (!queue.length) queue = sample(pool, Math.min(8, pool.length));
  } else if (mode === 'starred') {
    const ids = Object.keys(getState().words.starred);
    queue = ids.map((id) => WORDS.find((w) => w.id === id) || null).filter(Boolean);
    if (!queue.length) queue = sample(pool, 8);
  } else {
    queue = shuffle(pool).slice(0, 12);
  }
  session = { mode, deckId, queue, idx: 0, flipped: false, correct: 0, wrong: 0, startedAt: Date.now(), results: [] };
  return session;
};

export const getSession = () => session;

const flashCard = (w, flipped) => `
  <div class="flash" id="flash">
    <div class="flash__face">
      <div class="row tiny muted"><span>${esc(deckById(w.deck)?.name || '')}</span><span class="spacer"></span><span data-counter></span></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
        <div class="flash__word">${esc(w.en)}</div>
        <div class="flash__ipa">${esc(w.ipa)}</div>
        <div class="flash__pos">${esc(w.pos)}</div>
        ${flipped ? `
          <div class="flash__zh">${esc(w.zh)}</div>
          <div class="flash__ex">${renderSentence(w.ex)}</div>
          <div class="flash__exzh">${esc(w.exZh)}</div>` : `
          <div class="tiny muted" style="margin-top:18px">先在心里说出意思，再点"显示答案"</div>`}
      </div>
      <div class="row" style="gap:8px;margin-top:14px">
        <button class="btn sm soft" data-say="${esc(w.en)}">${icon('volume-2')}发音</button>
        <button class="btn sm ghost" data-star="${esc(w.id)}">${icon('star')}${getState().words.starred[w.id] ? '已收藏' : '收藏'}</button>
      </div>
    </div>
  </div>`;

const gradeBar = () => `
  <div class="grid c4" style="margin-top:12px;gap:8px" data-grades>
    <button class="btn coral" data-g="0" style="flex-direction:column;height:60px;gap:2px;padding:0">
      <span style="font-size:14px;font-weight:700">忘了</span><span class="tiny" style="opacity:.8">15 分钟后</span></button>
    <button class="btn" data-g="1" style="flex-direction:column;height:60px;gap:2px;padding:0;background:var(--amber-50);color:var(--amber)">
      <span style="font-size:14px;font-weight:700">有点难</span><span class="tiny" style="opacity:.8">1 天后</span></button>
    <button class="btn" data-g="2" style="flex-direction:column;height:60px;gap:2px;padding:0;background:var(--primary-50);color:var(--primary)">
      <span style="font-size:14px;font-weight:700">记得</span><span class="tiny" style="opacity:.8">按计划复习</span></button>
    <button class="btn" data-g="3" style="flex-direction:column;height:60px;gap:2px;padding:0;background:var(--green-50);color:var(--green)">
      <span style="font-size:14px;font-weight:700">太简单</span><span class="tiny" style="opacity:.8">间隔加倍</span></button>
  </div>`;

export const renderSession = () => {
  if (!session || session.idx >= session.queue.length) return renderSessionDone();
  const w = session.queue[session.idx];
  const total = session.queue.length;
  const p = session.idx / total;
  return `
  <section class="section" style="margin-top:4px">
    <div class="row tiny muted" style="margin-bottom:8px">
      <span>${session.mode === 'learn' ? '新词学习' : session.mode === 'starred' ? '生词本' : '记忆复习'}</span>
      <span class="spacer"></span>
      <span>${session.idx + 1} / ${total}</span>
    </div>
    ${bar(p)}
    <div style="margin-top:14px">${flashCard(w, session.flipped)}</div>
    ${session.flipped ? gradeBar() : `<button class="btn primary block lg" style="margin-top:12px" data-flip>${icon('eye')}显示答案</button>`}
  </section>`;
};

export const renderSessionDone = () => {
  const s = session || { correct: 0, wrong: 0, queue: [], results: [] };
  const total = s.queue.length || 1;
  const acc = s.results.length ? s.results.filter((r) => r.g >= 2).length / s.results.length : 0;
  return `
  <section class="section" style="margin-top:20px;text-align:center">
    <div style="font-size:56px;line-height:1">${acc > 0.8 ? '🎯' : acc > 0.5 ? '👍' : '💪'}</div>
    <h2 class="section__title" style="margin-top:10px">本轮完成</h2>
    <p class="small muted" style="margin-top:6px">复习 ${total} 个词 · 记得 ${s.results.filter((r) => r.g >= 2).length} 个 · 需要加强 ${s.results.filter((r) => r.g === 0).length} 个</p>
    <div class="grid c3" style="margin-top:18px">
      <div class="stat"><div class="stat__v">${total}</div><div class="stat__k">本轮词数</div></div>
      <div class="stat"><div class="stat__v">${Math.round(acc * 100)}%</div><div class="stat__k">记住率</div></div>
      <div class="stat"><div class="stat__v">+${total * 8}</div><div class="stat__k">获得经验</div></div>
    </div>
    <div class="row" style="gap:8px;margin-top:18px">
      <button class="btn primary" style="flex:1" data-nav="#/words">回到词库</button>
      <button class="btn ghost" style="flex:1" data-restart>再来一轮</button>
    </div>
    <div class="banner p" style="margin-top:18px;text-align:left">
      ${icon('repeat')}
      <div>遗忘曲线告诉我们：今天记住不等于长期记住。明天再复习一次，效果最好。</div>
    </div>
  </section>`;
};

export const mountSession = (root, { nav, rerender }) => {
  if (!session) return;
  const flash = $('#flash', root);
  if (flash) {
    root.querySelector('[data-flip]')?.addEventListener('click', () => {
      session.flipped = true;
      rerender();
      const w = session.queue[session.idx];
      if (getState().settings.autoPlay) say(w.en);
    });
    if (session.flipped && getState().settings.autoPlay && !session.spoken) {
      session.spoken = true;
      say(session.queue[session.idx].ex, { rate: getState().settings.rate * 0.98 });
    }
  }
  root.querySelectorAll('[data-g]').forEach((b) => {
    b.onclick = () => {
      const w = session.queue[session.idx];
      const g = Number(b.dataset.g);
      gradeCard(w.id, g);
      session.results.push({ id: w.id, g });
      recordAnswer(g >= 2, w.id);
      if (g >= 2) session.correct++; else session.wrong++;
      session.idx++;
      session.flipped = false;
      session.spoken = false;
      if (session.idx >= session.queue.length) {
        addXP(session.queue.length * 8, 'SRS');
        touchDay();
        markTask(session.mode === 'learn' ? 'new' : 'review');
        celebrate(root);
      }
      rerender();
    };
  });
  root.querySelectorAll('[data-say]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); say(b.dataset.say); };
  });
  root.querySelectorAll('[data-star]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const on = toggleStar(b.dataset.star);
      toast(on ? '已加入生词本' : '已移出生词本', 'star');
      rerender();
    };
  });
  const restart = root.querySelector('[data-restart]');
  if (restart) restart.onclick = () => { startSession(session?.mode || 'review', session?.deckId); rerender(); };
};

/* ---------- 拼写练习 ---------- */
let spellState = null;
export const startSpell = (deckId = '') => {
  const pool = poolFor(deckId);
  const learned = pool.filter((w) => w.ex);
  const list = sample(learned, 12);
  spellState = { list, idx: 0, ok: 0, input: '', showHint: false };
  return spellState;
};
export const getSpell = () => spellState;

export const renderSpell = () => {
  if (!spellState) startSpell();
  const st = spellState;
  if (st.idx >= st.list.length) {
    return `<section class="section" style="margin-top:20px;text-align:center">
      <div style="font-size:52px">${st.ok >= 10 ? '🏆' : st.ok >= 6 ? '🎯' : '💪'}</div>
      <h2 class="section__title" style="margin-top:12px">拼写练习完成</h2>
      <p class="small muted" style="margin-top:6px">答对 ${st.ok} / ${st.list.length}</p>
      <div class="row" style="gap:8px;margin-top:18px">
        <button class="btn primary" style="flex:1" data-restart-spell>再来一组</button>
        <button class="btn ghost" style="flex:1" data-nav="#/words">回到词库</button>
      </div></section>`;
  }
  const w = st.list[st.idx];
  return `
  <section class="section" style="margin-top:4px">
    <div class="row tiny muted" style="margin-bottom:8px"><span>听发音，拼出单词</span><span class="spacer"></span><span>${st.idx + 1} / ${st.list.length}</span></div>
    ${bar(st.idx / st.list.length, 'violet')}
    <div class="card" style="margin-top:14px;text-align:center;padding:22px 14px">
      <button class="iconbtn lg on" style="margin:0 auto" data-say-spell>${icon('volume-2')}</button>
      <div class="small" style="margin-top:12px;font-weight:650">${esc(w.zh)}</div>
      <div class="tiny muted" style="margin-top:4px">${esc(w.pos)} · 长度 ${w.en.length}</div>
      <div class="mono" style="margin-top:16px;font-size:24px;letter-spacing:.14em;min-height:34px">${esc(st.input) || '&nbsp;'}</div>
      ${st.showHint ? `<div class="tiny" style="color:var(--primary);margin-top:6px">提示：${esc(w.en.slice(0, Math.ceil(w.en.length / 2)))}…</div>` : ''}
      <div style="margin-top:16px">
        <input id="spell-input" class="card" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          value="${esc(st.input)}" placeholder="在这里输入单词"
          style="width:100%;text-align:center;font-size:20px;font-family:var(--mono);border:1px solid var(--line);box-shadow:none;height:52px">
      </div>
      <div class="row" style="gap:8px;margin-top:12px">
        <button class="btn ghost sm" data-hint>${icon('lightbulb')}提示</button>
        <button class="btn ghost sm" data-skip>跳过</button>
        <button class="btn primary sm" style="flex:1" data-check>${icon('check')}检查</button>
      </div>
    </div>
  </section>`;
};

export const mountSpell = (root, { rerender }) => {
  const st = spellState;
  if (!st) return;
  if (st.idx >= st.list.length) {
    root.querySelector('[data-restart-spell]')?.addEventListener('click', () => { startSpell(); rerender(); });
    return;
  }
  const w = st.list[st.idx];
  const input = $('#spell-input', root);
  if (input) {
    input.focus({ preventScroll: true });
    input.oninput = () => { st.input = input.value; };
    input.onkeydown = (e) => { if (e.key === 'Enter') check(); };
  }
  const check = () => {
    const val = ($('#spell-input', root)?.value || st.input || '').trim().toLowerCase();
    if (!val) return;
    const ok = val === w.en.toLowerCase();
    recordAnswer(ok, w.id);
    if (ok) { st.ok++; toast('正确！', 'circle-check'); say(w.en); }
    else { toast(`正确拼写：${w.en}`, 'circle-x'); gradeCard(w.id, 0); }
    st.idx++; st.input = ''; st.showHint = false;
    addXP(ok ? 12 : 3, 'spell');
    requestAnimationFrame(rerender);
  };
  root.querySelector('[data-check]')?.addEventListener('click', check);
  root.querySelector('[data-hint]')?.addEventListener('click', () => { st.showHint = true; rerender(); });
  root.querySelector('[data-skip]')?.addEventListener('click', () => { st.idx++; st.input = ''; st.showHint = false; rerender(); });
  root.querySelector('[data-say-spell]')?.addEventListener('click', () => say(w.en));
  if (getState().settings.autoPlay) setTimeout(() => say(w.en), 220);
};

/* ---------- 生词本 ---------- */
export const renderStarred = () => {
  const ids = Object.keys(getState().words.starred);
  const list = ids.map((id) => WORDS.find((w) => w.id === id) || lookup(id.replace('raw:', '')) || null).filter(Boolean);
  if (!list.length) {
    return `<div class="empty">${icon('star')}<h4>生词本还是空的</h4>
      <p class="small">阅读对话或例句时，点任意单词，再点"收藏"就能加入这里。</p></div>`;
  }
  return `<section class="section" style="margin-top:4px">
    <div class="row" style="margin-bottom:10px"><span class="small muted">共 ${list.length} 个词</span>
    <span class="spacer"></span>
    <button class="btn sm primary" data-nav="#/words/review/starred">${icon('play')}复习生词</button></div>
    <div class="list">${list.map((w) => wordRow({ ...w, id: w.id || 'raw', deck: w.deck || 'core', ipa: w.ipa || '', zh: w.zh || '', en: w.en })).join('')}</div>
  </section>`;
};

export const mountWords = (root, ctx) => {
  root.querySelectorAll('[data-word]').forEach((b) => {
    b.onclick = (e) => {
      if (e.target.closest('[data-say]')) return;
      import('../core/tap.js').then(({ openWordSheet }) => openWordSheet(b.dataset.word));
    };
  });
  root.querySelectorAll('[data-say]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); say(b.dataset.say); };
  });
  const filter = root.querySelector('#word-filter');
  if (filter) {
    filter.oninput = () => {
      const q = filter.value.trim().toLowerCase();
      const list = root.querySelector('#word-list');
      if (!list) return;
      [...list.children].forEach((row) => {
        const txt = row.textContent.toLowerCase();
        row.classList.toggle('hide', q && !txt.includes(q));
      });
    };
  }
};
