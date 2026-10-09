/* 点读翻译：句子里的每个词都能点，点开看释义、音标、例句、发音 */
import { esc, haptic, normWord, stripPunct } from './util.js';
import { lookup, searchWords } from '../data/index.js';
import { $, icon, on, sheet, toast } from './ui.js';
import { getState, toggleStar, updateSettings } from './store.js';
import { speak } from './speech.js';

const isWordChar = (s) => /[A-Za-z0-9'’-]/.test(s);

export const renderSentence = (en, { cls = '' } = {}) => {
  const s = String(en ?? '');
  let out = '';
  let buf = '';
  const flush = () => {
    if (!buf) return;
    out += `<span class="w" data-w="${esc(buf)}">${esc(buf)}</span>`;
    buf = '';
  };
  for (const ch of s) {
    if (isWordChar(ch)) buf += ch;
    else { flush(); out += esc(ch); }
  }
  flush();
  return `<span class="en ${cls}" data-sentence="${esc(s)}">${out}</span>`;
};

const onlineLookup = async (word) => {
  const out = { zh: '', ipa: '', def: '', source: '' };
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { cache: 'force-cache' });
    if (r.ok) {
      const j = await r.json();
      const e = Array.isArray(j) ? j[0] : null;
      out.ipa = e?.phonetic || e?.phonetics?.find((p) => p.text)?.text || '';
      out.def = e?.meanings?.[0]?.definitions?.[0]?.definition || '';
      out.source = 'dictionaryapi.dev';
    }
  } catch {}
  if (!out.zh) {
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-CN`, { cache: 'force-cache' });
      if (r.ok) {
        const j = await r.json();
        const t = j?.responseData?.translatedText || '';
        if (t && !/^[A-Z\s]+$/.test(t)) { out.zh = t; out.source = out.source ? out.source + ' + MyMemory' : 'MyMemory'; }
      }
    } catch {}
  }
  return out;
};

export const openWordSheet = (raw, sentence = '') => {
  const word = stripPunct(raw);
  if (!word) return;
  const hit = lookup(word);
  const s = getState();
  const starred = !!s.words.starred[hit?.id || 'raw:' + normWord(word)];
  const key = hit?.id || 'raw:' + normWord(word);
  const body = `
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="font-size:27px;font-weight:750;letter-spacing:-.02em;line-height:1.2">${esc(hit?.en || word)}</div>
        <div class="mono tiny muted" style="margin-top:3px" data-ipa>${esc(hit?.ipa || '')}</div>
        <div class="tiny" style="color:var(--primary);font-weight:700;margin-top:4px">${esc(hit?.pos && hit.pos !== '—' ? hit.pos : '')}</div>
      </div>
      <button class="iconbtn on" data-say>${icon('volume-2')}</button>
      <button class="iconbtn ${starred ? 'on' : ''}" data-star>${icon('star')}</button>
    </div>
    <div style="font-size:20px;font-weight:650;margin-top:12px" data-zh>${hit ? esc(hit.zh) : '<span class="muted">本地词典未收录</span>'}</div>
    ${hit?.ex ? `<div class="card flat" style="margin-top:12px;background:var(--surface-2);box-shadow:none">
        <div class="small">${renderSentence(hit.ex)}</div>
        <div class="tiny muted" style="margin-top:4px">${esc(hit.exZh || '')}</div>
      </div>` : ''}
    ${sentence ? `<div class="tiny muted" style="margin-top:12px">出现在：${renderSentence(sentence)}</div>` : ''}
    <div class="row" style="margin-top:16px;gap:8px">
      <button class="btn sm soft" data-add>${icon('notebook-pen')}加入生词本</button>
      <button class="btn sm ghost" data-online>${icon('cloud')}联网查词</button>
    </div>
    <div class="tiny muted" style="margin-top:12px" data-note></div>`;
  const s2 = sheet({
    title: '点读',
    body,
    onMount(panel, close) {
      const say = () => speak(hit?.en || word, { rate: getState().settings.rate, accent: getState().settings.accent, voiceURI: getState().settings.voiceURI });
      $('[data-say]', panel).onclick = say;
      if (getState().settings.autoPlay) setTimeout(say, 160);
      $('[data-star]', panel).onclick = (e) => {
        const btn = e.currentTarget;
        const on2 = toggleStar(key);
        btn.classList.toggle('on', on2);
        toast(on2 ? '已加入生词本' : '已移出生词本', 'star');
        haptic(10);
      };
      $('[data-add]', panel).onclick = () => {
        toggleStar(key);
        toast('已加入生词本', 'notebook-pen');
      };
      $('[data-online]', panel).onclick = async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        $('[data-note]', panel).textContent = '正在联网查询…';
        const r = await onlineLookup(word);
        btn.disabled = false;
        if (r.ipa && !hit?.ipa) $('[data-ipa]', panel).textContent = r.ipa;
        if (r.zh) $('[data-zh]', panel).innerHTML = esc(r.zh);
        $('[data-note]', panel).textContent = r.source
          ? `来源：${r.source}${r.def ? ' · ' + r.def : ''}`
          : '网络不可用或未找到结果，已可稍后重试。';
      };
      if (!hit && getState().settings.onlineLookup) setTimeout(() => $('[data-online]', panel)?.click(), 120);
    },
  });
  return s2;
};

/* 全局点击委托：任何 .w 或 [data-tap] 都可以点读 */
export const initTap = (root) => {
  on(root, 'click', '.w', (e, t) => {
    if (!getState().settings.tapLook) return;
    e.stopPropagation();
    const sent = t.closest('[data-sentence]')?.dataset.sentence || '';
    openWordSheet(t.dataset.w, sent);
  });
  on(root, 'click', '[data-translate]', (e, t) => {
    e.stopPropagation();
    const en = t.dataset.en || '';
    const zh = t.dataset.zh || '';
    sheet({
      title: '整句翻译',
      body: `<div class="small" style="line-height:1.6">${renderSentence(en)}</div>
        <div class="card flat" style="margin-top:10px;background:var(--surface-2);box-shadow:none">
          <div class="small" style="font-weight:600">${esc(zh)}</div>
        </div>
        <button class="btn sm soft" style="margin-top:12px" data-say2>${icon('volume-2')}朗读整句</button>
        <div class="tiny muted" style="margin-top:10px">点句中任意单词可查看释义</div>`,
      onMount(panel) { $('[data-say2]', panel).onclick = () => speak(en, { rate: getState().settings.rate }); },
    });
  });
};
