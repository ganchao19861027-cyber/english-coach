/* 今日：每日任务、连胜、经验、快速入口 */
import { icon, ring, bar, section, toast } from '../core/ui.js';
import { esc, fmtDate, dayKey, pct } from '../core/util.js';
import {
  getState, levelInfo, levelTitle, planDay, taskDone, markTask,
  dueList, todayRec, planDayDate,
} from '../core/store.js';
import { DIALOGUES, PATTERNS, WORDS_BY_DECK, planForDay, deckById } from '../data/index.js';
import { renderSentence } from '../core/tap.js';

const TASK_DEFS = (ctx) => {
  const { due, day, phase, dialogue } = ctx;
  const list = [
    { id: 'review', title: '复习到期单词', sub: due > 0 ? `${due} 个单词等你复习` : '今天没有到期单词，做一轮快速回顾', ico: 'repeat', tone: 'b', go: '#/words/review', min: 6 },
    { id: 'new', title: `学习 ${phase.id <= 2 ? 6 : 5} 个新词`, sub: `${deckById(phase.decks[0])?.name} · 第 ${day} 天`, ico: 'book-open', tone: 'p', go: '#/words/learn', min: 8 },
    { id: 'shadow', title: '跟读训练 5 句', sub: '先听再读，目标 85 分以上', ico: 'mic', tone: 'v', go: '#/speak/shadow', min: 8 },
    { id: 'dialogue', title: dialogue.title, sub: `场景对话 · ${dialogue.titleEn}`, ico: 'messages-square', tone: 'c', go: `#/speak/${dialogue.id}`, min: 10 },
    {
      id: 'game',
      title: day % 7 === 0 ? '极速抢答挑战' : '听音闯关',
      sub: day % 7 === 0 ? '60 秒混合题型，考验反应' : '点喇叭听发音，选出正确意思',
      ico: day % 7 === 0 ? 'timer' : 'headphones',
      tone: 'a',
      go: day % 7 === 0 ? '#/games/speed' : '#/games/listen',
      min: 5,
    },
  ];
  if (phase.pro) list.push({ id: 'pro', title: phase.id >= 5 ? '专业模块训练' : '商务与专业热身', sub: phase.id >= 5 ? (phase.id === 5 ? '暖通空调专业英语' : '楼宇自控与方案汇报') : '产品讲解与客户沟通', ico: phase.id >= 5 ? (phase.id === 5 ? 'wind' : 'cpu') : 'briefcase', tone: 'g', go: phase.id >= 5 ? `#/pro/${phase.id === 5 ? 'hvac' : 'bas'}` : '#/pro/talks', min: 12 });
  return list;
};

export const render = () => {
  const s = getState();
  const day = planDay();
  const plan = planForDay(day);
  const phase = plan.phase;
  const due = dueList(WORDS_BY_DECK[phase.decks[0]] || []).length;
  const pool = (phase.decks || ['core']).flatMap((d) => WORDS_BY_DECK[d] || []);
  const dueAll = dueList(pool).length;
  const dialogue = DIALOGUES[(day - 1) % DIALOGUES.length];
  const tasks = TASK_DEFS({ due: dueAll, day, phase, dialogue });
  const rec = todayRec();
  const doneCount = tasks.filter((t) => taskDone(t.id)).length;
  const lv = levelInfo(s.stats.xp);
  const totalMin = tasks.reduce((n, t) => n + t.min, 0);
  const quote = PATTERNS[(day * 7) % PATTERNS.length];
  const learnedCount = Object.keys(s.words.learned).length;
  const weekStart = Math.floor((day - 1) / 7) * 7 + 1;
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart + i).filter((d) => d <= 180);

  return `
  <div class="today-head">
    <div class="today-head__eyebrow">第 ${day} / 180 天 · ${esc(phase.name)}</div>
    <div class="today-head__title balance">${esc(plan.theme)}</div>
    <div class="today-head__sub pretty">${esc(plan.focus)} · 今天约 ${totalMin} 分钟</div>
    <div class="today-head__row">
      ${ring({ value: doneCount / tasks.length, size: 62, stroke: 6, label: `${doneCount}/${tasks.length}` })}
      <div class="today-head__stats">
        <div class="today-stat">
          <div class="today-stat__v">${s.stats.streak}</div>
          <div class="today-stat__k">连续天数</div>
        </div>
        <div class="today-stat">
          <div class="today-stat__v">${s.stats.xp}</div>
          <div class="today-stat__k">经验值</div>
        </div>
        <div class="today-stat">
          <div class="today-stat__v">Lv.${lv.level}</div>
          <div class="today-stat__k">${esc(levelTitle(lv.level))}</div>
        </div>
      </div>
    </div>
    <div class="week-strip">
      ${weekDays.map((d) => {
        const rec = s.days[planDayDate(d)];
        const done = rec && Object.keys(rec.tasks || {}).length > 0;
        const cls = d === day ? 'today' : done ? 'done past' : d < day ? 'past' : '';
        return `<div class="week-strip__day ${cls}"><b>${d}</b><i></i></div>`;
      }).join('')}
    </div>
  </div>

  <section class="section">
    <div class="section__head">
      <h2 class="section__title">今日任务</h2>
      <span class="section__more" data-nav="#/learn/plan">学习计划${icon('chevron-right')}</span>
    </div>
    <div class="list">
      ${tasks.map((t) => {
        const done = taskDone(t.id);
        return `<div class="list__row" data-nav="${t.go}">
          <button class="iconbtn sm" data-task="${t.id}" style="${done ? 'background:var(--green);color:#fff' : ''}" aria-label="标记完成">${icon(done ? 'check' : t.ico)}</button>
          <span style="flex:1;min-width:0">
            <span class="list__title" style="display:block;${done ? 'color:var(--muted)' : ''}">${esc(t.title)}</span>
            <span class="list__sub" style="display:block">${esc(t.sub)} · ${t.min} 分钟</span>
          </span>
          ${icon('chevron-right', 'chev')}
        </div>`;
      }).join('')}
    </div>
    <div class="row" style="margin-top:10px;gap:8px">
      <button class="btn primary" style="flex:1" data-nav="${tasks.find((t) => !taskDone(t.id))?.go || '#/speak/shadow'}">
        ${icon('play')}${doneCount ? '继续今日学习' : '开始今日学习'}
      </button>
      <button class="iconbtn sm" style="width:44px;height:44px" data-focus-help aria-label="学习顺序说明">${icon('circle-question-mark')}</button>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">快速入口</h2></div>
    <div class="grid c4">
      ${[
        { go: '#/words/review', ico: 'repeat', tone: 'b', label: '复习' },
        { go: '#/speak', ico: 'messages-square', tone: 'c', label: '场景' },
        { go: '#/games', ico: 'gamepad-2', tone: 'a', label: '闯关' },
        { go: '#/pro', ico: 'briefcase', tone: 'g', label: '专业' },
      ].map((q) => `<button class="card press tight" data-nav="${q.go}" style="text-align:center">
        <span class="stat__ico ${q.tone === 'b' ? '' : ''}" style="margin:0 auto 6px;background:var(--${q.tone === 'p' ? 'primary' : q.tone === 'a' ? 'amber' : q.tone === 'v' ? 'violet' : q.tone === 'c' ? 'coral' : q.tone === 'g' ? 'green' : 'blue'}-50);color:var(--${q.tone === 'p' ? 'primary' : q.tone === 'a' ? 'amber' : q.tone === 'v' ? 'violet' : q.tone === 'c' ? 'coral' : q.tone === 'g' ? 'green' : 'blue'})">${icon(q.ico)}</span>
        <span class="tiny" style="font-weight:650">${esc(q.label)}</span>
      </button>`).join('')}
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">今日一句</h2></div>
    <div class="card">
      <div class="small" style="line-height:1.5">${renderSentence(quote[0])}</div>
      <div class="tiny muted" style="margin-top:6px">${esc(quote[1])} · ${esc(quote[3] || '')}</div>
      <div class="row" style="margin-top:12px;gap:8px">
        <button class="btn sm soft" data-say-one="${esc(quote[0])}">${icon('volume-2')}朗读</button>
        <button class="btn sm ghost" data-nav="#/learn/patterns">${icon('book-a')}句型库</button>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">进度概览</h2>
      <span class="section__more" data-nav="#/me">详细统计${icon('chevron-right')}</span></div>
    <div class="grid c3">
      <div class="stat"><div class="stat__v">${learnedCount}</div><div class="stat__k">已掌握单词</div></div>
      <div class="stat"><div class="stat__v">${Object.keys(s.dialoguesDone).length}</div><div class="stat__k">完成场景</div></div>
      <div class="stat"><div class="stat__v">${s.stats.speakTries}</div><div class="stat__k">跟读次数</div></div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="row tiny muted"><span>等级进度</span><span class="spacer"></span><span>Lv.${lv.level} ${esc(levelTitle(lv.level))} · 还需 ${lv.need - lv.into} XP</span></div>
      <div style="margin-top:8px">${bar(lv.ratio)}</div>
      <div class="row tiny muted" style="margin-top:12px"><span>180 天计划</span><span class="spacer"></span><span>${Math.round((day / 180) * 100)}%</span></div>
      <div style="margin-top:8px">${bar(day / 180, 'amber')}</div>
    </div>
  </section>

  <section class="section">
    <div class="card flat" style="box-shadow:none;background:var(--surface-2);border:0">
      <div class="row" style="gap:10px;align-items:flex-start">
        ${icon('lightbulb', 'chev')}
        <div style="flex:1">
          <div class="small" style="font-weight:650">今天的重点</div>
          <div class="tiny muted" style="margin-top:4px">${esc(plan.focus)}。${plan.isReview ? '复盘日不要怕重复，重复本身就是刻意练习的一部分。' : '先听清再开口，读完对照得分，比快更重要。'}</div>
        </div>
      </div>
    </div>
  </section>
  `;
};

export const mount = (root, { nav }) => {
  root.querySelectorAll('[data-task]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.task;
      const nowDone = !taskDone(id);
      markTask(id, nowDone);
      if (nowDone) toast('完成一项，继续加油', 'check-check');
      nav(location.hash, { replace: true, reload: true });
    };
  });
  const help = root.querySelector('[data-focus-help]');
  if (help) help.onclick = () => {
    import('../core/ui.js').then(({ sheet }) => {
      sheet({
        title: '今天的顺序为什么这样排',
        body: `<div class="small" style="line-height:1.7">
          <p><b>1. 先复习后学新</b>：间隔重复先把昨天的记忆捞回来，再学新词，效率最高。</p>
          <p style="margin-top:10px"><b>2. 跟读放在中间</b>：刚学完的词立刻在句子里读出来，从"认识"变成"能用"。</p>
          <p style="margin-top:10px"><b>3. 场景对话是主菜</b>：语言是用来完成任务的，把词放进真实场景。</p>
          <p style="margin-top:10px"><b>4. 游戏收尾</b>：用快速反馈巩固今天的记忆，顺便赚经验值。</p>
          <p style="margin-top:10px" class="muted">如果只有 15 分钟，就只做：复习 → 跟读 → 一局闯关。</p>
        </div>`,
      });
    });
  };
  root.querySelectorAll('[data-say-one]').forEach((b) => {
    b.onclick = () => {
      import('../core/speech.js').then(({ speak }) => speak(b.dataset.sayOne, { rate: 0.95 }));
    };
  });
};
