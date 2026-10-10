/* English Coach — tiny DOM layer + components */
import { ICON_PATHS } from '../icons.js';
import { esc, haptic } from './util.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const icon = (name, cls = '') => {
  const p = ICON_PATHS[name] || ICON_PATHS['circle-dot'];
  const c = cls ? ` class="${cls}"` : '';
  return `<svg${c} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
};

export const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

export const on = (node, ev, sel, fn) => {
  node.addEventListener(ev, (e) => {
    const t = e.target.closest(sel);
    if (t && node.contains(t)) fn(e, t);
  });
};

export const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;

/* ---------- toast ---------- */
let toastTimer = null;
export const toast = (msg, ico = null, ms = 2000) => {
  const root = $('#toast-root');
  if (!root) return;
  const node = el(`<div class="toast">${ico ? icon(ico) : ''}<span>${esc(msg)}</span></div>`);
  root.appendChild(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 240);
  }, ms);
  while (root.children.length > 3) root.firstElementChild.remove();
};

/* ---------- bottom sheet ---------- */
let openSheets = 0;
export const sheet = ({ title, body, actions = '', onMount, dismissible = true }) => {
  const root = $('#sheet-root');
  const wrap = el(`<div>
    <div class="sheet-backdrop"></div>
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet__grip"></div>
      <div class="sheet__head">
        <div class="sheet__title">${title || ''}</div>
        ${actions}
        ${dismissible ? `<button class="iconbtn sm plain" data-sheet-close aria-label="关闭">${icon('x')}</button>` : ''}
      </div>
      <div class="sheet__body">${body || ''}</div>
    </div>
  </div>`);
  const back = $('.sheet-backdrop', wrap);
  const panel = $('.sheet', wrap);
  root.appendChild(wrap);
  document.body.classList.add('sheet-open');
  openSheets++;
  requestAnimationFrame(() => {
    back.classList.add('show');
    panel.classList.add('show');
  });
  const close = () => {
    back.classList.remove('show');
    panel.classList.remove('show');
    openSheets--;
    if (openSheets <= 0) document.body.classList.remove('sheet-open');
    setTimeout(() => wrap.remove(), 300);
    document.removeEventListener('keydown', esc0);
  };
  const esc0 = (e) => { if (e.key === 'Escape' && dismissible) close(); };
  document.addEventListener('keydown', esc0);
  if (dismissible) back.addEventListener('click', close);
  on(wrap, 'click', '[data-sheet-close]', close);
  onMount?.(panel, close);
  return { panel, close };
};

export const confirmSheet = ({ title, text, okText = '确定', cancelText = '取消', danger = false }) =>
  new Promise((resolve) => {
    let done = false;
    const s = sheet({
      title,
      body: `<p class="small muted" style="margin-bottom:18px">${esc(text)}</p>
        <button class="btn block ${danger ? 'coral' : 'primary'}" data-ok>${esc(okText)}</button>
        <button class="btn block ghost" style="margin-top:8px" data-sheet-close>${esc(cancelText)}</button>`,
      onMount(panel, close) {
        on(panel, 'click', '[data-ok]', () => { done = true; resolve(true); close(); });
        const b = $('.sheet-backdrop', panel.parentElement);
        b?.addEventListener('click', () => { if (!done) resolve(false); });
      },
    });
    const back = $('.sheet-backdrop', s.panel.parentElement);
    back?.addEventListener('click', () => { if (!done) resolve(false); });
  });

/* ---------- small builders ---------- */
export const ring = ({ value, size = 56, stroke = 6, color = 'var(--primary)', track = 'var(--surface-2)', label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${track}" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}"
        style="transition:stroke-dashoffset .45s cubic-bezier(.22,1,.36,1)"/>
    </svg>
    <b>${label ?? Math.round(v * 100) + '%'}</b>
  </div>`;
};

export const bar = (value, tone = '') =>
  `<div class="bar ${tone}"><i style="width:${Math.round(Math.max(0, Math.min(1, value)) * 100)}%"></i></div>`;

export const chip = ({ label, on, tone = '', icon: ic = null, data }) =>
  `<button class="chip ${tone ? 'tone-' + tone + ' ' : ''}${on ? 'on' : ''}" ${data || ''}>${ic ? icon(ic) : ''}${esc(label)}</button>`;

export const section = (title, body, more = '') =>
  `<section class="section">
    <div class="section__head"><h2 class="section__title">${esc(title)}</h2>${more}</div>
    ${body}
  </section>`;

export const row = ({ iconName, tone = '', title, sub = '', right = '', data = '', chevron = true }) =>
  `<button class="list__row" ${data}>
    <span class="list__ico ${tone}">${icon(iconName)}</span>
    <span style="flex:1;min-width:0">
      <span class="list__title" style="display:block">${title}</span>
      ${sub ? `<span class="list__sub" style="display:block">${sub}</span>` : ''}
    </span>
    ${right}
    ${chevron ? icon('chevron-right', 'chev') : ''}
  </button>`;

/* ---------- springy press feedback for buttons ---------- */
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.btn, .opt, .tile, .iconbtn, .list__row, .card.press')) haptic(6);
}, { passive: true });

/* ---------- confetti / particles ---------- */
const cvs = () => document.getElementById('fx');
let fxRunning = false;
export const burst = (x, y, { count = 42, colors = ['#0E7C66', '#E8981E', '#2E6FE8', '#DB4E2B', '#6C5CE0'], power = 9 } = {}) => {
  const c = cvs();
  if (!c) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const parts = Array.from({ length: count }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * power * 2,
    vy: -Math.random() * power - 2,
    r: 2 + Math.random() * 3.4,
    life: 1,
    col: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 6,
  }));
  const step = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const p of parts) {
      p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.vx *= 0.995; p.life -= 0.012; p.rot += 0.14;
      if (p.life > 0 && p.y < innerHeight + 40) {
        alive++;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    if (alive > 0 && fxRunning) requestAnimationFrame(step);
    else { fxRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  };
  if (!fxRunning) { fxRunning = true; requestAnimationFrame(step); }
};

export const celebrate = (node) => {
  const r = node?.getBoundingClientRect?.();
  burst(r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 2);
  haptic([10, 40, 14]);
};

/* ---------- 小语：应用自己的角色（气泡造型，非任何现成吉祥物） ---------- */
let mascotSeq = 0;
export const mascot = ({ size = 72, mood = 'idle', cls = '' } = {}) => {
  const id = `mg${++mascotSeq}`;
  const happy = mood === 'happy';
  const eyes = happy
    ? `<path d="M36 50c4-6 12-6 16 0" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>
       <path d="M68 50c4-6 12-6 16 0" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>`
    : `<ellipse cx="44" cy="50" rx="9" ry="10" fill="#fff"/>
       <ellipse cx="76" cy="50" rx="9" ry="10" fill="#fff"/>
       <circle cx="45" cy="51" r="4.4" fill="#0B1524"/>
       <circle cx="77" cy="51" r="4.4" fill="#0B1524"/>`;
  const mouth = happy
    ? `<path d="M44 68c5 9 27 9 32 0" stroke="#fff" stroke-width="5.4" stroke-linecap="round" fill="none"/>`
    : `<path d="M48 70c4 5 20 5 24 0" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  return `<svg class="mascot ${happy ? 'mascot--happy' : 'mascot--idle'} ${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#57B0FF"/><stop offset="1" stop-color="#0A84FF"/>
      </linearGradient>
    </defs>
    <path d="M26 16h68a16 16 0 0 1 16 16v42a16 16 0 0 1-16 16H56l-20 17V90H26A16 16 0 0 1 10 74V32A16 16 0 0 1 26 16z" fill="url(#${id})"/>
    <circle cx="26" cy="66" r="4.2" fill="#FF9DB0" opacity=".7"/>
    <circle cx="94" cy="66" r="4.2" fill="#FF9DB0" opacity=".7"/>
    ${eyes}
    ${mouth}
    ${happy ? `<path d="M104 20l2.6 6.4L113 29l-6.4 2.6L104 38l-2.6-6.4L95 29l6.4-2.6z" fill="#FFC53D"/>` : ''}
  </svg>`;
};

/* ---------- 星级 ---------- */
export const stars = (n, total = 3) =>
  `<div class="celebrate__stars">${Array.from({ length: total }, (_, i) =>
    `<svg class="${i < n ? 'on' : 'off'}" viewBox="0 0 24 24" fill="${i < n ? 'currentColor' : 'none'}"
      stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/></svg>`).join('')}</div>`;

/* ---------- 答题反馈条（Duolingo 式节奏） ---------- */
let feedbackNode = null;
export const closeFeedback = () => {
  if (!feedbackNode) return;
  const node = feedbackNode;
  feedbackNode = null;
  node.classList.remove('show');
  document.body.classList.remove('feedback-open');
  setTimeout(() => node.remove(), 420);
};

export const openFeedback = ({ ok = true, title = '', body = '', action = '继续', onAction }) => {
  closeFeedback();
  const node = el(`<div class="feedback ${ok ? 'ok' : 'no'}">
    <div class="feedback__head">
      ${icon(ok ? 'circle-check' : 'circle-x')}
      <span class="feedback__title">${esc(title)}</span>
    </div>
    ${body ? `<div class="feedback__body">${body}</div>` : ''}
    <div class="feedback__actions">
      <button class="btn primary block" data-feedback-action>${esc(action)}</button>
    </div>
  </div>`);
  document.body.appendChild(node);
  document.body.classList.add('feedback-open');
  requestAnimationFrame(() => node.classList.add('show'));
  node.querySelector('[data-feedback-action]').addEventListener('click', () => {
    closeFeedback();
    onAction?.();
  });
  feedbackNode = node;
  return node;
};
