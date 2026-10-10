/* 英语教练 · 应用外壳：路由、标签栏、引导流程、更新检查 */
import { $, icon, on, sheet, toast, celebrate, closeFeedback, mascot } from './core/ui.js';
import { esc, dayKey, haptic, isIOS, isStandalone, sleep } from './core/util.js';
import {
  load, getState, save, updateSettings, updateProfile, planDay, taskDone,
  evaluateBadges, subscribe, addXP, markTask, touchDay, BADGES,
} from './core/store.js';
import { loadVoices, primeTTS } from './core/speech.js';
import { warmAudio } from './core/audio.js';
import { initTap } from './core/tap.js';
import { stats as contentStats, planForDay, deckById } from './data/index.js';

import * as Today from './views/today.js';
import * as Learn from './views/learn.js';
import * as Speak from './views/speak.js';
import * as Words from './views/words.js';
import * as Games from './views/games.js';
import * as Pro from './views/pro.js';
import * as Me from './views/me.js';

const TABS = [
  { id: 'today', label: '今日', ico: 'house', href: '#/today' },
  { id: 'learn', label: '学习', ico: 'library', href: '#/learn' },
  { id: 'speak', label: '口语', ico: 'message-square-quote', href: '#/speak' },
  { id: 'words', label: '单词', ico: 'layers', href: '#/words' },
  { id: 'games', label: '闯关', ico: 'gamepad-2', href: '#/games' },
];

const view = () => $('#view');
const appbar = () => $('#appbar');

/* ---------- 路由解析 ---------- */
const parse = () => {
  const raw = (location.hash || '#/today').replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  return { parts, path: parts.join('/'), root: parts[0] || 'today' };
};

const TITLES = {
  today: ['今日训练', ''],
  learn: ['学习', '180 天计划与句型'],
  speak: ['口语', '场景对话 · 跟读评分'],
  words: ['单词', '间隔重复记忆'],
  games: ['闯关', '趣味做题'],
  pro: ['专业英语', 'HVAC · BAS'],
  me: ['我的', '进度与设置'],
  search: ['查词', '中英互查'],
};

let cleanup = null;

const routeToView = (r) => {
  const [a, b, c] = r.parts;
  switch (r.root) {
    case 'today':
      return { node: Today, render: () => Today.render(), mount: (root, ctx) => Today.mount(root, ctx), tab: 'today', title: TITLES.today };
    case 'learn':
      if (b === 'plan') {
        if (c) return { node: Learn, render: () => Learn.renderDay(c), mount: (root, ctx) => Learn.mountLearn(root, ctx), tab: 'learn', title: ['Day ' + c, '学习日详情'] };
        return { node: Learn, render: () => Learn.renderPlan(), mount: (root, ctx) => Learn.mountLearn(root, ctx), tab: 'learn', title: ['学习计划', '180 天路线图'] };
      }
      if (b === 'patterns') return { node: Learn, render: () => Learn.renderPatterns(), mount: (root, ctx) => Learn.mountPatterns(root, ctx), tab: 'learn', title: ['句型库', '开口框架'] };
      if (b === 'methods') return { node: Learn, render: () => Learn.renderMethods(), mount: (root) => Learn.mountLearn(root), tab: 'learn', title: ['学习方法', '刻意练习 × 高效学习'] };
      return { node: Learn, render: () => Learn.renderLearn(), mount: (root, ctx) => Learn.mountLearn(root, ctx), tab: 'learn', title: TITLES.learn };
    case 'speak': {
      if (b === 'shadow') return { node: Speak, render: () => Speak.renderShadow(), mount: (root, ctx) => Speak.mountShadow(root, ctx), tab: 'speak', title: ['跟读训练', '先听 · 再读 · 看反馈'] };
      if (b === 'drills') {
        if (c) return { node: Speak, render: () => Speak.renderDrill(c), mount: (root) => Speak.mountDrill(root), tab: 'speak', title: ['发音课', '针对性纠音'] };
        return { node: Speak, render: () => Speak.renderDrills(), mount: () => {}, tab: 'speak', title: ['发音课', '16 个难点'] };
      }
      if (b) return { node: Speak, render: () => Speak.renderDialogue(b), mount: (root, ctx) => Speak.mountDialogue(root, ctx), tab: 'speak', title: ['场景对话', '角色扮演'] };
      return { node: Speak, render: () => Speak.renderIndex(), mount: (root, ctx) => Speak.mountIndex(root, ctx), tab: 'speak', title: TITLES.speak };
    }
    case 'words': {
      if (b === 'review' || b === 'learn') {
        const mode = b === 'review' ? 'review' : 'learn';
        return {
          node: Words,
          prepare: () => {
            const cur = Words.getSession();
            const wanted = c === 'starred' ? 'starred' : mode;
            if (!cur || cur.mode !== wanted || cur.idx >= cur.queue.length) Words.startSession(wanted, c === 'starred' ? '' : (c || ''));
          },
          render: () => Words.renderSession(),
          mount: (root, ctx) => Words.mountSession(root, ctx),
          tab: 'words',
          title: mode === 'review' ? ['记忆复习', '间隔重复 · 记忆曲线'] : ['新词学习', '今天的新词'],
        };
      }
      if (b === 'starred') return { node: Words, render: () => Words.renderStarred(), mount: (root, ctx) => Words.mountWords(root, ctx), tab: 'words', title: ['生词本', '收藏的词汇'] };
      if (b === 'spell') return { node: Words, render: () => Words.renderSpell(), mount: (root, ctx) => Words.mountSpell(root, ctx), tab: 'words', title: ['拼写练习', '听音拼词'] };
      if (b) return { node: Words, render: () => Words.renderDeck(b), mount: (root, ctx) => Words.mountWords(root, ctx), tab: 'words', title: [deckById(b)?.name || '词库', deckById(b)?.sub || ''] };
      return { node: Words, render: () => Words.renderList(), mount: (root, ctx) => Words.mountWords(root, ctx), tab: 'words', title: TITLES.words };
    }
    case 'games': {
      if (b) return {
        node: Games,
        prepare: () => {
          const g = Games.getGame();
          if (!g || g.kind !== b || g.done) Games.startGame(b);
        },
        render: () => Games.renderGame(),
        mount: (root, ctx) => Games.mountGame(root, ctx),
        after: (root, ctx) => Games.startTimer(root, ctx.rerender),
        tab: 'games',
        title: ['闯关', b === 'daily' ? '每日挑战' : ''],
      };
      return { node: Games, render: () => Games.renderIndex(), mount: () => {}, tab: 'games', title: TITLES.games };
    }
    case 'pro': {
      if (b === 'talks') return { node: Pro, render: () => Pro.renderArea('hvac', 'talk'), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: ['讲解话术', '实战演练'] };
      if (b === 'faq') return { node: Pro, render: () => Pro.renderFaq(), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: ['客户问答', '标准答法'] };
      if (b === 'products') return { node: Pro, render: () => Pro.renderProducts(), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: ['品牌与产品', '一句话介绍'] };
      if (b === 'product') return { node: Pro, render: () => Pro.renderProduct(c), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: ['产品卡片', ''] };
      if (b === 'acronyms') return { node: Pro, render: () => Pro.renderAcronyms(), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: ['缩略语速查', ''] };
      if (b === 'concept') return { node: Pro, render: () => Pro.renderConcept(c), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: ['概念卡', ''] };
      if (b === 'talk') return { node: Pro, render: () => Pro.renderTalk(c), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: ['讲解演练', ''] };
      if (b === 'hvac' || b === 'bas') {
        const tab = ['terms', 'concepts', 'dialogues', 'talk'].includes(c) ? c : 'terms';
        return { node: Pro, render: () => Pro.renderArea(b, tab), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: [b === 'hvac' ? '暖通空调' : '楼宇自控', '术语 · 原理 · 对话 · 演练'] };
      }
      return { node: Pro, render: () => Pro.renderPro(), mount: (root, ctx) => Pro.mountPro(root, ctx), tab: 'pro', title: TITLES.pro };
    }
    case 'me': {
      if (b === 'badges') return { node: Me, render: () => Me.renderBadges(), mount: (root, ctx) => Me.mountMe(root, ctx), tab: 'me', title: ['成就徽章', ''] };
      if (b === 'reminder') return { node: Me, render: () => Me.renderReminder(), mount: (root, ctx) => Me.mountMe(root, ctx), tab: 'me', title: ['每日提醒', '让坚持变简单'] };
      if (b === 'settings') return { node: Me, render: () => Me.renderSettings(), mount: (root, ctx) => Me.mountMe(root, ctx), tab: 'me', title: ['设置', '发音 · 显示 · 目标'] };
      if (b === 'data') return { node: Me, render: () => Me.renderData(), mount: (root, ctx) => Me.mountMe(root, ctx), tab: 'me', title: ['数据备份', ''] };
      if (b === 'about') return { node: Me, render: () => Me.renderAbout(), mount: (root, ctx) => Me.mountMe(root, ctx), tab: 'me', title: ['安装与关于', ''] };
      return { node: Me, render: () => Me.renderMe(), mount: (root, ctx) => Me.mountMe(root, ctx), tab: 'me', title: TITLES.me };
    }
    case 'search':
      return { node: Me, render: () => Me.renderSearch(), mount: (root, ctx) => Me.mountSearch(root, ctx), tab: 'words', title: TITLES.search };
    default:
      return { node: Today, render: () => Today.render(), mount: (root, ctx) => Today.mount(root, ctx), tab: 'today', title: TITLES.today };
  }
};

let currentCat = 'all';

const nav = (href, { replace = false, reload = false } = {}) => {
  if (href && href !== location.hash) {
    if (replace) history.replaceState(null, '', href); else location.hash = href;
  }
  if (!href || href === location.hash || reload) draw();
};

const draw = () => {
  const r = parse();
  const route = routeToView(r);
  closeFeedback();
  cleanup?.();
  cleanup = null;

  const [title, sub] = Array.isArray(route.title) ? route.title : [route.title, ''];
  const st = getState();
  appbar().innerHTML = `
    <div style="flex:1;min-width:0">
      <div class="appbar__title">${esc(title || '英语教练')}</div>
      ${sub ? `<span class="appbar__sub">${esc(sub)}</span>` : ''}
    </div>
    <span class="appbar__tag">${icon('flame')}${st.stats.streak}</span>
    <button class="appbar__btn" data-nav="#/search" aria-label="查词">${icon('search')}</button>
    <button class="appbar__btn" data-nav="#/me" aria-label="我的">${icon('settings')}</button>`;

  const v = view();
  v.className = 'view';
  try { route.prepare?.(); } catch (e) { console.error('[prepare]', e); }
  v.innerHTML = route.render();
  window.scrollTo({ top: 0 });
  // one orchestrated entrance per navigation (never on in-place re-renders)
  v.classList.add('view--enter');
  setTimeout(() => v.classList.remove('view--enter'), 700);

  const ctx = { nav, rerender: () => { v.innerHTML = route.render(); bindView(route, v, ctx); }, replace: (html) => { v.innerHTML = html; bindView(route, v, ctx); } };
  bindView(route, v, ctx);
  drawTabs(route.tab, r);
  document.title = `${title || '英语教练'} · 英语教练`;
};

const bindView = (route, v, ctx) => {
  try {
    route.mount?.(v, ctx);
    cleanup?.();
    cleanup = route.after?.(v, ctx) || null;
  } catch (e) {
    console.error('[view mount]', e);
  }
};

const drawTabs = (active, r) => {
  const tb = $('#tabbar');
  tb.innerHTML = TABS.map((t) => {
    const on_ = t.id === active || (active === 'learn' && t.id === 'learn');
    return `<button class="tabbar__item ${on_ ? 'on' : ''}" data-nav="${t.href}">
      <span class="tabbar__ico">${icon(t.ico)}</span><span>${t.label}</span>
      ${t.id === 'games' && !taskDone('game') ? '<span class="tabbar__badge">!</span>' : ''}
    </button>`;
  }).join('');
};

/* ---------- 全局交互 ---------- */
const bindGlobal = () => {
  on(document.body, 'click', '[data-nav]', (e, t) => {
    e.preventDefault();
    haptic(6);
    nav(t.dataset.nav);
  });
  initTap(document.body);
  document.addEventListener('scroll', () => {
    appbar().classList.toggle('scrolled', window.scrollY > 6);
  }, { passive: true });
  window.addEventListener('hashchange', draw);
  subscribe((st, evt) => {
    if (evt === 'xp' || evt === 'streak') {
      const tag = appbar().querySelector('.appbar__tag');
      if (tag) tag.innerHTML = `${icon('flame')}${st.stats.streak}`;
    }
  });
};

/* ---------- 引导流程 ---------- */
const QUIZ = [
  { q: 'Hello, how are you?', a: '你好，你好吗？', opts: ['你好，你好吗？', '你叫什么名字？', '现在几点了？'] },
  { q: 'I would like a coffee, please.', a: '我想要一杯咖啡，谢谢。', opts: ['我想要一杯咖啡，谢谢。', '咖啡太贵了。', '我不喝咖啡。'] },
  { q: 'Could you say that again?', a: '你能再说一遍吗？', opts: ['你能再说一遍吗？', '你能快一点吗？', '你在说什么语言？'] },
  { q: 'Where is the meeting room?', a: '会议室在哪里？', opts: ['会议室在哪里？', '会议几点开始？', '会议室有人吗？'] },
  { q: 'Please send me the quotation by Friday.', a: '请在周五前把报价发给我。', opts: ['请在周五前把报价发给我。', '报价已经收到了。', '周五我要请假。'] },
  { q: 'The chiller supplies chilled water to the AHUs.', a: '冷水机组向空气处理机组提供冷冻水。', opts: ['冷水机组向空气处理机组提供冷冻水。', '冷却塔为冷水机组散热。', '水泵把水送到屋顶。'] },
  { q: 'We keep twenty percent spare points on each controller.', a: '每个控制器预留 20% 备用点位。', opts: ['每个控制器预留 20% 备用点位。', '每个控制器最多接 20 个点。', '系统需要 20 台控制器。'] },
  { q: 'Remote access must go through a VPN.', a: '远程访问必须通过 VPN。', opts: ['远程访问必须通过 VPN。', '远程访问完全禁止。', 'VPN 需要额外收费。'] },
];

const renderOnboarding = () => {
  const st = getState();
  const root = $('#view');
  $('#tabbar').innerHTML = '';
  appbar().innerHTML = `<div style="flex:1"><div class="appbar__title">英语教练</div></div>`;
  let step = 0;
  let name = st.profile.name || '';
  let minutes = st.profile.dailyMinutes || 30;
  let track = st.profile.track || 'both';
  let time = st.settings.reminderTime || '20:00';
  let answers = [];

  const render = () => {
    const cs = contentStats();
    const head = `
      <div style="text-align:center;padding:8px 0 18px">
        <div style="display:grid;justify-items:center">${mascot({ size: 96, mood: 'happy' })}</div>
        <h1 style="font-size:23px;font-weight:800;letter-spacing:-.03em;margin-top:14px">英语教练 · English Coach</h1>
        <p class="small muted" style="margin-top:6px">180 天，从"能看懂"到"能开口谈客户"</p>
      </div>`;

    if (step === 0) {
      root.innerHTML = `<div class="view no-tab" style="padding-top:calc(var(--safe-t) + 30px)">
        ${head}
        <div class="card">
          <div class="small" style="font-weight:650">怎么称呼你？</div>
          <input id="ob-name" class="card" value="${esc(name)}" placeholder="例如：王伟"
            style="width:100%;margin-top:8px;border:1px solid var(--line);box-shadow:none;height:44px;padding:0 12px">
          <div class="small" style="font-weight:650;margin-top:16px">每天能学多久？</div>
          <div class="seg" id="ob-min" style="margin-top:8px">
            ${[[15, '15 分钟'], [30, '30 分钟'], [45, '45 分钟'], [60, '60 分钟']].map(([v, l]) =>
              `<button class="seg__item ${minutes === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}
          </div>
          <div class="small" style="font-weight:650;margin-top:16px">主要目标？</div>
          <div class="seg" id="ob-track" style="margin-top:8px">
            ${[['both', '口语+专业'], ['conversation', '日常口语'], ['pro', '专业英语']].map(([v, l]) =>
              `<button class="seg__item ${track === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="tiny muted" style="line-height:1.8">
            · ${cs.words} 个核心与专业词汇，全部配例句与发音<br>
            · ${cs.dialogues} 个真实场景对话，可点读、可跟读、可角色扮演<br>
            · 暖通空调与楼宇自控双专业模块，直接对接客户沟通
          </div>
        </div>
        <button class="btn primary block lg" data-next style="margin-top:16px">下一步：快速自评</button>
      </div>`;
      $('#ob-name').oninput = (e) => { name = e.target.value; };
      root.querySelectorAll('#ob-min [data-v]').forEach((b) => b.onclick = () => { minutes = Number(b.dataset.v); render(); });
      root.querySelectorAll('#ob-track [data-v]').forEach((b) => b.onclick = () => { track = b.dataset.v; render(); });
    } else if (step === 1) {
      const idx = answers.length;
      const q = QUIZ[idx];
      root.innerHTML = `<div class="view no-tab" style="padding-top:calc(var(--safe-t) + 20px)">
        <div class="row tiny muted" style="margin-bottom:8px"><span>快速自评</span><span class="spacer"></span><span>${idx + 1} / ${QUIZ.length}</span></div>
        <div class="bar"><i style="width:${(idx / QUIZ.length) * 100}%"></i></div>
        <div class="card" style="margin-top:14px;text-align:center;padding:22px 14px">
          <div class="tiny muted">这句话是什么意思？</div>
          <div style="font-size:20px;font-weight:650;margin-top:10px;line-height:1.4">${esc(q.q)}</div>
        </div>
        <div style="margin-top:14px">
          ${q.opts.map((o, i) => `<button class="opt" data-ob-opt="${i}"><span class="opt__key">${'ABCD'[i]}</span><span style="flex:1">${esc(o)}</span></button>`).join('')}
        </div>
        <div class="tiny muted center" style="margin-top:12px">不确定就凭感觉选，这不会影响成绩，只用来安排起点。</div>
      </div>`;
    } else if (step === 2) {
      root.innerHTML = `<div class="view no-tab" style="padding-top:calc(var(--safe-t) + 20px)">
        <div style="text-align:center;padding:10px 0 16px">
          <div style="font-size:44px">🔔</div>
          <h1 style="font-size:21px;font-weight:750;margin-top:8px">设定每日提醒</h1>
          <p class="small muted" style="margin-top:6px">固定时间学习，比"想起来才学"有效 3 倍以上</p>
        </div>
        <div class="card">
          <div class="row"><span class="small" style="font-weight:650">提醒时间</span><span class="spacer"></span>
            <input type="time" id="ob-time" value="${esc(time)}" style="border:1px solid var(--line);border-radius:var(--r);height:40px;padding:0 10px;background:var(--surface)">
          </div>
          <div class="tiny muted" style="margin-top:10px">稍后可以在"我的 → 每日提醒"里生成日历提醒或设置快捷指令自动化。</div>
        </div>
        <div class="card">
          <div class="small" style="font-weight:650">你的起点</div>
          <div class="tiny muted" style="margin-top:6px" id="ob-level"></div>
        </div>
        <button class="btn primary block lg" data-finish style="margin-top:16px">开始我的 180 天计划</button>
      </div>`;
      const score = answers.filter(Boolean).length;
      const level = score >= 6 ? '已具备基础，可从第 2 阶段起步，重点补表达' : score >= 3 ? '有基础但不成体系，从第 1 阶段开始最稳' : '起点阶段：先建立声音与高频词的连接';
      $('#ob-level').textContent = `自评 ${score}/${QUIZ.length} · ${level}`;
      $('#ob-time').onchange = (e) => { time = e.target.value; };
    }
  };

  const onClick = (e) => {
    const next = e.target.closest('[data-next]');
    if (next) { step = 1; render(); return; }
    const opt = e.target.closest('[data-ob-opt]');
    if (opt) {
      const idx = answers.length;
      const correct = QUIZ[idx].opts[Number(opt.dataset.obOpt)] === QUIZ[idx].a;
      answers.push(correct);
      if (answers.length >= QUIZ.length) { step = 2; render(); }
      else {
        opt.classList.add(correct ? 'ok' : 'no');
        setTimeout(render, 320);
      }
      return;
    }
    if (e.target.closest('[data-finish]')) {
      updateProfile({ name: name.trim(), dailyMinutes: minutes, track, onboarded: true, startDate: dayKey(), level: answers.filter(Boolean).length >= 6 ? 'elementary' : 'beginner' });
      updateSettings({ reminderTime: time });
      addXP(20, 'onboarding');
      nav('#/today', { reload: true });
      celebrate($('#view'));
      toast('欢迎开始，第一天计划已为你准备好', 'rocket');
    }
  };
  root.addEventListener('click', onClick);
  render();
};

/* ---------- 提醒检查 ---------- */
const checkReminder = () => {
  const st = getState();
  if (!st.settings.reminderOn) return;
  const [h, m] = (st.settings.reminderTime || '20:00').split(':').map(Number);
  const now = new Date();
  const due = now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
  const plan = planForDay(planDay());
  const tasks = ['review', 'new', 'shadow', 'dialogue', 'game'];
  const done = tasks.filter((t) => taskDone(t)).length;
  if (due && done < tasks.length && !st.days[dayKey()]?.prompted) {
    setTimeout(() => {
      sheet({
        title: '今天的训练还没完成',
        body: `<p class="small" style="line-height:1.7">现在是 ${st.settings.reminderTime}，今天还有 <b>${tasks.length - done}</b> 项任务没做。
          只要 15 分钟就能保住连续 <b>${st.stats.streak}</b> 天的记录。</p>
          <div class="banner p" style="margin-top:12px">${icon('flame')}<div>今日主题：${esc(plan.focus)}</div></div>
          <button class="btn primary block lg" style="margin-top:14px" data-sheet-close data-go-now>现在就去练 15 分钟</button>
          <button class="btn block ghost" style="margin-top:8px" data-sheet-close>稍后</button>`,
        onMount(panel, close) {
          $('[data-go-now]', panel).onclick = () => { setTimeout(() => nav('#/words/review'), 200); };
          const rec = getState().days[dayKey()] || {};
          rec.prompted = true;
          getState().days[dayKey()] = rec;
          save();
        },
      });
    }, 1400);
  }
};

/* ---------- 徽章提示 ---------- */
const watchBadges = () => {
  const newly = evaluateBadges();
  if (newly.length) {
    const b = newly[0];
    setTimeout(() => toast(`解锁成就：${b.name}`, b.ico, 2600), 600);
  }
};

/* ---------- 启动 ---------- */
const boot = async () => {
  load();
  bindGlobal();
  // 第一次触摸/点击时解锁语音引擎（iOS 要求）
  document.addEventListener('pointerdown', () => primeTTS(), { once: true, passive: true });
  document.addEventListener('touchend', () => primeTTS(), { once: true, passive: true });
  await loadVoices().catch(() => {});
  warmAudio().catch(() => {});
  if (!getState().profile.onboarded) {
    renderOnboarding();
    $('#tabbar').innerHTML = '';
  } else {
    draw();
    checkReminder();
  }
  hideBoot();
  watchBadges();
  setInterval(watchBadges, 30000);

  /* service worker */
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('发现新内容，下次打开自动更新', 'cloud-download', 2600);
          }
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (sessionStorage.getItem('ec_reloaded')) return;
        sessionStorage.setItem('ec_reloaded', '1');
      });
    } catch (e) {
      console.warn('[sw]', e);
    }
  }

  if (isIOS() && !isStandalone()) {
    if (!sessionStorage.getItem('ec_ios_hint')) {
      sessionStorage.setItem('ec_ios_hint', '1');
      setTimeout(() => {
        toast('提示：分享 → 添加到主屏幕，可全屏离线使用', 'share', 3600);
      }, 2600);
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { watchBadges(); stopSpeak?.(); }
  });
};

const hideBoot = () => {
  const b = document.getElementById('boot');
  if (!b) return;
  setTimeout(() => {
    b.classList.add('gone');
    setTimeout(() => b.remove(), 420);
  }, 120);
};

let stopSpeak;
import('./core/speech.js').then((m) => { stopSpeak = m.stopSpeak; });

boot();

/* 暴露给调试 */
window.__ec = { getState, nav, draw, contentStats };
