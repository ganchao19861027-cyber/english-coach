/* 学习：180 天计划、句型库、学习方法 */
import { $, icon, bar, ring, sheet, toast } from '../core/ui.js';
import { esc } from '../core/util.js';
import { getState, planDay, planDayDate, taskDone, toggleStar, deckStats } from '../core/store.js';
import { PHASES, WEEKS, PLAN_DAYS, planForDay, PATTERNS, PATTERN_TAGS, patternsByTag, METHODS, DRILLS, DECKS, WORDS, WORDS_BY_DECK } from '../data/index.js';
import { speak } from '../core/speech.js';
import { renderSentence } from '../core/tap.js';

const say = (t) => speak(t, { rate: getState().settings.rate, accent: getState().settings.accent, voiceURI: getState().settings.voiceURI });

export const renderLearn = () => {
  const day = planDay();
  const plan = planForDay(day);
  const learned = Object.keys(getState().words.learned).length;
  return `
  <section class="section" style="margin-top:4px">
    <button class="card press" data-nav="#/learn/plan" style="width:100%;text-align:left;padding:16px">
      <div class="row">
        ${ring({ value: day / 180, size: 62, stroke: 6, label: `D${day}` })}
        <div style="flex:1;min-width:0">
          <div class="small" style="font-weight:700">180 天学习计划</div>
          <div class="tiny muted" style="margin-top:3px">当前：${esc(plan.phase.name)} · 第 ${plan.week} 周</div>
          <div class="tiny muted" style="margin-top:3px">今日主题：${esc(plan.theme)}</div>
        </div>
        ${icon('chevron-right', 'chev')}
      </div>
      <div style="margin-top:12px">${bar(day / 180)}</div>
    </button>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">学习模块</h2></div>
    <div class="list">
      <button class="list__row" data-nav="#/words">
        <span class="list__ico p">${icon('book-open')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">词库与记忆卡</span>
        <span class="list__sub" style="display:block">${learned} / ${WORDS.length} 已掌握 · 间隔重复</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/learn/patterns">
        <span class="list__ico b">${icon('text-quote')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">句型库</span>
        <span class="list__sub" style="display:block">${PATTERNS.length} 个开口框架，替换即用</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/speak/drills">
        <span class="list__ico v">${icon('ear')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">发音课</span>
        <span class="list__sub" style="display:block">${DRILLS.length} 个中文母语者难点</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/games">
        <span class="list__ico a">${icon('gamepad-2')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">闯关游戏</span>
        <span class="list__sub" style="display:block">7 种玩法，题目自动生成</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/learn/methods">
        <span class="list__ico g">${icon('brain')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">学习方法</span>
        <span class="list__sub" style="display:block">刻意练习 × 高效学习，8 条可执行原则</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">本周日程</h2>
      <span class="section__more" data-nav="#/learn/plan">全部 26 周${icon('chevron-right')}</span></div>
    <div class="list">
      ${PLAN_DAYS.slice((plan.week - 1) * 7, (plan.week - 1) * 7 + 7).map((d) => {
        const isToday = d.day === day;
        const isPast = d.day < day;
        return `<div class="list__row" data-nav="#/learn/plan/${d.day}">
          <span class="list__ico ${isToday ? 'p' : isPast ? 'g' : ''}" style="font-size:12px;font-weight:700">${d.day}</span>
          <span style="flex:1;min-width:0">
            <span class="list__title" style="display:block;font-size:15px;${isToday ? 'color:var(--primary)' : ''}">${esc(d.focus)}</span>
            <span class="list__sub" style="display:block">第 ${d.week} 周 · ${esc(d.theme)}</span>
          </span>
          ${isToday ? '<span class="tag p">今天</span>' : isPast ? icon('check', 'chev') : ''}
        </div>`;
      }).join('')}
    </div>
  </section>
  `;
};

export const renderPlan = () => {
  const day = planDay();
  return `
  <section class="section" style="margin-top:4px">
    <div class="today-head">
      <div class="today-head__eyebrow">学习计划总览</div>
      <div class="today-head__title">第 ${day} 天</div>
      <div class="today-head__sub">共 180 天 · 已完成 ${Math.round((day / 180) * 100)}% · 开始于 ${esc(getState().profile.startDate)}</div>
      <div class="today-head__row">
        ${ring({ value: day / 180, size: 58, stroke: 6, label: `${Math.round((day / 180) * 100)}%` })}
        <div class="today-head__stats">
          <div class="today-stat">
            <div class="today-stat__v">${esc(planForDay(day).phase.name)}</div>
            <div class="today-stat__k">当前阶段</div>
          </div>
          <div class="today-stat">
            <div class="today-stat__v">第 ${planForDay(day).week} 周</div>
            <div class="today-stat__k">26 周计划</div>
          </div>
        </div>
      </div>
    </div>
  </section>
  ${PHASES.map((p) => {
    const active = day >= p.range[0] && day <= p.range[1];
    const done = day > p.range[1];
    return `<section class="section">
      <div class="card ${active ? '' : 'flat'}" style="${active ? 'border:1.5px solid var(--primary)' : ''}">
        <div class="row">
          <span class="list__ico ${active ? 'p' : done ? 'g' : ''}">${icon(done ? 'check' : active ? 'play' : 'lock')}</span>
          <div style="flex:1;min-width:0">
            <div class="small" style="font-weight:700">阶段 ${p.id} · ${esc(p.name)} <span class="tiny muted">Days ${p.range[0]}-${p.range[1]}</span></div>
            <div class="tiny muted" style="margin-top:2px">${esc(p.en)} · 每天约 ${p.minutes} 分钟</div>
          </div>
          ${active ? '<span class="tag p">进行中</span>' : done ? '<span class="tag g">已完成</span>' : ''}
        </div>
        <ul class="tiny muted" style="margin:10px 0 0;padding-left:18px;line-height:1.7">
          ${p.goals.map((g) => `<li>${esc(g)}</li>`).join('')}
        </ul>
        <div class="row wrap" style="gap:6px;margin-top:10px">
          ${p.decks.map((d) => `<span class="tag">${esc(DECKS.find((x) => x.id === d)?.name || d)}</span>`).join('')}
          ${p.pro ? '<span class="tag v">含专业模块</span>' : ''}
        </div>
      </div>
    </section>`;
  }).join('')}
  <section class="section">
    <div class="section__head"><h2 class="section__title">26 周主题</h2></div>
    <div class="list">
      ${WEEKS.map((w) => `<div class="list__row" data-nav="#/learn/plan/${(w.w - 1) * 7 + 1}">
        <span class="list__ico ${w.w === planForDay(day).week ? 'p' : ''}">${icon('calendar-days')}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block;font-size:15px">第 ${w.w} 周 · ${esc(w.theme)}</span>
          <span class="list__sub" style="display:block">${esc(w.themeEn)} · ${w.days.length} 天</span>
        </span>
        ${icon('chevron-right', 'chev')}
      </div>`).join('')}
    </div>
  </section>`;
};

export const renderDay = (n) => {
  const day = Number(n) || planDay();
  const plan = planForDay(day);
  const isToday = day === planDay();
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <div class="row">
        <span class="list__ico p" style="width:44px;height:44px">${icon('calendar-check')}</span>
        <div style="flex:1">
          <div class="small" style="font-weight:700">Day ${day} · ${esc(plan.focus)}</div>
          <div class="tiny muted">${esc(plan.theme)} · 第 ${plan.week} 周 · ${esc(plan.phase.name)}</div>
        </div>
        ${isToday ? '<span class="tag p">今天</span>' : ''}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">这一天的安排</h2></div>
    <div class="list">
      ${[
        { ico: 'repeat', tone: 'b', t: '复习到期单词', s: '间隔重复：先捞回昨天的记忆', go: '#/words/review' },
        { ico: 'book-open', tone: 'p', t: `学习 ${plan.phase.id <= 2 ? 6 : 5} 个新词`, s: `词库：${plan.phase.decks.map((d) => DECKS.find((x) => x.id === d)?.name).join(' + ')}`, go: '#/words/learn' },
        { ico: 'mic', tone: 'v', t: '跟读训练', s: '目标 85 分以上，注意重音与停顿', go: '#/speak/shadow' },
        { ico: 'messages-square', tone: 'c', t: '场景对话', s: '角色扮演 + 点读翻译', go: '#/speak' },
        { ico: 'gamepad-2', tone: 'a', t: '闯关一局', s: '混合题型快速巩固', go: '#/games/speed' },
      ].map((x) => `<button class="list__row" data-nav="${x.go}">
        <span class="list__ico ${x.tone}">${icon(x.ico)}</span>
        <span style="flex:1"><span class="list__title" style="display:block;font-size:15px">${esc(x.t)}</span>
        <span class="list__sub" style="display:block">${esc(x.s)}</span></span>
        ${icon('chevron-right', 'chev')}
      </button>`).join('')}
      ${plan.phase.pro ? `<button class="list__row" data-nav="#/pro">
        <span class="list__ico g">${icon(plan.phase.id === 5 ? 'wind' : 'cpu')}</span>
        <span style="flex:1"><span class="list__title" style="display:block;font-size:15px">专业模块</span>
        <span class="list__sub" style="display:block">术语 · 概念 · 讲解演练</span></span>
        ${icon('chevron-right', 'chev')}
      </button>` : ''}
    </div>
  </section>
  <div class="row" style="gap:8px;margin-top:14px">
    ${day > 1 ? `<button class="btn ghost" data-nav="#/learn/plan/${day - 1}">${icon('chevron-left')}前一天</button>` : ''}
    ${day < 180 ? `<button class="btn primary" style="flex:1" data-nav="#/learn/plan/${day + 1}">后一天${icon('chevron-right')}</button>` : ''}
  </div>`;
};

/* ---------- 句型库 ---------- */
let patTag = 'all';
export const renderPatterns = () => {
  const list = patternsByTag(patTag);
  return `
  <section class="section" style="margin-top:4px">
    <div class="banner p">${icon('blocks')}<div>句型是"预制件"。记住框架，把主语和名词换掉，就能立刻说出新句子。</div></div>
  </section>
  <section class="section">
    <div class="chips">
      ${PATTERN_TAGS.map((t) => `<button class="chip ${t.id === patTag ? 'on' : ''}" data-pat="${t.id}">${esc(t.name)}</button>`).join('')}
    </div>
  </section>
  <section class="section">
    <div class="list">
      ${list.map(([en, zh, tag, note]) => `<div class="list__row" style="align-items:flex-start">
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block;font-size:16px;line-height:1.4">${renderSentence(en)}</span>
          <span class="list__sub" style="display:block">${esc(zh)}</span>
          ${note ? `<span class="tiny" style="display:block;color:var(--primary);margin-top:4px">${esc(note)}</span>` : ''}
        </span>
        <button class="iconbtn sm" data-say="${esc(en)}">${icon('volume-2')}</button>
      </div>`).join('')}
    </div>
  </section>`;
};

export const mountPatterns = (root, { rerender }) => {
  root.querySelectorAll('[data-pat]').forEach((b) => {
    b.onclick = () => { patTag = b.dataset.pat; rerender(); };
  });
  root.querySelectorAll('[data-say]').forEach((b) => b.onclick = () => say(b.dataset.say));
};

/* ---------- 学习方法 ---------- */
export const renderMethods = () => `
  <section class="section" style="margin-top:4px">
    <div class="banner p">${icon('graduation-cap')}<div>这个 App 不是"刷题机"。它把《刻意练习》和高效学习的核心原则，变成了每天可执行的动作。</div></div>
  </section>
  <section class="section">
    <div class="list">
      ${METHODS.map((m) => `<div class="list__row" style="align-items:flex-start">
        <span class="list__ico p">${icon(m.ico)}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block;font-size:15.5px">${esc(m.title)}</span>
          <span class="list__sub" style="display:block;line-height:1.6;margin-top:4px">${esc(m.zh)}</span>
          <span class="tiny" style="display:block;margin-top:6px;color:var(--primary);font-weight:600">怎么做：${esc(m.do)}</span>
        </span>
      </div>`).join('')}
    </div>
  </section>
  <section class="section">
    <div class="card flat" style="box-shadow:none;background:var(--surface-2);border:0">
      <div class="small" style="font-weight:700">${icon('timer')} 时间不够时怎么用</div>
      <ul class="small muted" style="margin:10px 0 0;padding-left:18px;line-height:1.8">
        <li><b>15 分钟</b>：只做"复习 + 跟读 3 句 + 一局闯关"。</li>
        <li><b>30 分钟</b>：完成今日全部任务，去掉专业模块的扩展阅读。</li>
        <li><b>60 分钟</b>：全部任务 + 专业讲解演练 + 复盘录音。</li>
      </ul>
    </div>
  </section>`;

export const mountLearn = (root) => {
  root.querySelectorAll('[data-say]').forEach((b) => b.onclick = () => say(b.dataset.say));
};
