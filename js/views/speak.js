/* 口语：场景对话、角色扮演、跟读评分、发音训练 */
import { $, $$, icon, bar, sheet, toast, celebrate, ring } from '../core/ui.js';
import { esc, clamp, fmtNum, pct, sample, shuffle, sleep, wordsOnly } from '../core/util.js';
import {
  getState, addXP, markTask, touchDay, markDialogueDone, recordAnswer,
  updateSettings, todayRec, bumpProgress,
} from '../core/store.js';
import { DIALOGUES, DIALOGUE_CATS, dialoguesByCat, catName, catIco, dialogueById, DRILLS, sentencePool, proSentences } from '../data/index.js';
import { speak, stopSpeak, recognize, asrSupported, Recorder, micSupported, scoreSpeech, mockScore } from '../core/speech.js';
import { renderSentence, openWordSheet } from '../core/tap.js';

const S = () => getState().settings;
const say = (t, o = {}) => speak(t, { rate: S().rate, accent: S().accent, voiceURI: S().voiceURI, ...o });

let player = { id: null, role: 'all', idx: -1, playing: false, showZh: true };
let listCat = 'all';
const cancelToken = { cancelled: false };

export const renderIndex = (cat = listCat) => {
  listCat = cat;
  const list = dialoguesByCat(cat);
  const done = getState().dialoguesDone;
  return `
  <section class="section" style="margin-top:4px">
    <div class="chips">
      ${DIALOGUE_CATS.map((c) => `<button class="chip ${c.id === cat ? 'on' : ''}" data-cat="${c.id}">${icon(c.ico)}${esc(c.name)}</button>`).join('')}
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title">场景对话</h2>
      <span class="section__more">${list.length} 个场景</span></div>
    <div class="list">
      ${list.map((d) => {
        const rec = done[d.id];
        const lvlTag = d.level >= 5 ? 'tag v' : d.level >= 4 ? 'tag b' : d.level >= 3 ? 'tag a' : 'tag p';
        return `<button class="list__row" data-nav="#/speak/${d.id}">
          <span class="list__ico ${d.cat === 'hvac' ? 'g' : d.cat === 'bas' ? 'v' : d.cat === 'work' || d.cat === 'pro' ? 'b' : 'p'}">${icon(catIco(d.cat))}</span>
          <span style="flex:1;min-width:0">
            <span class="list__title" style="display:block">${esc(d.title)}</span>
            <span class="list__sub" style="display:block">${esc(d.titleEn)}</span>
            <span class="row" style="gap:6px;margin-top:6px">
              <span class="${lvlTag}">Lv.${d.level}</span>
              <span class="tag">${d.lines.length} 句</span>
              ${rec ? `<span class="tag g">${icon('check')}已练 ${rec.times} 次</span>` : ''}
            </span>
          </span>
          ${icon('chevron-right', 'chev')}
        </button>`;
      }).join('')}
    </div>
  </section>
  <section class="section">
    <div class="grid c2">
      <button class="card press" data-nav="#/speak/shadow" style="text-align:left">
        <span class="stat__ico" style="background:var(--violet-50);color:var(--violet)">${icon('mic')}</span>
        <div class="small" style="font-weight:700">跟读训练</div>
        <div class="tiny muted" style="margin-top:2px">录音 + 评分，逐句打磨</div>
      </button>
      <button class="card press" data-nav="#/speak/drills" style="text-align:left">
        <span class="stat__ico" style="background:var(--primary-50);color:var(--primary)">${icon('ear')}</span>
        <div class="small" style="font-weight:700">发音课</div>
        <div class="tiny muted" style="margin-top:2px">针对中文母语的 16 个难点</div>
      </button>
    </div>
  </section>`;
};

export const mountIndex = (root, { rerender }) => {
  root.querySelectorAll('[data-cat]').forEach((b) => {
    b.onclick = () => { listCat = b.dataset.cat; rerender(); };
  });
};

/* ---------- 对话播放 ---------- */
export const renderDialogue = (id) => {
  const d = dialogueById(id);
  if (!d) return `<div class="empty">${icon('triangle-alert')}<h4>找不到这个场景</h4></div>`;
  if (player.id !== id) player = { id, role: 'all', idx: -1, playing: false, showZh: S().showZh };
  const rec = getState().dialoguesDone[id];

  const lineHtml = (line, i) => {
    const [who, en, zh] = line;
    const mine = player.role !== 'all' && who === player.role;
    const active = player.idx === i;
    return `<div class="bubble ${who === 'A' ? 'a' : 'b'} ${active ? 'active' : ''}" data-line="${i}">
      <div class="bubble__who">${who}${mine ? ' · 你的台词' : ''}</div>
      <div class="bubble__en">${renderSentence(en)}</div>
      <div class="bubble__zh ${player.showZh ? '' : 'hide'}" data-zh>${esc(zh)}</div>
      <div class="bubble__tools">
        <button class="iconbtn" data-play="${i}" aria-label="播放这句">${icon('volume-2')}</button>
        <button class="iconbtn" data-slow="${i}" aria-label="慢速播放">${icon('volume-1')}</button>
        <button class="iconbtn" data-shadow="${i}" aria-label="跟读这句">${icon('mic')}</button>
        <button class="iconbtn" data-tr="${i}" aria-label="整句翻译">${icon('languages')}</button>
        ${mine ? `<span class="tag a" style="margin-left:auto">轮到你</span>` : ''}
      </div>
    </div>`;
  };

  return `
  <section class="section" style="margin-top:2px">
    <div class="card">
      <div class="row">
        <span class="list__ico ${d.cat === 'hvac' ? 'g' : d.cat === 'bas' ? 'v' : d.cat === 'work' ? 'b' : 'p'}">${icon(catIco(d.cat))}</span>
        <div style="flex:1;min-width:0">
          <div class="small" style="font-weight:700">${esc(d.title)}</div>
          <div class="tiny muted">${esc(d.titleEn)} · ${esc(d.scene)}</div>
        </div>
        ${rec ? `<span class="tag g">${icon('check')}${rec.times} 次</span>` : ''}
      </div>
      <div class="seg" style="margin-top:12px">
        <button class="seg__item ${player.role === 'all' ? 'on' : ''}" data-role="all">全听</button>
        <button class="seg__item ${player.role === 'A' ? 'on' : ''}" data-role="A">我演 A</button>
        <button class="seg__item ${player.role === 'B' ? 'on' : ''}" data-role="B">我演 B</button>
      </div>
      <div class="row" style="gap:8px;margin-top:12px">
        <button class="btn primary" style="flex:1" data-playall>${icon(player.playing ? 'pause' : 'play')}${player.playing ? '停止' : '播放整段'}</button>
        <button class="btn ghost" data-togglezh>${icon('eye')}${player.showZh ? '隐藏中文' : '显示中文'}</button>
      </div>
    </div>
  </section>

  <section class="section"><div class="dlg">${d.lines.map(lineHtml).join('')}</div></section>

  <section class="section">
    <div class="section__head"><h2 class="section__title sm">关键句型</h2></div>
    <div class="list">
      ${d.keys.map(([en, zh]) => `<div class="list__row">
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block;font-size:15px">${renderSentence(en)}</span>
          <span class="list__sub" style="display:block">${esc(zh)}</span>
        </span>
        <button class="iconbtn sm" data-say="${esc(en)}">${icon('volume-2')}</button>
      </div>`).join('')}
    </div>
    ${d.tip ? `<div class="banner p" style="margin-top:12px">${icon('lightbulb')}<div>${esc(d.tip)}</div></div>` : ''}
  </section>

  <section class="section">
    <button class="btn primary block lg" data-finish>${icon('check-check')}完成这个场景</button>
  </section>`;
};

const playLine = async (i, rate = S().rate) => {
  const d = dialogueById(player.id);
  const line = d.lines[i];
  if (!line) return;
  player.idx = i;
  document.querySelectorAll('.bubble').forEach((b, k) => b.classList.toggle('active', k === i));
  document.querySelector(`.bubble[data-line="${i}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  await say(line[1], { rate });
};

export const playAll = async () => {
  const d = dialogueById(player.id);
  cancelToken.cancelled = false;
  player.playing = true;
  document.querySelector('[data-playall] span')?.remove();
  const btn = document.querySelector('[data-playall]');
  if (btn) btn.innerHTML = `${icon('pause')}停止`;
  for (let i = 0; i < d.lines.length; i++) {
    if (cancelToken.cancelled) break;
    const [who, en] = d.lines[i];
    const mine = player.role !== 'all' && who === player.role;
    await playLine(i, mine ? 0.9 : S().rate);
    if (mine) {
      if (btn) btn.innerHTML = `${icon('mic')}轮到你说…`;
      await sleep(Math.max(2600, wordsOnly(en).length * 620));
    } else {
      await sleep(220);
    }
  }
  player.playing = false;
  player.idx = -1;
  document.querySelectorAll('.bubble').forEach((b) => b.classList.remove('active'));
  if (btn) btn.innerHTML = `${icon('play')}播放整段`;
};

export const mountDialogue = (root, { rerender, nav }) => {
  root.querySelectorAll('[data-role]').forEach((b) => {
    b.onclick = () => { player.role = b.dataset.role; cancelToken.cancelled = true; player.playing = false; rerender(); };
  });
  root.querySelector('[data-playall]')?.addEventListener('click', () => {
    if (player.playing) { cancelToken.cancelled = true; player.playing = false; stopSpeak(); }
    else playAll();
  });
  root.querySelector('[data-togglezh]')?.addEventListener('click', () => {
    player.showZh = !player.showZh;
    updateSettings({ showZh: player.showZh });
    rerender();
  });
  root.querySelectorAll('[data-play]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); playLine(Number(b.dataset.play)); });
  root.querySelectorAll('[data-slow]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); playLine(Number(b.dataset.slow), 0.72); });
  root.querySelectorAll('[data-tr]').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const i = Number(b.dataset.tr);
    const line = dialogueById(player.id).lines[i];
    openTranslate(line[1], line[2]);
  });
  root.querySelectorAll('[data-shadow]').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const line = dialogueById(player.id).lines[Number(b.dataset.shadow)];
    openShadow(line[1], line[2], () => markTask('shadow'));
  });
  root.querySelectorAll('[data-say]').forEach((b) => b.onclick = () => say(b.dataset.say));
  root.querySelector('[data-finish]')?.addEventListener('click', () => {
    markDialogueDone(player.id, 1);
    markTask('dialogue');
    addXP(35, 'dialogue');
    touchDay();
    bumpProgress({ talks: (getState().progress?.talks || 0) + 1 });
    celebrate(root.querySelector('[data-finish]'));
    toast('场景完成 +35 XP', 'check-check');
    setTimeout(() => nav('#/speak'), 420);
  });
};

export const openTranslate = (en, zh) => {
  sheet({
    title: '整句翻译',
    body: `<div class="small" style="line-height:1.6">${renderSentence(en)}</div>
      <div class="card flat" style="margin-top:10px;background:var(--surface-2);box-shadow:none">
        <div class="small" style="font-weight:600">${esc(zh)}</div>
      </div>
      <button class="btn sm soft" style="margin-top:12px" data-say3>${icon('volume-2')}朗读整句</button>
      <div class="tiny muted" style="margin-top:10px">提示：点句中任意单词可查看释义与发音。</div>`,
    onMount(panel) { $('[data-say3]', panel).onclick = () => say(en); },
  });
};

/* ---------- 跟读评分 ---------- */
export const openShadow = (en, zh = '', onDone) => {
  let rec = null;
  let mode = 'idle';
  let result = null;
  const s = sheet({
    title: '跟读训练',
    body: `
      <div class="card flat" style="box-shadow:none;background:var(--surface-2)">
        <div class="bubble__en" style="font-size:18px">${renderSentence(en)}</div>
        ${zh ? `<div class="tiny muted" style="margin-top:6px">${esc(zh)}</div>` : ''}
      </div>
      <div class="row" style="gap:8px;margin-top:12px">
        <button class="btn sm soft" data-model>${icon('volume-2')}标准音</button>
        <button class="btn sm ghost" data-slow2>${icon('volume-1')}慢速</button>
        <span class="spacer"></span>
        <span class="tiny muted" data-hint>${asrSupported() ? '支持语音识别评分' : '无语音识别，录音后自评'}</span>
      </div>
      <div style="text-align:center;margin-top:18px">
        <button class="rec-btn" data-rec>${icon('mic')}</button>
        <div class="tiny muted" style="margin-top:10px" data-stat>点击麦克风开始录音</div>
      </div>
      <div class="wave" data-wave>${Array.from({ length: 28 }, () => '<i style="height:8px"></i>').join('')}</div>
      <div data-result></div>`,
    onMount(panel, close) {
      const wave = $('[data-wave]', panel);
      const stat = $('[data-stat]', panel);
      const res = $('[data-result]', panel);
      const recBtn = $('[data-rec]', panel);
      let raf = null;
      const animate = () => {
        if (!rec) return;
        const lvl = rec.level();
        [...wave.children].forEach((b, i) => {
          const h = 8 + Math.abs(Math.sin(Date.now() / 90 + i)) * lvl * 46;
          b.style.height = Math.round(h) + 'px';
        });
        raf = requestAnimationFrame(animate);
      };
      const stopRec = async () => {
        cancelAnimationFrame(raf);
        stat.textContent = '正在分析…';
        const out = await rec.stop();
        rec = null;
        recBtn.classList.remove('rec');
        recBtn.innerHTML = icon('mic');
        [...wave.children].forEach((b) => b.style.height = '8px');
        if (asrSupported()) {
          try {
            stat.textContent = '请再说一遍，正在识别…';
            const r = recognize({ lang: S().accent, timeout: 8000 });
            await say(en, { rate: 0.7 });
            await sleep(220);
            const heard = await r.promise;
            result = scoreSpeech(en, heard.text || '');
          } catch {
            result = mockScore(en);
          }
        } else {
          result = mockScore(en);
        }
        showResult();
      };
      const showResult = () => {
        const state = getState();
        const best = Math.max(state.stats.speakBest, result.score);
        import('../core/store.js').then(({ set, save }) => {
          set((st) => {
            st.stats.speakTries += 1;
            st.stats.speakBest = best;
            bumpProgress({ talks: (st.progress?.talks || 0) });
          }, 'speak', true);
        });
        addXP(Math.max(6, Math.round(result.score / 6)), 'shadow');
        touchDay();
        onDone?.();
        const good = result.score >= 85;
        res.innerHTML = `
          <div class="card" style="margin-top:14px;text-align:center">
            <div class="score-dial">
              <b style="color:${result.score >= 85 ? 'var(--green)' : result.score >= 65 ? 'var(--amber)' : 'var(--coral)'}">${result.score}</b>
              <span>发音得分</span>
            </div>
            <div class="small" style="margin-top:8px">${esc(result.feedback)}</div>
            ${result.missing?.length ? `<div class="tiny muted" style="margin-top:8px">可能漏读：${result.missing.map((m) => esc(m)).join('、')}</div>` : ''}
            ${result.mock ? `<div class="tiny muted" style="margin-top:8px">当前环境没有语音识别，分数为节奏参考值，请回听录音自评。</div>` : ''}
            <div class="row" style="gap:8px;margin-top:12px">
              <button class="btn sm soft" data-hear>${icon('volume-2')}再听标准音</button>
              <button class="btn sm ghost" data-again>${icon('rotate-ccw')}再来一次</button>
              <button class="btn sm primary" data-next>${icon('check')}${good ? '很好，下一个' : '再练一次'}</button>
            </div>
          </div>`;
        $('[data-hear]', res).onclick = () => say(en);
        $('[data-again]', res).onclick = () => { res.innerHTML = ''; stat.textContent = '点击麦克风开始录音'; recBtn.click(); };
        $('[data-next]', res).onclick = () => {
          if (good) { celebrate(recBtn); close(); }
          else { res.innerHTML = ''; recBtn.click(); }
        };
        stat.textContent = good ? '很棒，继续保持！' : '再听一遍标准音，注意重音和停顿。';
      };
      recBtn.onclick = async () => {
        if (rec) { await stopRec(); return; }
        if (!micSupported()) {
          toast('当前浏览器不支持录音，请用 Safari 或 Chrome', 'triangle-alert');
          return;
        }
        try {
          res.innerHTML = '';
          stat.textContent = '录音中… 说完后再次点击停止';
          rec = await new Recorder().start();
          recBtn.classList.add('rec');
          recBtn.innerHTML = icon('square');
          animate();
        } catch (e) {
          stat.textContent = '无法访问麦克风，请检查权限设置';
        }
      };
      $('[data-model]', panel).onclick = () => say(en);
      $('[data-slow2]', panel).onclick = () => say(en, { rate: 0.7 });
      setTimeout(() => say(en), 200);
    },
  });
  return s;
};

/* ---------- 跟读训练页 ---------- */
let shadowPack = { idx: 0, list: [], deck: 'core' };
export const renderShadow = () => {
  if (!shadowPack.list.length) {
    const base = sentencePool(['core', 'social']).filter((s) => wordsOnly(s.en).length >= 4 && wordsOnly(s.en).length <= 12);
    shadowPack.list = shuffle(base).slice(0, 12);
  }
  const list = shadowPack.list;
  const cur = list[shadowPack.idx % list.length];
  return `
  <section class="section" style="margin-top:2px">
    <div class="card">
      <div class="row">
        <div style="flex:1">
          <div class="small" style="font-weight:700">逐句跟读训练</div>
          <div class="tiny muted">先听标准音 → 录音 → 看反馈 → 重录</div>
        </div>
        ${ring({ value: (shadowPack.idx % list.length) / list.length, size: 46, stroke: 5 })}
      </div>
      <div class="banner b" style="margin-top:12px">${icon('target')}<div>刻意练习要点：只挑最难的 3 句，练到 85 分以上，比读完 20 句更有效。</div></div>
    </div>
  </section>
  <section class="section">
    <div class="card" style="text-align:center;padding:18px 14px">
      <div class="tiny muted">第 ${(shadowPack.idx % list.length) + 1} / ${list.length} 句 · 来自 ${esc(cur.from || '')}</div>
      <div style="font-size:19px;font-weight:600;line-height:1.5;margin-top:12px">${renderSentence(cur.en)}</div>
      <div class="tiny muted" style="margin-top:8px">${esc(cur.zh)}</div>
      <div style="margin-top:18px">
        <button class="rec-btn" data-shadow-open>${icon('mic')}</button>
      </div>
      <div class="tiny muted" style="margin-top:10px">点击开始跟读（可反复练习）</div>
      <div class="row" style="gap:8px;margin-top:16px">
        <button class="btn sm soft" data-shadow-model>${icon('volume-2')}标准音</button>
        <button class="btn sm ghost" data-shadow-slow>${icon('volume-1')}慢速</button>
        <span class="spacer"></span>
        <button class="btn sm ghost" data-shadow-next>${icon('skip-forward')}换一句</button>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">选择训练材料</h2></div>
    <div class="chips">
      <button class="chip" data-pack="core">核心例句</button>
      <button class="chip" data-pack="dialogue">场景对话句</button>
      <button class="chip" data-pack="hvac">暖通专业句</button>
      <button class="chip" data-pack="bas">楼控专业句</button>
    </div>
    <div class="grid c3" style="margin-top:10px">
      <div class="stat"><div class="stat__v">${getState().stats.speakTries}</div><div class="stat__k">累计跟读</div></div>
      <div class="stat"><div class="stat__v">${getState().stats.speakBest}</div><div class="stat__k">最高分</div></div>
      <div class="stat"><div class="stat__v">${Math.round(micSupported() ? 100 : 0)}%</div><div class="stat__k">设备支持</div></div>
    </div>
  </section>`;
};

export const mountShadow = (root, { rerender }) => {
  const cur = shadowPack.list[shadowPack.idx % shadowPack.list.length];
  root.querySelector('[data-shadow-open]')?.addEventListener('click', () => openShadow(cur.en, cur.zh, () => markTask('shadow')));
  root.querySelector('[data-shadow-model]')?.addEventListener('click', () => say(cur.en));
  root.querySelector('[data-shadow-slow]')?.addEventListener('click', () => say(cur.en, { rate: 0.7 }));
  root.querySelector('[data-shadow-next]')?.addEventListener('click', () => { shadowPack.idx++; rerender(); });
  root.querySelectorAll('[data-pack]').forEach((b) => {
    b.onclick = () => {
      const kind = b.dataset.pack;
      let list = [];
      if (kind === 'core') list = sentencePool(['core', 'social']);
      else if (kind === 'dialogue') list = sentencePool([]).filter((s) => s.from !== '单词例句');
      else if (kind === 'hvac') list = proSentences('hvac');
      else list = proSentences('bas');
      shadowPack = { idx: 0, deck: kind, list: shuffle(list.filter((s) => wordsOnly(s.en).length >= 4)).slice(0, 14) };
      toast(`已切换材料：${b.textContent.trim()}`, 'shuffle');
      rerender();
    };
  });
};

/* ---------- 发音课 ---------- */
export const renderDrills = () => `
  <section class="section" style="margin-top:4px">
    <div class="banner p">${icon('ear')}<div>中文母语者常把长元音读短、词尾辅音吞掉。下面 16 个专题按"最大收益"排序，建议每周精练 2 个。</div></div>
  </section>
  <section class="section">
    <div class="list">
      ${DRILLS.map((d) => `<button class="list__row" data-nav="#/speak/drills/${d.id}">
        <span class="list__ico p">${icon('volume-2')}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block">${esc(d.title)}</span>
          <span class="list__sub" style="display:block">${esc(d.words.slice(0, 4).join(' · '))}</span>
        </span>
        ${icon('chevron-right', 'chev')}
      </button>`).join('')}
    </div>
  </section>`;

export const renderDrill = (id) => {
  const d = DRILLS.find((x) => x.id === id);
  if (!d) return `<div class="empty">${icon('triangle-alert')}<h4>找不到这个专题</h4></div>`;
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <h2 class="section__title" style="font-size:18px">${esc(d.title)}</h2>
      <p class="small muted" style="margin-top:8px;line-height:1.6">${esc(d.zh)}</p>
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">最小对立对</h2>
      <span class="section__more">点 🔊 对比听</span></div>
    <div class="list">
      ${d.pairs.map(([a, b]) => `<div class="list__row">
        <span style="flex:1"><span class="list__title" style="display:block">${esc(a)} <span class="muted">vs</span> ${esc(b)}</span></span>
        <button class="iconbtn sm" data-say="${esc(a)}">${icon('volume-2')}</button>
        <button class="iconbtn sm" data-say="${esc(b)}">${icon('volume-2')}</button>
      </div>`).join('')}
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">单词练习</h2></div>
    <div class="card"><div class="row wrap" style="gap:8px">
      ${d.words.map((w) => `<button class="chip" data-say="${esc(w)}">${icon('volume-2')}${esc(w)}</button>`).join('')}
    </div></div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">跟读整句</h2></div>
    <div class="card">
      <div class="small" style="line-height:1.5">${renderSentence(d.sentence)}</div>
      <button class="btn primary block" style="margin-top:12px" data-shadow="${esc(d.sentence)}">${icon('mic')}开始跟读评分</button>
    </div>
  </section>`;
};

export const mountDrill = (root) => {
  root.querySelectorAll('[data-say]').forEach((b) => b.onclick = () => say(b.dataset.say));
  root.querySelector('[data-shadow]')?.addEventListener('click', (e) => {
    openShadow(e.currentTarget.dataset.shadow, '', () => markTask('shadow'));
  });
};
