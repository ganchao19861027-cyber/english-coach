/* 闯关：7 种由内容库实时生成的题目 */
import { $, icon, bar, ring, toast, celebrate } from '../core/ui.js';
import { esc, clamp, mmss, shuffle, wordsOnly } from '../core/util.js';
import { getState, addXP, markTask, recordAnswer, touchDay, bumpProgress, planDay } from '../core/store.js';
import { GAMES, gameById, buildSet, buildMixed, spellingCheck, starsFor } from '../core/games.js';
import { speak } from '../core/speech.js';
import { renderSentence } from '../core/tap.js';
import { planForDay } from '../data/index.js';

const S = () => getState().settings;
const say = (t, o = {}) => speak(t, { rate: S().rate, accent: S().accent, voiceURI: S().voiceURI, ...o });

let game = null;

export const renderIndex = () => {
  const s = getState();
  const plan = planForDay(planDay());
  const decks = plan.phase.decks;
  return `
  <section class="section" style="margin-top:4px">
    <div class="card" style="background:var(--surface-2);box-shadow:none;border:0">
      <div class="row">
        <span class="stat__ico" style="background:var(--amber-50);color:var(--amber);margin:0">${icon('gamepad-2')}</span>
        <div style="flex:1">
          <div class="small" style="font-weight:700">今日题库已匹配当前阶段</div>
          <div class="tiny muted" style="margin-top:2px">${esc(decks.map((d) => d === 'hvac' ? '暖通' : d === 'bas' ? '楼控' : d === 'work' ? '职场' : d === 'social' ? '社交' : '核心').join(' + '))}</div>
        </div>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title">选择玩法</h2>
      <span class="section__more" data-nav="#/games/daily">每日挑战${icon('zap')}</span></div>
    <div class="list">
      ${GAMES.map((g) => `<button class="list__row" data-nav="#/games/${g.id}">
        <span class="list__ico ${g.tone}">${icon(g.ico)}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block">${esc(g.name)}</span>
          <span class="list__sub" style="display:block">${esc(g.desc)}</span>
        </span>
        ${s.gameBest[g.id] ? `<span class="tag a">最高 ${s.gameBest[g.id]}</span>` : ''}
        ${icon('chevron-right', 'chev')}
      </button>`).join('')}
    </div>
  </section>
  <section class="section">
    <div class="grid c3">
      <div class="stat"><div class="stat__v">${s.stats.sessions}</div><div class="stat__k">闯关局数</div></div>
      <div class="stat"><div class="stat__v">${s.stats.answers ? Math.round((s.stats.correct / s.stats.answers) * 100) + '%' : '—'}</div><div class="stat__k">平均正确率</div></div>
      <div class="stat"><div class="stat__v">${s.stats.coins}</div><div class="stat__k">金币</div></div>
    </div>
  </section>`;
};

export const startGame = (kind) => {
  const s = getState();
  const plan = planForDay(planDay());
  const decks = [...plan.phase.decks, 'core', 'social', 'work'].filter((v, i, a) => a.indexOf(v) === i);
  let qs = [];
  if (kind === 'daily') qs = buildMixed(decks, 12);
  else if (kind === 'match') qs = buildSet('match', decks, 1);
  else qs = buildSet(kind, decks, kind === 'speed' ? 20 : 10);
  if (!qs.length) qs = buildSet('meaning', ['core'], 10);
  game = {
    kind, qs, idx: 0, correct: 0, wrong: 0, answered: false, picked: null,
    startedAt: Date.now(), scramble: [], spellInput: '', matched: [], selected: null,
    timeLeft: kind === 'speed' ? 60 : 0, combo: 0, maxCombo: 0, done: false,
    locked: false,
  };
  return game;
};

export const getGame = () => game;

const header = () => {
  const g = game;
  const total = g.qs.length;
  const progress = g.kind === 'speed' ? (60 - g.timeLeft) / 60 : g.idx / total;
  return `
  <div class="row tiny muted" style="margin-bottom:8px">
    <span>${gameById(g.kind)?.name || (g.kind === 'daily' ? '每日挑战' : '闯关')}</span>
    <span class="spacer"></span>
    ${g.kind === 'speed' ? `<span class="mono" data-timer>${mmss(g.timeLeft)}</span>` : `<span>${Math.min(g.idx + 1, total)} / ${total}</span>`}
    <span class="tag a">${icon('zap')}${g.correct}</span>
  </div>
  ${bar(progress, g.kind === 'speed' ? 'amber' : '')}
  ${g.combo >= 3 ? `<div class="row" style="justify-content:center;margin-top:8px"><span class="tag c">${icon('flame')}连击 ×${g.combo}</span></div>` : ''}`;
};

export const renderGame = () => {
  if (!game) startGame('meaning');
  if (game.done) return renderResult();
  const q = game.qs[game.idx] || game.qs[0];
  if (!q) return renderResult();

  if (q.type === 'listen') {
    return `${header()}
    <div class="card" style="margin-top:14px;text-align:center;padding:24px 14px">
      <button class="iconbtn lg on" style="margin:0 auto" data-play>${icon('volume-2')}</button>
      <div class="small muted" style="margin-top:12px">听发音，选出正确意思</div>
      <div class="tiny muted" style="margin-top:4px">${esc(q.word?.ipa || '')} · ${esc(q.word?.pos || '')}</div>
    </div>
    <div style="margin-top:14px">${q.options.map((o, i) => optionHtml(o, i)).join('')}</div>
    ${afterHtml(q)}`;
  }
  if (q.type === 'meaning') {
    return `${header()}
    <div class="card" style="margin-top:14px;text-align:center;padding:22px 14px">
      <div style="font-size:30px;font-weight:750;letter-spacing:-.02em">${esc(q.prompt)}</div>
      ${q.sub ? `<div class="mono tiny muted" style="margin-top:4px">${esc(q.sub)}</div>` : ''}
      <button class="btn sm soft" style="margin-top:12px" data-play>${icon('volume-2')}听发音</button>
    </div>
    <div style="margin-top:14px">${q.options.map((o, i) => optionHtml(o, i)).join('')}</div>
    ${afterHtml(q)}`;
  }
  if (q.type === 'respond') {
    return `${header()}
    <div class="card" style="margin-top:14px;padding:16px">
      <div class="tiny muted">${esc(q.scene || '')}</div>
      <div class="bubble a" style="max-width:100%;margin-top:8px;box-shadow:none;background:var(--surface-2)">
        <div class="bubble__en">${renderSentence(q.prompt)}</div>
        <div class="tiny muted" style="margin-top:4px">${esc(q.sub || '')}</div>
      </div>
      <button class="btn sm soft" style="margin-top:10px" data-play>${icon('volume-2')}听这句</button>
      <div class="tiny muted" style="margin-top:10px">选出最合适的回应：</div>
    </div>
    <div style="margin-top:12px">${q.options.map((o, i) => optionHtml(o, i)).join('')}</div>
    ${afterHtml(q)}`;
  }
  if (q.type === 'spell') {
    return `${header()}
    <div class="card" style="margin-top:14px;text-align:center;padding:20px 14px">
      <button class="iconbtn lg on" style="margin:0 auto" data-play>${icon('volume-2')}</button>
      <div class="small" style="margin-top:12px;font-weight:650">${esc(q.prompt)}</div>
      <div class="tiny muted" style="margin-top:4px">长度 ${q.answer.length} · ${esc(q.ipa || '')}</div>
      <input id="g-spell" class="card" value="${esc(game.spellInput || '')}" autocomplete="off" autocorrect="off" autocapitalize="off"
        style="width:100%;text-align:center;font-size:22px;font-family:var(--mono);margin-top:14px;border:1px solid var(--line);box-shadow:none;height:54px" placeholder="拼出这个单词">
      <button class="btn sm ghost" style="margin-top:10px" data-hint>${icon('lightbulb')}提示：${esc(q.hint)}</button>
    </div>
    <button class="btn primary block lg" style="margin-top:14px" data-check>${icon('check')}确认</button>
    ${afterHtml(q)}`;
  }
  if (q.type === 'scramble') {
    return `${header()}
    <div class="card" style="margin-top:14px">
      <div class="tiny muted">把下面的词排成正确的句子</div>
      <div class="small" style="margin-top:6px;font-weight:600">${esc(q.prompt)}</div>
    </div>
    <div class="tilegrid" style="grid-template-columns:repeat(2,1fr);margin-top:12px">
      ${q.tokens.map((t, i) => `<button class="tile ${game.scramble.includes(i) ? 'ok' : ''}" data-token="${i}">${esc(t.t)}</button>`).join('')}
    </div>
    <div class="card" style="margin-top:12px;min-height:56px;display:flex;align-items:center">
      <div class="small">${game.scramble.map((i) => esc(q.tokens[i].t)).join(' ') || '<span class="muted">按顺序点击单词…</span>'}</div>
    </div>
    <div class="row" style="gap:8px;margin-top:12px">
      <button class="btn ghost sm" data-clear>${icon('rotate-ccw')}清空</button>
      <button class="btn primary sm" style="flex:1" data-check ${game.scramble.length !== q.tokens.length ? 'disabled' : ''}>${icon('check')}确认</button>
    </div>
    ${afterHtml(q)}`;
  }
  if (q.type === 'match') {
    const left = q.pairs;
    const right = shuffle(q.pairs);
    return `${header()}
    <div class="tiny muted" style="margin-top:12px">先点英文，再点中文，配对成功会变绿。</div>
    <div class="grid c2" style="margin-top:10px;align-items:start">
      <div class="grid" style="gap:8px">
        ${left.map((p) => `<button class="tile ${game.matched.includes(p.id) ? 'ok' : game.selected === p.id ? 'sel' : ''}" data-left="${p.id}">${esc(p.en)}</button>`).join('')}
      </div>
      <div class="grid" style="gap:8px">
        ${right.map((p) => `<button class="tile ${game.matched.includes(p.id) ? 'ok' : ''}" data-right="${p.id}">${esc(p.zh)}</button>`).join('')}
      </div>
    </div>
    ${game.matched.length === q.pairs.length ? `<button class="btn primary block lg" style="margin-top:14px" data-next-q>全部配对成功，继续</button>` : ''}`;
  }
  return `${header()}<div class="empty">${icon('triangle-alert')}<h4>题目生成失败</h4><p class="small">请返回重试</p></div>`;
};

const optionHtml = (o, i) => {
  const q = game.qs[game.idx];
  const answered = game.answered;
  const cls = answered ? (o.ok ? 'ok' : game.picked === i ? 'no' : 'dim') : '';
  return `<button class="opt ${cls}" data-opt="${i}" ${answered ? 'disabled' : ''}>
    <span class="opt__key">${'ABCD'[i]}</span><span style="flex:1">${esc(o.text)}</span>
    ${answered && o.ok ? icon('check') : ''}
  </button>`;
};

const afterHtml = (q) => {
  if (!game.answered) {
    return `<div class="tiny muted center" style="margin-top:14px">${icon('info')} 答错也不扣分，选完会看到正确答案</div>`;
  }
  const ok = game.lastOk;
  return `
  <div class="card" style="margin-top:14px;border:1.5px solid ${ok ? 'var(--green)' : 'var(--coral)'}">
    <div class="row" style="gap:8px">
      ${icon(ok ? 'circle-check' : 'circle-x')}
      <span class="small" style="font-weight:700;color:${ok ? 'var(--green)' : 'var(--coral)'}">${ok ? '答对了 +10 XP' : '再接再厉'}</span>
      <span class="spacer"></span>
      ${game.combo >= 3 ? `<span class="tag c">${icon('flame')}×${game.combo}</span>` : ''}
    </div>
    <div class="small" style="margin-top:8px">正确答案：<b>${esc(q.answer ?? '')}</b></div>
    ${q.word?.ex ? `<div class="tiny muted" style="margin-top:6px">${renderSentence(q.word.ex)}</div>` : ''}
    <div class="row" style="gap:8px;margin-top:12px">
      <button class="btn sm soft" data-play2>${icon('volume-2')}再听一次</button>
      <button class="btn sm primary" style="flex:1" data-next-q>${icon('arrow-right')}下一题</button>
    </div>
  </div>`;
};

export const renderResult = () => {
  const total = game.kind === 'speed' ? game.correct + game.wrong : game.qs.length;
  const stars = starsFor(game.correct, Math.max(1, total));
  const acc = total ? Math.round((game.correct / total) * 100) : 0;
  return `
  <section class="section" style="margin-top:18px;text-align:center">
    <div style="font-size:56px;line-height:1">${stars === 3 ? '🏆' : stars === 2 ? '🎯' : stars === 1 ? '💪' : '🌱'}</div>
    <h2 class="section__title" style="margin-top:10px">${esc(game.kind === 'daily' ? '每日挑战完成' : gameById(game.kind)?.name + ' 完成')}</h2>
    <div class="row" style="justify-content:center;gap:4px;margin-top:8px">
      ${Array.from({ length: 3 }, (_, i) => icon('star', i < stars ? '' : 'chev')).join('')}
    </div>
    <div class="grid c3" style="margin-top:18px">
      <div class="stat"><div class="stat__v">${acc}%</div><div class="stat__k">正确率</div></div>
      <div class="stat"><div class="stat__v">${game.maxCombo}</div><div class="stat__k">最高连击</div></div>
      <div class="stat"><div class="stat__v">+${game.correct * 10}</div><div class="stat__k">获得经验</div></div>
    </div>
    <div class="row" style="gap:8px;margin-top:18px">
      <button class="btn primary" style="flex:1" data-again>${icon('rotate-ccw')}再来一局</button>
      <button class="btn ghost" style="flex:1" data-nav="#/games">选择玩法</button>
    </div>
    ${acc < 60 ? `<div class="banner" style="margin-top:16px;text-align:left">${icon('lightbulb')}<div>正确率低于 60%，建议先回到"词库"做一轮复习，再来闯关，效果更好。</div></div>` : ''}
  </section>`;
};

const finish = (root) => {
  game.done = true;
  const score = Math.round((game.correct / Math.max(1, game.correct + game.wrong)) * 100);
  const s = getState();
  import('../core/store.js').then(({ set }) => {
    set((st) => {
      st.stats.sessions += 1;
      st.stats.coins += game.correct;
      st.gameBest[game.kind] = Math.max(st.gameBest[game.kind] || 0, score);
    }, 'game', true);
  });
  addXP(game.correct * 10, 'game');
  touchDay();
  markTask('game');
  bumpProgress({ talks: (getState().progress?.talks || 0) + (game.correct >= 8 ? 1 : 0) });
  if (score >= 80) celebrate(root);
};

const next = (root, { rerender }) => {
  game.idx++;
  game.answered = false;
  game.picked = null;
  game.scramble = [];
  game.spellInput = '';
  game.selected = null;
  if (game.idx >= game.qs.length) { finish(root); rerender(); return; }
  rerender();
};

export const mountGame = (root, ctx) => {
  if (!game || game.done) {
    root.querySelector('[data-again]')?.addEventListener('click', () => { startGame(game?.kind || 'meaning'); ctx.rerender(); });
    return;
  }
  const q = game.qs[game.idx];
  const play = () => q.speak && say(q.speak);
  root.querySelectorAll('[data-play],[data-play2]').forEach((b) => b.onclick = play);
  if (S().autoPlay && q.speak && !game.played) { game.played = true; setTimeout(play, 260); }

  if (q.type === 'listen' || q.type === 'meaning' || q.type === 'respond') {
    root.querySelectorAll('[data-opt]').forEach((b) => b.onclick = () => {
      if (game.answered) return;
      const i = Number(b.dataset.opt);
      const ok = q.options[i].ok;
      game.answered = true;
      game.picked = i;
      game.lastOk = ok;
      if (ok) { game.correct++; game.combo++; game.maxCombo = Math.max(game.maxCombo, game.combo); }
      else { game.wrong++; game.combo = 0; }
      recordAnswer(ok, q.wordId, { game: game.kind, score: game.correct });
      play();
      ctx.rerender();
    });
  }

  if (q.type === 'spell') {
    const input = $('#g-spell', root);
    if (input) {
      input.focus({ preventScroll: true });
      input.oninput = () => { game.spellInput = input.value; };
      input.onkeydown = (e) => { if (e.key === 'Enter') root.querySelector('[data-check]')?.click(); };
    }
    root.querySelector('[data-check]')?.addEventListener('click', () => {
      if (game.answered) return;
      const val = ($('#g-spell', root)?.value || game.spellInput || '').trim();
      const { ok } = spellingCheck(val, q.answer);
      game.answered = true;
      game.picked = null;
      game.lastOk = ok;
      q.answerText = q.answer;
      if (ok) { game.correct++; game.combo++; game.maxCombo = Math.max(game.maxCombo, game.combo); }
      else { game.wrong++; game.combo = 0; }
      recordAnswer(ok, q.wordId, { game: game.kind, score: game.correct });
      ctx.rerender();
    });
    return;
  }

  if (q.type === 'scramble') {
    root.querySelectorAll('[data-token]').forEach((b) => b.onclick = () => {
      if (game.answered) return;
      const i = Number(b.dataset.token);
      game.scramble = game.scramble.includes(i) ? game.scramble.filter((x) => x !== i) : [...game.scramble, i];
      ctx.rerender();
    });
    root.querySelector('[data-clear]')?.addEventListener('click', () => { game.scramble = []; ctx.rerender(); });
    root.querySelector('[data-check]')?.addEventListener('click', () => {
      if (game.answered) return;
      const built = game.scramble.map((i) => q.tokens[i].t).join(' ');
      const ok = built.toLowerCase().replace(/[^a-z' ]/g, '') === q.answer.toLowerCase().replace(/[^a-z' ]/g, '');
      game.answered = true;
      game.lastOk = ok;
      q.answer = q.answer;
      if (ok) { game.correct++; game.combo++; game.maxCombo = Math.max(game.maxCombo, game.combo); }
      else { game.wrong++; game.combo = 0; }
      recordAnswer(ok, null, { game: game.kind, score: game.correct });
      say(q.answer);
      ctx.rerender();
    });
    return;
  }

  if (q.type === 'match') {
    root.querySelectorAll('[data-left]').forEach((b) => b.onclick = () => { game.selected = b.dataset.left; ctx.rerender(); });
    root.querySelectorAll('[data-right]').forEach((b) => b.onclick = () => {
      if (!game.selected) { toast('先点左边的英文', 'info'); return; }
      const ok = b.dataset.right === game.selected;
      if (ok) {
        game.matched = [...game.matched, game.selected];
        game.correct++;
        recordAnswer(true, game.selected, { game: 'match', score: game.matched.length });
        toast('配对成功', 'check');
      } else {
        game.wrong++;
        game.combo = 0;
        recordAnswer(false, null, { game: 'match' });
        toast('不匹配，再看看', 'x');
      }
      game.selected = null;
      ctx.rerender();
    });
    return;
  }

  root.querySelectorAll('[data-next-q]').forEach((b) => b.onclick = () => next(root, ctx));
};

/* 计时器（极速模式） */
export const startTimer = (root, rerender) => {
  if (!game || game.kind !== 'speed' || game.done) return () => {};
  const t = setInterval(() => {
    if (!game || game.done) { clearInterval(t); return; }
    game.timeLeft -= 1;
    const el = root.querySelector('[data-timer]');
    if (el) el.textContent = mmss(game.timeLeft);
    if (game.timeLeft <= 0) {
      clearInterval(t);
      game.done = true;
      finish(root);
      rerender();
    }
  }, 1000);
  return () => clearInterval(t);
};
