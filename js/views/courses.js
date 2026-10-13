/* 专业课程：独立课程体系（暖通空调 18 节 + 楼宇自控 18 节）
   路径：课程首页 → 学科 → 6 级 → 单课五步（讲解 · 术语 · 句型 · 测验 · 讲解任务） */
import { $, icon, bar, ring, toast, celebrate, openFeedback, mascot, stars as starsRow } from '../core/ui.js';
import { esc, clamp } from '../core/util.js';
import {
  getState, addXP, markTask, touchDay, recordAnswer,
  markLessonDone, lessonRecord, courseDoneCount,
} from '../core/store.js';
import {
  COURSE_TRACKS, COURSES, trackById, lessonsByTrack, lessonsByLevel,
  lessonById, lessonAfter, courseStats,
} from '../data/courses.js';
import { speak } from '../core/speech.js';
import { renderSentence, openWordSheet } from '../core/tap.js';
import { openShadow } from './speak.js';

const S = () => getState().settings;
const say = (t, o = {}) => speak(t, { rate: S().rate, accent: S().accent, voiceURI: S().voiceURI, ...o });
const toneOf = (track) => (track === 'hvac' ? 'g' : 'v');
const trackName = (track) => (track === 'hvac' ? '暖通空调' : '楼宇自控');
const STAR_PATH = 'M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z';
const starMini = (n) => `<span class="row" style="gap:1px;display:inline-flex">${Array.from({ length: 3 }, (_, i) =>
  `<svg viewBox="0 0 24 24" width="11" height="11" fill="${i < n ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" style="opacity:${i < n ? 1 : .38}"><path d="${STAR_PATH}"/></svg>`).join('')}</span>`;

/* ---------- 课程首页 ---------- */
export const renderCourses = () => {
  const cs = courseStats();
  const done = courseDoneCount();
  const nextLesson = COURSES.find((c) => !lessonRecord(c.id));
  return `
  <section class="section" style="margin-top:4px">
    <div class="today-head" style="background:linear-gradient(178deg,var(--cat-core-soft) 0%,var(--surface) 62%)">
      <div class="today-head__eyebrow">专业课程体系 · 独立板块</div>
      <div class="today-head__title balance" style="font-size:var(--fs-title1)">从零基础到工程师级</div>
      <div class="today-head__sub pretty">先学懂专业，再学会用英文讲。每节课都是同一条路径：讲解 → 术语 → 句型 → 测验 → 讲解任务。</div>
      <div class="today-head__row">
        ${ring({ value: done / cs.lessons, size: 62, stroke: 6, label: `${done}/${cs.lessons}` })}
        <div class="today-head__stats">
          <div class="today-stat"><div class="today-stat__v">${cs.lessons}</div><div class="today-stat__k">节课 · 双领域</div></div>
          <div class="today-stat"><div class="today-stat__v">${Math.round(cs.minutes / 60)}h</div><div class="today-stat__k">总学习量</div></div>
        </div>
        <div style="flex:none;margin-left:auto">${mascot({ size: 58, mood: done ? 'happy' : 'idle' })}</div>
      </div>
    </div>
  </section>

  ${nextLesson ? `<section class="section">
    <button class="btn primary block lg" data-nav="#/courses/lesson/${nextLesson.id}">
      ${icon('play')}继续学习：${esc(nextLesson.title)}
    </button>
    <div class="tiny muted center" style="margin-top:8px">${esc(trackName(nextLesson.track))} · 第 ${nextLesson.level} 级 · 约 ${nextLesson.minutes} 分钟</div>
  </section>` : `<section class="section">
    <div class="banner p">${icon('award')}<div>36 节课全部完成，你已经具备与外国客户讲解专业方案的知识底子。建议回到"讲解话术"巩固实战表达。</div></div>
  </section>`}

  <section class="section">
    <div class="section__head"><h2 class="section__title">两条专业线</h2><span class="section__more">共 36 课${icon('route')}</span></div>
    <div class="list">
      ${COURSE_TRACKS.map((t) => {
        const ls = lessonsByTrack(t.id);
        const d = ls.filter((l) => lessonRecord(l.id)).length;
        const stars = ls.reduce((n, l) => n + (lessonRecord(l.id)?.stars || 0), 0);
        return `<button class="list__row" data-nav="#/courses/${t.id}" style="align-items:flex-start">
          <span class="list__ico ${t.tone}" style="width:44px;height:44px">${icon(t.ico)}</span>
          <span style="flex:1;min-width:0">
            <span class="list__title" style="display:block;font-size:16px">${esc(t.name)} · ${esc(t.en)}</span>
            <span class="list__sub" style="display:block">${esc(t.sub)} · 18 节 · 6 级</span>
            <span style="display:block;margin-top:8px">${bar(d / ls.length, t.id === 'bas' ? 'violet' : '')}</span>
            <span class="tiny muted" style="display:block;margin-top:6px">${d}/18 已完成 · 累计 ${stars} 星</span>
          </span>
          ${icon('chevron-right', 'chev')}
        </button>`;
      }).join('')}
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">每节课的五个动作</h2></div>
    <div class="list">
      ${[
        ['book-open', 'p', '听讲解', '用专家视角把原理讲成白话，先建立系统认知'],
        ['spell-check', 'b', '记术语', '6 个核心术语，点读、朗读、跟读一步到位'],
        ['text-quote', 'g', '练句型', '5 句业务表达，都是能直接对客户说的话'],
        ['list-checks', 'a', '做测验', '4 道题检验理解，答错立刻看到解释'],
        ['presentation', 'v', '讲出来', '用英文完成一次讲解任务，费曼式收尾'],
      ].map(([ic, tone, title, sub]) => `<div class="list__row" style="min-height:52px">
        <span class="list__ico ${tone}" style="width:36px;height:36px">${icon(ic)}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block;font-size:15px">${esc(title)}</span>
          <span class="list__sub" style="display:block">${esc(sub)}</span>
        </span>
      </div>`).join('')}
    </div>
    <div class="tiny muted" style="margin:10px 4px 0">${cs.terms} 个专业术语 · ${cs.sentences} 句业务英语 · ${cs.quizzes} 道知识测验，全部支持真人发音与点读。</div>
  </section>`;
};

export const mountCourses = () => {};

/* ---------- 学科路径 ---------- */
export const renderTrack = (trackId) => {
  const track = trackById(trackId) || COURSE_TRACKS[0];
  const lessons = lessonsByTrack(track.id);
  const doneList = lessons.filter((l) => lessonRecord(l.id));
  const progress = doneList.length / lessons.length;
  const next = lessons.find((l) => !lessonRecord(l.id)) || lessons[lessons.length - 1];
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <div class="row">
        <span class="list__ico ${track.tone}" style="width:46px;height:46px">${icon(track.ico)}</span>
        <div style="flex:1;min-width:0">
          <div class="small" style="font-weight:700">${esc(track.name)} · ${esc(track.en)}</div>
          <div class="tiny muted" style="margin-top:2px">${esc(track.sub)}</div>
        </div>
        ${ring({ value: progress, size: 50, stroke: 5 })}
      </div>
      <div class="small muted" style="margin-top:12px;line-height:1.6">${esc(track.intro)}</div>
      <button class="btn primary block lg" style="margin-top:14px" data-nav="#/courses/lesson/${next.id}">
        ${icon(progress ? 'play' : 'rocket')}${progress ? '继续：' : '开始第 1 课：'}${esc(next.title)}
      </button>
    </div>
  </section>
  ${track.levels.map((lv) => {
    const ls = lessonsByLevel(track.id, lv.n);
    const lvDone = ls.filter((l) => lessonRecord(l.id)).length;
    return `<section class="section">
      <div class="section__head">
        <h2 class="section__title">第 ${lv.n} 级 · ${esc(lv.name)}</h2>
        <span class="section__more">${lvDone}/${ls.length}${lvDone === ls.length ? icon('check') : ''}</span>
      </div>
      <div class="tiny muted" style="margin:-4px 2px 10px">${esc(lv.en)} · ${esc(lv.goal)}</div>
      <div class="path">
        <div class="path__line"></div>
        ${ls.map((l) => {
          const rec = lessonRecord(l.id);
          const cls = rec ? 'done' : l.id === next.id ? 'today' : '';
          return `<button class="path__node ${cls}" data-nav="#/courses/lesson/${l.id}">
            <span class="path__bubble">${rec ? icon('check') : l.no}</span>
            <span class="path__meta">
              <span class="path__title" style="display:block">第 ${l.no} 课 · ${esc(l.title)}</span>
              <span class="path__sub" style="display:block">${esc(l.titleEn)} · ${l.minutes} 分钟</span>
              <span class="row" style="gap:6px;margin-top:5px">
                ${rec ? `<span class="tag ${track.tone}">${starMini(rec.stars)}</span>` : `<span class="tag">未开始</span>`}
              </span>
            </span>
          </button>`;
        }).join('')}
      </div>
    </section>`;
  }).join('')}
  <section class="section">
    <div class="banner">${icon('lightbulb')}<div>${esc(track.promise)}</div></div>
  </section>`;
};

export const mountTrack = () => {};

/* ---------- 单课会话状态 ---------- */
let sess = null;

const buildSteps = (lesson) => [
  { kind: 'intro' },
  ...lesson.teach.map((_, i) => ({ kind: 'teach', i })),
  { kind: 'terms' },
  { kind: 'sentences' },
  ...lesson.quiz.map((_, i) => ({ kind: 'quiz', i })),
  { kind: 'talk' },
  { kind: 'done' },
];

export const prepareLesson = (id) => {
  const lesson = lessonById(id);
  if (!lesson) return;
  if (!sess || sess.id !== id) {
    sess = { id, step: 0, correct: 0, answered: false, picked: null, finished: false, stars: 0, xp: 0 };
  }
  sess.steps = buildSteps(lesson);
};

export const getSession = () => sess;

const stepBar = () => {
  const total = sess.steps.length;
  return `
  <div class="row" style="gap:10px;margin:2px 0 10px">
    <button class="iconbtn sm plain" data-exit aria-label="退出课程">${icon('x')}</button>
    <div style="flex:1">${bar(clamp(sess.step / Math.max(1, total - 1), 0.02, 1))}</div>
    <span class="tiny muted mono">${Math.min(sess.step + 1, total)}/${total}</span>
  </div>`;
};

const introStep = (lesson) => `
  <section class="section" style="margin-top:0">
    <div class="card">
      <span class="tag ${toneOf(lesson.track)}">${esc(trackName(lesson.track))} · 第 ${lesson.level} 级</span>
      <h1 class="title1 balance" style="margin-top:10px">${esc(lesson.title)}</h1>
      <div class="tiny muted" style="margin-top:4px">${esc(lesson.titleEn)} · 约 ${lesson.minutes} 分钟</div>
      <div class="small" style="margin-top:12px;line-height:1.7"><b>学完你能做到：</b>${esc(lesson.goal)}</div>
    </div>
  </section>
  <section class="section">
    <div class="list">
      ${lesson.points.map((p) => `<div class="list__row" style="min-height:46px">
        <span class="list__ico g" style="width:28px;height:28px;background:var(--green-soft);color:var(--green)">${icon('check')}</span>
        <span class="small" style="flex:1">${esc(p)}</span>
      </div>`).join('')}
    </div>
  </section>
  <section class="section">
    <button class="btn primary block lg" data-next>${icon('play')}开始这节课</button>
    <div class="tiny muted center" style="margin-top:8px">讲解 → 术语 → 句型 → 测验 → 讲解任务</div>
  </section>`;

const teachStep = (lesson, i) => {
  const card = lesson.teach[i];
  const last = i + 1 >= lesson.teach.length;
  return `
  <section class="section" style="margin-top:0">
    <div class="card">
      <div class="row tiny muted"><span>知识讲解</span><span class="spacer"></span><span>${i + 1} / ${lesson.teach.length}</span></div>
      <h2 class="section__title" style="margin-top:10px;font-size:19px;line-height:1.35">${esc(card.h)}</h2>
      <p class="small" style="margin-top:12px;line-height:1.8">${esc(card.zh)}</p>
    </div>
  </section>
  <section class="section">
    <button class="btn primary block lg" data-next>${last ? '记住了，看术语' : '继续'}</button>
    ${i > 0 ? `<button class="btn ghost block" style="margin-top:8px" data-back">${icon('chevron-left')}上一张</button>` : ''}
  </section>`;
};

const termsStep = (lesson) => `
  <section class="section" style="margin-top:0">
    <div class="banner p">${icon('spell-check')}<div>点英文可以查词，点喇叭听真人发音，点麦克风跟读一句。</div></div>
  </section>
  <section class="section">
    <div class="list">
      ${lesson.terms.map((t) => `<div class="list__row" data-word="${esc(t.en)}">
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block">${esc(t.en)}</span>
          <span class="list__sub" style="display:block">${esc(t.zh)}${t.note ? ' · ' + esc(t.note) : ''}</span>
        </span>
        <button class="iconbtn sm" data-say="${esc(t.en)}" aria-label="朗读">${icon('volume-2')}</button>
        <button class="iconbtn sm" data-shadow="${esc(t.en)}" aria-label="跟读">${icon('mic')}</button>
      </div>`).join('')}
    </div>
  </section>
  <section class="section">
    <button class="btn primary block lg" data-next>${icon('arrow-right')}术语记住了，练句型</button>
  </section>`;

const sentencesStep = (lesson) => `
  <section class="section" style="margin-top:0">
    <div class="banner">${icon('text-quote')}<div>这些句子都是可以直接对客户说的。先听，再跟读，读到自己满意为止。</div></div>
  </section>
  <section class="section">
    <div class="list">
      ${lesson.sentences.map((s, i) => `<div class="list__row" style="align-items:flex-start;flex-direction:column;gap:6px">
        <div class="row" style="width:100%;align-items:flex-start">
          <span class="small" style="flex:1;min-width:0;line-height:1.5">${renderSentence(s.en)}</span>
          <button class="iconbtn sm" data-say="${esc(s.en)}" aria-label="朗读">${icon('volume-2')}</button>
        </div>
        <div class="tiny muted" style="line-height:1.5">${esc(s.zh)}</div>
        <div class="row" style="gap:8px">
          <button class="btn xs soft" data-shadow="${esc(s.en)}">${icon('mic')}跟读打分</button>
          <button class="btn xs ghost" data-slow="${esc(s.en)}">${icon('volume-1')}慢速</button>
        </div>
        ${i === 0 ? '' : ''}
      </div>`).join('')}
    </div>
  </section>
  <section class="section">
    <button class="btn primary block lg" data-next>${icon('list-checks')}我读完了，开始测验</button>
  </section>`;

const quizStep = (lesson, i) => {
  const q = lesson.quiz[i];
  const answered = sess.answered;
  const optCls = (j) => {
    if (!answered) return '';
    if (j === q.a) return 'ok';
    return sess.picked === j ? 'no' : 'dim';
  };
  return `
  <section class="section" style="margin-top:0">
    <div class="row tiny muted"><span>知识测验</span><span class="spacer"></span><span>${i + 1} / ${lesson.quiz.length}</span></div>
    <div class="card" style="margin-top:10px">
      <div class="small" style="font-weight:650;line-height:1.6">${esc(q.q)}</div>
    </div>
    <div style="margin-top:12px">
      ${q.opts.map((o, j) => `<button class="opt ${optCls(j)}" data-opt="${j}" ${answered ? 'disabled' : ''}>
        <span class="opt__key">${'ABCD'[j]}</span><span style="flex:1">${esc(o)}</span>
        ${answered && j === q.a ? icon('check') : ''}
      </button>`).join('')}
    </div>
    ${answered ? '' : '<div class="tiny muted center" style="margin-top:14px">答错不扣分，选完会看到解释</div>'}
  </section>`;
};

const talkStep = (lesson) => `
  <section class="section" style="margin-top:0">
    <div class="card">
      <span class="tag v">英文讲解任务</span>
      <div class="small" style="margin-top:10px;line-height:1.7">${esc(lesson.talk.brief)}</div>
      <ol class="tiny muted" style="margin:10px 0 0;padding-left:20px;line-height:1.8">
        ${lesson.talk.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}
      </ol>
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">参考说法（先自己说，再对照）</h2></div>
    <div class="list">
      ${lesson.talk.sample.map((s) => `<div class="list__row" style="align-items:flex-start;flex-direction:column;gap:6px">
        <div class="row" style="width:100%;align-items:flex-start">
          <span class="small" style="flex:1;min-width:0;line-height:1.5">${renderSentence(s.en)}</span>
          <button class="iconbtn sm" data-say="${esc(s.en)}" aria-label="朗读">${icon('volume-2')}</button>
        </div>
        <div class="tiny muted" style="line-height:1.5">${esc(s.zh)}</div>
        <button class="btn xs soft" data-shadow="${esc(s.en)}">${icon('mic')}跟读这句</button>
      </div>`).join('')}
    </div>
  </section>
  <section class="section">
    <button class="btn primary block lg" data-finish>${icon('presentation')}我说完了，完成这节课</button>
    <div class="tiny muted center" style="margin-top:8px">费曼技巧：能讲出来，才算真的学会。</div>
  </section>`;

const doneStep = (lesson) => {
  const totalQ = lesson.quiz.length;
  const next = lessonAfter(lesson.id);
  return `
  <section class="section" style="margin-top:6px;text-align:center">
    <div style="display:grid;justify-items:center">${mascot({ size: 96, mood: 'happy' })}</div>
    <h1 class="title1" style="margin-top:12px">这节课完成了</h1>
    <div class="small muted" style="margin-top:6px">${esc(lesson.title)} · ${esc(lesson.titleEn)}</div>
    <div style="display:grid;justify-items:center;margin-top:12px">${starsRow(sess.stars)}</div>
  </section>
  <section class="section">
    <div class="grid c3">
      <div class="stat"><div class="stat__v">${sess.correct}/${totalQ}</div><div class="stat__k">测验正确</div></div>
      <div class="stat"><div class="stat__v">+${sess.xp}</div><div class="stat__k">经验值</div></div>
      <div class="stat"><div class="stat__v">${courseDoneCount(lesson.track + '-')}/18</div><div class="stat__k">${esc(trackName(lesson.track))}</div></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row" style="gap:9px;align-items:flex-start">
        ${icon('brain', 'chev')}
        <div style="flex:1">
          <div class="small" style="font-weight:650">下一步建议</div>
          <div class="tiny muted" style="margin-top:4px">${sess.stars >= 3 ? '满分通过。明天用"跟读训练"复述这节课的句子，记得更牢。' : '建议重做一遍测验，把错题的解释再读一次，理解比次数重要。'}</div>
        </div>
      </div>
    </div>
  </section>
  <section class="section">
    ${next ? `<button class="btn primary block lg" data-nav="#/courses/lesson/${next.id}" data-next-lesson>${icon('arrow-right')}下一课：${esc(next.title)}</button>` : ''}
    <button class="btn ghost block" style="margin-top:8px" data-nav="#/courses/${lesson.track}">${icon('route')}返回课程路径</button>
    <button class="btn ghost block" style="margin-top:8px" data-nav="#/courses">${icon('house')}课程首页</button>
  </section>`;
};

export const renderLesson = (id) => {
  const lesson = lessonById(id);
  if (!lesson) return `<div class="empty">${icon('triangle-alert')}<h4>找不到这节课</h4></div>`;
  prepareLesson(id);
  const step = sess.steps[Math.min(sess.step, sess.steps.length - 1)];
  let body = '';
  if (step.kind === 'intro') body = introStep(lesson);
  else if (step.kind === 'teach') body = teachStep(lesson, step.i);
  else if (step.kind === 'terms') body = termsStep(lesson);
  else if (step.kind === 'sentences') body = sentencesStep(lesson);
  else if (step.kind === 'quiz') body = quizStep(lesson, step.i);
  else if (step.kind === 'talk') body = talkStep(lesson);
  else body = doneStep(lesson);
  return `${step.kind === 'done' ? '' : stepBar()}${body}`;
};

/* ---------- 交互 ---------- */
const finishLesson = (lesson, node) => {
  const totalQ = lesson.quiz.length;
  const stars = sess.correct >= totalQ ? 3 : sess.correct >= totalQ - 1 ? 2 : 1;
  const firstTime = !lessonRecord(lesson.id);
  const xp = 20 + sess.correct * 5 + (firstTime ? 10 : 0);
  sess.stars = Math.max(sess.stars, stars);
  sess.xp = xp;
  if (!sess.finished) {
    sess.finished = true;
    markLessonDone(lesson.id, stars, totalQ ? sess.correct / totalQ : 1);
    addXP(xp, 'course');
    markTask('pro');
    touchDay();
  }
  sess.step = sess.steps.length - 1;
  celebrate(node);
  toast(`课程完成 +${xp} XP`, 'graduation-cap');
};

export const mountLesson = (root, ctx) => {
  const lesson = lessonById(sess?.id);
  if (!lesson) return;
  const next = () => { sess.step = Math.min(sess.step + 1, sess.steps.length - 1); ctx.rerender(); window.scrollTo({ top: 0 }); };
  const back = () => { sess.step = Math.max(sess.step - 1, 0); ctx.rerender(); window.scrollTo({ top: 0 }); };

  root.querySelector('[data-exit]')?.addEventListener('click', () => { ctx.nav(`#/courses/${lesson.track}`); });
  root.querySelectorAll('[data-next]').forEach((b) => { b.onclick = next; });
  root.querySelectorAll('[data-back]').forEach((b) => { b.onclick = back; });

  root.querySelectorAll('[data-say]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); say(b.dataset.say); };
  });
  root.querySelectorAll('[data-slow]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); say(b.dataset.slow, { rate: 0.72 }); };
  });
  root.querySelectorAll('[data-shadow]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); openShadow(b.dataset.shadow, '', () => { markTask('pro'); }); };
  });
  root.querySelectorAll('[data-word]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); openWordSheet(b.dataset.word); };
  });

  root.querySelectorAll('[data-opt]').forEach((b) => {
    b.onclick = () => {
      if (sess.answered) return;
      const step = sess.steps[sess.step];
      const q = lesson.quiz[step.i];
      const picked = Number(b.dataset.opt);
      const ok = picked === q.a;
      sess.answered = true;
      sess.picked = picked;
      if (ok) sess.correct += 1;
      recordAnswer(ok);
      ctx.rerender();
      openFeedback({
        ok,
        title: ok ? '答对了' : '再理解一次',
        body: esc(q.why),
        action: step.i + 1 >= lesson.quiz.length ? '进入讲解任务' : '下一题',
        onAction: () => { sess.answered = false; sess.picked = null; next(); },
      });
    };
  });

  root.querySelectorAll('[data-finish]').forEach((b) => {
    b.onclick = () => { finishLesson(lesson, b); ctx.rerender(); window.scrollTo({ top: 0 }); };
  });
};
