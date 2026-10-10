/* 专业板块：暖通空调（HVAC）与楼宇自控（BAS） */
import { $, icon, bar, ring, sheet, toast, celebrate } from '../core/ui.js';
import { esc, pct } from '../core/util.js';
import { getState, addXP, markTask, touchDay, bumpProgress, deckStats, dueList, toggleStar } from '../core/store.js';
import {
  CONCEPTS, PRODUCTS, TALKS, FAQ, ACRONYMS, PRO_NOTE,
  WORDS_BY_DECK, DIALOGUES, dialoguesByCat, proSentences,
} from '../data/index.js';
import { speak } from '../core/speech.js';
import { renderSentence, openWordSheet } from '../core/tap.js';
import { openShadow } from './speak.js';

const say = (t, o = {}) => speak(t, { rate: getState().settings.rate, accent: getState().settings.accent, voiceURI: getState().settings.voiceURI, ...o });

const AREAS = {
  hvac: { id: 'hvac', name: '暖通空调', en: 'HVAC', ico: 'wind', tone: 'g', sub: '制冷循环 · 主机与末端 · 能效与改造' },
  bas: { id: 'bas', name: '楼宇自控', en: 'BAS', ico: 'cpu', tone: 'v', sub: '系统架构 · 协议集成 · 控制与节能' },
};

export const renderPro = () => {
  const s = getState();
  return `
  <section class="section" style="margin-top:4px">
    <div class="today-head" style="background:linear-gradient(178deg,var(--cat-bas-soft) 0%,var(--surface) 62%)">
      <div class="today-head__eyebrow" style="color:var(--cat-bas)">专业英语 · 面向客户沟通</div>
      <div class="today-head__title balance" style="font-size:var(--fs-title1)">暖通空调与楼宇自控</div>
      <div class="today-head__sub pretty">从基础概念到能对外讲解。先能讲清楚，再谈流利。</div>
      <div class="today-head__row">
        <div class="today-head__stats">
          <div class="today-stat">
            <div class="today-stat__v">${(WORDS_BY_DECK.hvac || []).length + (WORDS_BY_DECK.bas || []).length}</div>
            <div class="today-stat__k">专业术语</div>
          </div>
          <div class="today-stat">
            <div class="today-stat__v">${CONCEPTS.length}</div>
            <div class="today-stat__k">原理卡</div>
          </div>
          <div class="today-stat">
            <div class="today-stat__v">${TALKS.length}</div>
            <div class="today-stat__k">讲解话术</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="grid c2">
      ${Object.values(AREAS).map((a) => {
        const pool = WORDS_BY_DECK[a.id] || [];
        const st = deckStats(pool);
        return `<button class="card press" data-nav="#/pro/${a.id}" style="text-align:left">
          <span class="stat__ico" style="background:var(--${a.tone === 'g' ? 'green' : 'violet'}-50);color:var(--${a.tone === 'g' ? 'green' : 'violet'})">${icon(a.ico)}</span>
          <div class="small" style="font-weight:700">${esc(a.name)}</div>
          <div class="tiny muted" style="margin-top:3px;line-height:1.4">${esc(a.sub)}</div>
          <div style="margin-top:10px">${bar(st.learned / Math.max(1, st.total), a.tone === 'g' ? '' : 'violet')}</div>
          <div class="tiny muted" style="margin-top:6px">${st.learned}/${st.total} 术语已掌握</div>
        </button>`;
      }).join('')}
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">业务能力训练</h2></div>
    <div class="list">
      <button class="list__row" data-nav="#/pro/talks">
        <span class="list__ico b">${icon('presentation')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">讲解话术库</span>
        <span class="list__sub" style="display:block">${TALKS.length} 套实战话术：电梯陈述、异议处理、ROI 汇报</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/pro/faq">
        <span class="list__ico a">${icon('circle-question-mark')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">客户问答</span>
        <span class="list__sub" style="display:block">${FAQ.length} 个常见问题与标准答法</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/pro/products">
        <span class="list__ico p">${icon('boxes')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">品牌与产品线</span>
        <span class="list__sub" style="display:block">${PRODUCTS.length} 张卡片，含一句话英文介绍</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/pro/acronyms">
        <span class="list__ico v">${icon('spell-check')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">缩略语速查</span>
        <span class="list__sub" style="display:block">${ACRONYMS.length} 个行业缩写 · 英文全称 · 中文</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">本周专业对话</h2></div>
    <div class="list">
      ${[DIALOGUES.find((d) => d.cat === 'hvac'), DIALOGUES.find((d) => d.cat === 'bas')].filter(Boolean).map((d) => `
        <button class="list__row" data-nav="#/speak/${d.id}">
          <span class="list__ico ${d.cat === 'hvac' ? 'g' : 'v'}">${icon(d.cat === 'hvac' ? 'wind' : 'cpu')}</span>
          <span style="flex:1"><span class="list__title" style="display:block">${esc(d.title)}</span>
          <span class="list__sub" style="display:block">${esc(d.scene)} · ${d.lines.length} 句</span></span>
          ${icon('chevron-right', 'chev')}
        </button>`).join('')}
    </div>
    <div class="banner" style="margin-top:12px">${icon('triangle-alert')}<div>${esc(PRO_NOTE)}</div></div>
  </section>
  `;
};

let termFilter = '';

export const renderArea = (area, tab = 'terms') => {
  const a = AREAS[area] || AREAS.hvac;
  const pool = (WORDS_BY_DECK[area] || []).filter((w) =>
    !termFilter || w.en.toLowerCase().includes(termFilter) || w.zh.includes(termFilter));
  const concepts = CONCEPTS.filter((c) => c.area === area);
  const dialogs = dialoguesByCat(area);
  const st = deckStats(WORDS_BY_DECK[area] || []);

  const body = () => {
    if (tab === 'terms') {
      return `
      <div class="row" style="gap:8px;margin-bottom:10px">
        <input id="term-filter" class="card" value="${esc(termFilter)}" placeholder="搜索术语（中英文）"
          style="flex:1;border:1px solid var(--line);box-shadow:none;height:42px;padding:0 12px;font-size:15px">
        <button class="btn sm soft" data-nav="#/words/review/${area}">${icon('play')}复习</button>
      </div>
      <div class="list" id="term-list">
        ${pool.map((w) => `<div class="list__row" data-word="${esc(w.en)}">
          <span style="flex:1;min-width:0">
            <span class="list__title" style="display:block">${esc(w.en)} <span class="tiny muted mono" style="font-weight:400">${esc(w.ipa)}</span></span>
            <span class="list__sub" style="display:block">${esc(w.zh)}</span>
            <span class="tiny muted" style="display:block;margin-top:3px">${renderSentence(w.ex)}</span>
          </span>
          <button class="iconbtn sm plain" data-say="${esc(w.en)}">${icon('volume-2')}</button>
        </div>`).join('') || '<div class="empty">没有匹配的术语</div>'}
      </div>`;
    }
    if (tab === 'concepts') {
      return `<div class="list">${concepts.map((c) => `
        <button class="list__row" data-nav="#/pro/concept/${c.id}" style="align-items:flex-start">
          <span class="list__ico ${area === 'hvac' ? 'g' : 'v'}">${icon('lightbulb')}</span>
          <span style="flex:1;min-width:0">
            <span class="list__title" style="display:block;font-size:15.5px">${esc(c.title)}</span>
            <span class="list__sub" style="display:block">${esc(c.titleEn)}</span>
            <span class="tiny muted" style="display:block;margin-top:4px">${esc(c.zh.slice(0, 46))}…</span>
          </span>
          ${icon('chevron-right', 'chev')}
        </button>`).join('')}</div>`;
    }
    if (tab === 'talk') {
      return `<div class="list">${TALKS.map((t) => `
        <button class="list__row" data-nav="#/pro/talk/${t.id}">
          <span class="list__ico b">${icon('presentation')}</span>
          <span style="flex:1"><span class="list__title" style="display:block;font-size:15.5px">${esc(t.title)}</span>
          <span class="list__sub" style="display:block">${esc(t.titleEn)} · ${t.script.length} 句</span></span>
          ${icon('chevron-right', 'chev')}
        </button>`).join('')}</div>`;
    }
    return `<div class="list">${dialogs.map((d) => `
      <button class="list__row" data-nav="#/speak/${d.id}">
        <span class="list__ico ${area === 'hvac' ? 'g' : 'v'}">${icon(a.ico)}</span>
        <span style="flex:1"><span class="list__title" style="display:block;font-size:15.5px">${esc(d.title)}</span>
        <span class="list__sub" style="display:block">${esc(d.titleEn)} · ${d.lines.length} 句</span></span>
        ${icon('chevron-right', 'chev')}
      </button>`).join('')}</div>`;
  };

  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <div class="row">
        <span class="list__ico ${a.tone}" style="width:44px;height:44px">${icon(a.ico)}</span>
        <div style="flex:1">
          <div class="small" style="font-weight:700">${esc(a.name)} · ${esc(a.en)}</div>
          <div class="tiny muted">${esc(a.sub)}</div>
        </div>
        ${ring({ value: st.learned / Math.max(1, st.total), size: 48, stroke: 5 })}
      </div>
      <div class="seg" style="margin-top:12px">
        ${[['terms', '术语'], ['concepts', '原理'], ['dialogues', '对话'], ['talk', '演练']].map(([id, label]) =>
          `<button class="seg__item ${tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}
      </div>
    </div>
  </section>
  <section class="section">${body()}</section>`;
};

export const renderConcept = (id) => {
  const c = CONCEPTS.find((x) => x.id === id);
  if (!c) return `<div class="empty">${icon('triangle-alert')}<h4>找不到这张卡</h4></div>`;
  const area = c.area === 'hvac' ? '暖通空调' : '楼宇自控';
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <span class="tag ${c.area === 'hvac' ? 'g' : 'v'}">${esc(area)}</span>
      <h2 class="section__title" style="margin-top:8px;font-size:20px">${esc(c.title)}</h2>
      <div class="tiny muted">${esc(c.titleEn)}</div>
      <p class="small" style="margin-top:12px;line-height:1.7">${esc(c.zh)}</p>
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">用英语这样说</h2></div>
    <div class="list">
      ${c.en.map((en) => `<div class="list__row" style="align-items:flex-start">
        <span style="flex:1" class="small">${renderSentence(en)}</span>
        <button class="iconbtn sm" data-say="${esc(en)}">${icon('volume-2')}</button>
        <button class="iconbtn sm" data-shadow="${esc(en)}">${icon('mic')}</button>
      </div>`).join('')}
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">关键术语</h2></div>
    <div class="card"><div class="row wrap" style="gap:8px">
      ${c.keys.map((k) => `<button class="chip" data-word="${esc(k)}">${icon('search')}${esc(k)}</button>`).join('')}
    </div></div>
  </section>
  <section class="section">
    <button class="btn primary block lg" data-practice="${esc(c.id)}">${icon('mic')}用英文讲这一段（录音自评）</button>
    <div class="tiny muted center" style="margin-top:8px">费曼技巧：能讲出来，才算真的学会。</div>
  </section>`;
};

export const renderTalk = (id) => {
  const t = TALKS.find((x) => x.id === id);
  if (!t) return `<div class="empty">${icon('triangle-alert')}<h4>找不到这套话术</h4></div>`;
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <span class="tag b">讲解话术</span>
      <h2 class="section__title" style="margin-top:8px;font-size:20px">${esc(t.title)}</h2>
      <div class="tiny muted">${esc(t.titleEn)}</div>
      <p class="small muted" style="margin-top:10px;line-height:1.6">${esc(t.zh)}</p>
      <button class="btn sm soft" style="margin-top:12px" data-play-all>${icon('play')}连续播放</button>
    </div>
  </section>
  <section class="section">
    <div class="list">
      ${t.script.map(([en, zh], i) => `<div class="list__row" style="align-items:flex-start">
        <span class="list__ico b" style="font-size:12px;font-weight:700">${i + 1}</span>
        <span style="flex:1;min-width:0">
          <span class="small" style="display:block;line-height:1.5">${renderSentence(en)}</span>
          <span class="tiny muted" style="display:block;margin-top:4px">${esc(zh)}</span>
        </span>
        <button class="iconbtn sm" data-say="${esc(en)}">${icon('volume-2')}</button>
        <button class="iconbtn sm" data-shadow="${esc(en)}">${icon('mic')}</button>
      </div>`).join('')}
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">关键词</h2></div>
    <div class="card"><div class="row wrap" style="gap:8px">
      ${t.keys.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}
    </div></div>
  </section>
  <section class="section">
    <button class="btn primary block lg" data-practice="${esc(t.id)}">${icon('presentation')}完成这次讲解演练</button>
  </section>`;
};

export const renderFaq = () => `
  <section class="section" style="margin-top:4px">
    <div class="banner p">${icon('circle-question-mark')}<div>客户提问时，先重复问题确认理解，再用"结论 → 依据 → 下一步"回答。点英文句子可以点读。</div></div>
  </section>
  <section class="section">
    <div class="list">
      ${FAQ.map((f, i) => `<div class="list__row" style="align-items:flex-start;flex-direction:column;gap:8px" data-faq="${i}">
        <div class="row" style="width:100%;align-items:flex-start">
          <span class="list__ico a">${icon('message-circle')}</span>
          <span style="flex:1;min-width:0">
            <span class="list__title" style="display:block;font-size:15.5px;line-height:1.45">${renderSentence(f.q)}</span>
          </span>
          <button class="iconbtn sm" data-say="${esc(f.q)}">${icon('volume-2')}</button>
        </div>
        <div style="padding-left:46px;width:100%">
          <div class="tiny muted" style="line-height:1.6">${esc(f.a)}</div>
          <div class="card flat" style="margin-top:8px;box-shadow:none;background:var(--surface-2)">
            <div class="small" style="line-height:1.5">${renderSentence(f.en)}</div>
            <div class="row" style="gap:8px;margin-top:8px">
              <button class="btn xs soft" data-say="${esc(f.en)}">${icon('volume-2')}读一遍</button>
              <button class="btn xs ghost" data-shadow="${esc(f.en)}">${icon('mic')}跟读</button>
            </div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </section>`;

export const renderProducts = () => `
  <section class="section" style="margin-top:4px">
    <div class="banner">${icon('triangle-alert')}<div>${esc(PRO_NOTE)}</div></div>
  </section>
  <section class="section">
    <div class="list">
      ${PRODUCTS.map((p) => `<button class="list__row" data-nav="#/pro/product/${p.id}" style="align-items:flex-start">
        <span class="list__ico p">${icon('boxes')}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block;font-size:15.5px">${esc(p.name)}</span>
          <span class="list__sub" style="display:block">${esc(p.brand)} · ${esc(p.en)}</span>
        </span>
        ${icon('chevron-right', 'chev')}
      </button>`).join('')}
    </div>
  </section>`;

export const renderProduct = (id) => {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return `<div class="empty">${icon('triangle-alert')}<h4>找不到这张卡片</h4></div>`;
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <span class="tag p">${esc(p.brand)}</span>
      <h2 class="section__title" style="margin-top:8px;font-size:20px">${esc(p.name)}</h2>
      <div class="tiny muted">${esc(p.en)}</div>
      <p class="small" style="margin-top:12px;line-height:1.7">${esc(p.zh)}</p>
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">一句话英文介绍</h2></div>
    <div class="card">
      <div class="small" style="line-height:1.5">${renderSentence(p.pitch)}</div>
      <div class="row" style="gap:8px;margin-top:12px">
        <button class="btn sm soft" data-say="${esc(p.pitch)}">${icon('volume-2')}朗读</button>
        <button class="btn sm ghost" data-shadow="${esc(p.pitch)}">${icon('mic')}跟读练习</button>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section__head"><h2 class="section__title sm">讲解关键词</h2></div>
    <div class="card"><div class="row wrap" style="gap:8px">
      ${p.key.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}
    </div></div>
  </section>`;
};

let acroQuery = '';
export const renderAcronyms = () => {
  const q = acroQuery.toLowerCase();
  const list = ACRONYMS.filter(([a, full, zh]) =>
    !q || a.toLowerCase().includes(q) || full.toLowerCase().includes(q) || zh.includes(acroQuery));
  return `
  <section class="section" style="margin-top:4px">
    <input id="acro-filter" class="card" value="${esc(acroQuery)}" placeholder="搜索缩写或中文，如 AHU / 空气"
      style="width:100%;border:1px solid var(--line);box-shadow:none;height:44px;padding:0 12px;font-size:15px">
  </section>
  <section class="section">
    <div class="list" id="acro-list">
      ${list.map(([a, full, zh]) => `<div class="list__row">
        <span class="list__ico v" style="font-size:11px;font-weight:800">${esc(a.slice(0, 4))}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block">${esc(a)}</span>
          <span class="list__sub" style="display:block">${esc(full)}</span>
          <span class="tiny" style="display:block;color:var(--primary);margin-top:2px">${esc(zh)}</span>
        </span>
        <button class="iconbtn sm" data-say="${esc(full)}">${icon('volume-2')}</button>
      </div>`).join('') || '<div class="empty">没有匹配项</div>'}
    </div>
  </section>`;
};

export const mountPro = (root, ctx) => {
  root.querySelectorAll('[data-say]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); say(b.dataset.say); });
  root.querySelectorAll('[data-word]').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    openWordSheet(b.dataset.word);
  });
  root.querySelectorAll('[data-shadow]').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    openShadow(b.dataset.shadow, '', () => markTask('pro'));
  });
  root.querySelectorAll('[data-tab]').forEach((b) => {
    b.onclick = () => ctx.nav(`${location.hash.split('/').slice(0, 3).join('/')}/${b.dataset.tab}`, { reload: true });
  });
  const tf = root.querySelector('#term-filter');
  if (tf) {
    tf.oninput = () => {
      termFilter = tf.value.trim().toLowerCase();
      const list = root.querySelector('#term-list');
      [...(list?.children || [])].forEach((row) => {
        const txt = row.textContent.toLowerCase();
        row.classList.toggle('hide', termFilter && !txt.includes(termFilter));
      });
    };
  }
  const af = root.querySelector('#acro-filter');
  if (af) af.oninput = () => { acroQuery = af.value.trim(); ctx.rerender(); };
  const playAll = root.querySelector('[data-play-all]');
  if (playAll) {
    const id = location.hash.split('/')[3];
    const t = TALKS.find((x) => x.id === id);
    playAll.onclick = async () => {
      playAll.disabled = true;
      for (const [en] of t.script) { await say(en); await new Promise((r) => setTimeout(r, 260)); }
      playAll.disabled = false;
    };
  }
  root.querySelectorAll('[data-practice]').forEach((b) => {
    b.onclick = () => {
      addXP(20, 'pro-talk');
      bumpProgress({ talks: (getState().progress?.talks || 0) + 1 });
      markTask('pro');
      touchDay();
      celebrate(b);
      toast('讲解演练完成 +20 XP', 'presentation');
      ctx.rerender();
    };
  });
};
