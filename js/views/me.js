/* 我的：进度、成就、提醒、设置、数据、安装指南 */
import { $, icon, bar, ring, sheet, toast, celebrate, confirmSheet } from '../core/ui.js';
import { esc, dayKey, fmtDate, isIOS, isStandalone, weekdayShort, addDays, dateDiff } from '../core/util.js';
import {
  getState, levelInfo, levelTitle, BADGES, earnedBadges, exportData, importData,
  resetAll, updateSettings, updateProfile, planDay, deckStats, save,
} from '../core/store.js';
import { WORDS, WORDS_BY_DECK, DECKS, stats as contentStats, PLAN_DAYS, DIALOGUES, METHODS, PATTERNS, CONCEPTS, TALKS, FAQ } from '../data/index.js';
import { loadVoices, getVoices, speak, ttsSupported, asrSupported, micSupported } from '../core/speech.js';
import { clipState } from '../core/audio.js';

const s = () => getState();
const S = () => getState().settings;

export const renderMe = () => {
  const st = s();
  const lv = levelInfo(st.stats.xp);
  const learned = Object.keys(st.words.learned).length;
  const starred = Object.keys(st.words.starred).length;
  const acc = st.stats.answers ? Math.round((st.stats.correct / st.stats.answers) * 100) : 0;
  const earned = earnedBadges();
  const days = Object.keys(st.days).filter((k) => Object.keys(st.days[k].tasks || {}).length).length;
  const recent = Array.from({ length: 21 }, (_, i) => addDays(dayKey(), i - 20));

  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <div class="row">
        <div style="flex:1">
          <div style="font-size:20px;font-weight:750;letter-spacing:-.02em">${esc(st.profile.name || '英语学习者')}</div>
          <div class="tiny muted" style="margin-top:3px">Lv.${lv.level} ${esc(levelTitle(lv.level))} · 第 ${planDay()} 天</div>
          <div class="row" style="gap:6px;margin-top:8px">
            <span class="tag a">${icon('flame')}连续 ${st.stats.streak} 天</span>
            <span class="tag p">${icon('zap')}${st.stats.xp} XP</span>
          </div>
        </div>
        ${ring({ value: lv.ratio, size: 62, stroke: 6, label: `Lv.${lv.level}` })}
      </div>
      <div style="margin-top:12px">${bar(lv.ratio)}</div>
      <div class="tiny muted" style="margin-top:6px">距离下一级还需 ${lv.need - lv.into} XP</div>
    </div>
  </section>

  <section class="section">
    <div class="grid c4" style="gap:8px">
      <div class="stat" style="padding:10px"><div class="stat__v" style="font-size:19px">${learned}</div><div class="stat__k">单词</div></div>
      <div class="stat" style="padding:10px"><div class="stat__v" style="font-size:19px">${Object.keys(st.dialoguesDone).length}</div><div class="stat__k">场景</div></div>
      <div class="stat" style="padding:10px"><div class="stat__v" style="font-size:19px">${st.stats.speakTries}</div><div class="stat__k">跟读</div></div>
      <div class="stat" style="padding:10px"><div class="stat__v" style="font-size:19px">${acc}%</div><div class="stat__k">正确率</div></div>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">最近 21 天</h2>
      <span class="section__more">累计 ${days} 天有学习</span></div>
    <div class="card">
      <div class="row" style="gap:4px;justify-content:space-between">
        ${recent.map((k) => {
          const rec = st.days[k];
          const n = rec ? Object.keys(rec.tasks || {}).length : 0;
          const lvl = n >= 5 ? 1 : n >= 3 ? 0.65 : n >= 1 ? 0.35 : 0;
          return `<div style="flex:1;text-align:center">
            <div style="height:34px;border-radius:5px;background:${lvl ? 'color-mix(in srgb,var(--primary) ' + Math.round(lvl * 100) + '%, var(--surface-2))' : 'var(--surface-2)'}"></div>
            <div class="tiny muted" style="margin-top:3px;font-size:9px">${weekdayShort(k)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">我的成就</h2>
      <span class="section__more" data-nav="#/me/badges">${earned.length}/${BADGES.length}${icon('chevron-right')}</span></div>
    <div class="card">
      <div class="row wrap" style="gap:10px">
        ${BADGES.slice(0, 10).map((b) => {
          const on = !!st.badges[b.id];
          return `<div style="text-align:center;width:56px;opacity:${on ? 1 : .32}">
            <div style="width:42px;height:42px;border-radius:12px;margin:0 auto;display:grid;place-items:center;background:var(--${b.tone === 'a' ? 'amber' : b.tone === 'b' ? 'blue' : b.tone === 'v' ? 'violet' : b.tone === 'c' ? 'coral' : b.tone === 'g' ? 'green' : 'primary'}-50);color:var(--${b.tone === 'a' ? 'amber' : b.tone === 'b' ? 'blue' : b.tone === 'v' ? 'violet' : b.tone === 'c' ? 'coral' : b.tone === 'g' ? 'green' : 'primary'})">
              ${icon(on ? b.ico : 'lock')}
            </div>
            <div class="tiny" style="margin-top:4px;font-size:10px;line-height:1.2">${esc(b.name)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">设置与工具</h2></div>
    <div class="list">
      <button class="list__row" data-nav="#/me/reminder">
        <span class="list__ico a">${icon('bell')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">每日提醒</span>
        <span class="list__sub" style="display:block">${S().reminderOn ? `每天 ${esc(S().reminderTime)} 提醒学习` : '已关闭'}</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/me/settings">
        <span class="list__ico b">${icon('sliders-horizontal')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">发音与显示设置</span>
        <span class="list__sub" style="display:block">声音、语速、点读、联网查词</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/search">
        <span class="list__ico p">${icon('search')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">查词与翻译台</span>
        <span class="list__sub" style="display:block">中英互查 · 点读任意英文</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/learn/methods">
        <span class="list__ico g">${icon('brain')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">学习方法</span>
        <span class="list__sub" style="display:block">刻意练习 × 高效学习</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/me/data">
        <span class="list__ico v">${icon('database')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">数据备份</span>
        <span class="list__sub" style="display:block">导出 / 导入 / 重置学习记录</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-nav="#/me/about">
        <span class="list__ico c">${icon('info')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">安装与关于</span>
        <span class="list__sub" style="display:block">添加到 iPhone 主屏幕 · 内容说明</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
    </div>
  </section>

  <section class="section">
    <div class="card flat" style="box-shadow:none;background:var(--surface-2);border:0">
      <div class="row" style="align-items:flex-start;gap:10px">
        ${icon('bookmark-check', 'chev')}
        <div style="flex:1">
          <div class="small" style="font-weight:650">学习记录已自动保存在本机</div>
          <div class="tiny muted" style="margin-top:4px">建议每周导出一次备份。更换手机或清理浏览器数据前，先导出 JSON 文件。</div>
        </div>
      </div>
    </div>
  </section>`;
};

/* ---------- 成就 ---------- */
export const renderBadges = () => {
  const st = s();
  const earned = earnedBadges();
  return `
  <section class="section" style="margin-top:4px">
    <div class="card" style="background:var(--surface-2);box-shadow:none;border:0">
      <div class="row">
        ${ring({ value: earned.length / BADGES.length, size: 56, stroke: 6, label: `${earned.length}` })}
        <div style="flex:1">
          <div class="small" style="font-weight:700">已获得 ${earned.length} / ${BADGES.length} 枚徽章</div>
          <div class="tiny muted" style="margin-top:2px">徽章不会消失，换设备请先导出备份</div>
        </div>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="list">
      ${BADGES.map((b) => {
        const on = !!st.badges[b.id];
        return `<div class="list__row" style="opacity:${on ? 1 : .55}">
          <span class="list__ico ${b.tone}">${icon(on ? b.ico : 'lock')}</span>
          <span style="flex:1"><span class="list__title" style="display:block">${esc(b.name)}</span>
          <span class="list__sub" style="display:block">${esc(b.desc)}</span></span>
          ${on ? `<span class="tag g">${icon('check')}已获得</span>` : ''}
        </div>`;
      }).join('')}
    </div>
  </section>`;
};

/* ---------- 提醒 ---------- */
export const renderReminder = () => {
  const st = s();
  const standalone = isStandalone();
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <div class="row">
        <span class="list__ico a" style="width:44px;height:44px">${icon('bell-ring')}</span>
        <div style="flex:1">
          <div class="small" style="font-weight:700">每天提醒我学习</div>
          <div class="tiny muted" style="margin-top:2px">推荐固定在晚饭后或睡前 30 分钟</div>
        </div>
        <label class="row" style="gap:6px">
          <input type="checkbox" id="rem-on" ${S().reminderOn ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--primary)">
        </label>
      </div>
      <div class="row" style="margin-top:14px">
        <span class="small" style="font-weight:600">提醒时间</span>
        <span class="spacer"></span>
        <input type="time" id="rem-time" value="${esc(S().reminderTime)}"
          style="border:1px solid var(--line);border-radius:var(--r);height:40px;padding:0 10px;background:var(--surface);font-size:16px">
      </div>
      <div class="row" style="margin-top:10px">
        <span class="small" style="font-weight:600">周末也提醒</span>
        <span class="spacer"></span>
        <input type="checkbox" id="rem-weekend" ${S().remindWeekend ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--primary)">
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title sm">让提醒真正响起来</h2></div>
    <div class="list">
      <button class="list__row" data-ics>
        <span class="list__ico p">${icon('calendar-days')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">添加到 iPhone 日历</span>
        <span class="list__sub" style="display:block">生成 .ics 文件，每天 ${esc(S().reminderTime)} 自动提醒（最可靠）</span></span>
        ${icon('download', 'chev')}
      </button>
      <button class="list__row" data-notify>
        <span class="list__ico b">${icon('bell')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">网页通知</span>
        <span class="list__sub" style="display:block">${('Notification' in window) ? (Notification.permission === 'granted' ? '已授权，打开 App 时会提醒' : '点击授权（iOS 需先添加到主屏幕）') : '当前浏览器不支持'}</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-shortcut>
        <span class="list__ico v">${icon('workflow')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">用"快捷指令"自动化</span>
        <span class="list__sub" style="display:block">每天定时打开英语教练（附步骤）</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
    </div>
    <div class="banner" style="margin-top:12px">${icon('info')}<div>iPhone 上的网页 App 无法在后台自己发通知，所以最稳的办法是用日历提醒；快捷指令可以做到"定时自动打开"。</div></div>
  </section>

  <section class="section">
    <div class="card">
      <div class="small" style="font-weight:700">${icon('flame')} 连续学习 ${st.stats.streak} 天</div>
      <div class="tiny muted" style="margin-top:6px">最近学习：${st.stats.lastStudy ? esc(fmtDate(st.stats.lastStudy, { month: 'long', day: 'numeric' })) : '还没有记录'}</div>
      <div class="tiny muted" style="margin-top:4px">${standalone ? '已作为独立 App 运行 ✓' : '提示：添加到主屏幕后，学习数据更不容易被系统清理。'}</div>
    </div>
  </section>`;
};

const buildICS = () => {
  const t = S().reminderTime.split(':');
  const start = new Date();
  start.setHours(Number(t[0] || 20), Number(t[1] || 0), 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const fmtLocal = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const end = new Date(start.getTime() + 30 * 60000);
  const until = new Date(start.getTime() + 200 * 86400000);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//English Coach//180//CN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@english-coach`,
    `DTSTAMP:${fmtLocal(new Date())}`,
    `DTSTART:${fmtLocal(start)}`,
    `DTEND:${fmtLocal(end)}`,
    'SUMMARY:英语教练 · 今日口语练习',
    'DESCRIPTION:打开英语教练，完成今天的 30 分钟训练：复习 → 新词 → 跟读 → 场景 → 闯关。',
    `RRULE:FREQ=DAILY;UNTIL=${fmtLocal(until).slice(0, 8)}T235959Z`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:该练英语了', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n');
};

const download = (name, text, mime = 'text/plain') => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

/* ---------- 设置 ---------- */
export const renderSettings = () => {
  const st = S();
  const voices = getVoices();
  return `
  <section class="section" style="margin-top:4px">
    <div class="section__head"><h2 class="section__title sm">发音</h2></div>
    <div class="list">
      <label class="list__row">
        <span style="flex:1">
          <span class="list__title" style="display:block">真人发音（本地神经语音）</span>
          <span class="list__sub" style="display:block">内置 ${clipState().human || 2000}+ 条离线音频，关闭后使用系统语音朗读</span>
        </span>
        <input type="checkbox" id="humanVoice" ${st.humanVoice ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--tint)">
      </label>
      <div class="list__row" style="flex-direction:column;align-items:stretch;gap:8px">
        <div class="row"><span class="small" style="font-weight:600">${icon('volume-2')} 朗读声音</span></div>
        <select id="voice" style="border:1px solid var(--line);border-radius:var(--r);height:40px;padding:0 10px;background:var(--surface);font-size:15px">
          ${voices.length ? voices.map((v) => `<option value="${esc(v.voiceURI)}" ${st.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)} · ${esc(v.lang)}${v.localService ? ' · 离线' : ''}</option>`).join('') : '<option value="">使用系统默认</option>'}
        </select>
        ${!voices.length ? `<div class="tiny muted">${ttsSupported ? '正在读取系统声音…若长期为空，请在 iOS 设置中下载英语语音。' : '当前浏览器不支持语音朗读。'}</div>` : ''}
      </div>
      <div class="list__row" style="flex-direction:column;align-items:stretch;gap:8px">
        <div class="row"><span class="small" style="font-weight:600">${icon('gauge')} 语速</span><span class="spacer"></span><span class="tiny muted" id="rate-val">${st.rate.toFixed(2)}×</span></div>
        <input type="range" id="rate" min="0.6" max="1.2" step="0.05" value="${st.rate}" style="width:100%;accent-color:var(--primary)">
        <button class="btn xs soft" data-test-voice>${icon('play')}试听一句</button>
      </div>
      <div class="list__row">
        <span class="small" style="font-weight:600">口音</span><span class="spacer"></span>
        <select id="accent" style="border:1px solid var(--line);border-radius:var(--r);height:36px;padding:0 8px;background:var(--surface)">
          <option value="en-US" ${st.accent === 'en-US' ? 'selected' : ''}>美音</option>
          <option value="en-GB" ${st.accent === 'en-GB' ? 'selected' : ''}>英音</option>
        </select>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title sm">学习与显示</h2></div>
    <div class="list">
      <label class="list__row"><span class="small" style="flex:1;font-weight:600">自动朗读英文</span>
        <input type="checkbox" id="autoPlay" ${st.autoPlay ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--primary)"></label>
      <label class="list__row"><span class="small" style="flex:1;font-weight:600">点读查词（点单词看释义）</span>
        <input type="checkbox" id="tapLook" ${st.tapLook ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--primary)"></label>
      <label class="list__row"><span class="small" style="flex:1;font-weight:600">联网补充翻译（词典未收录时）</span>
        <input type="checkbox" id="onlineLookup" ${st.onlineLookup ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--primary)"></label>
      <label class="list__row"><span class="small" style="flex:1;font-weight:600">默认显示中文翻译</span>
        <input type="checkbox" id="showZh" ${st.showZh ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--primary)"></label>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title sm">我的目标</h2></div>
    <div class="list">
      <div class="list__row" style="flex-direction:column;align-items:stretch;gap:8px">
        <span class="small" style="font-weight:600">每天学习时长</span>
        <div class="seg" data-goal>
          ${[[15, '15 分钟'], [30, '30 分钟'], [45, '45 分钟'], [60, '60 分钟']].map(([v, l]) =>
            `<button class="seg__item ${getState().profile.dailyMinutes === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="list__row" style="flex-direction:column;align-items:stretch;gap:8px">
        <span class="small" style="font-weight:600">学习目标</span>
        <div class="seg" data-track>
          ${[['both', '口语+专业'], ['conversation', '日常口语'], ['pro', '专业英语']].map(([v, l]) =>
            `<button class="seg__item ${getState().profile.track === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}
        </div>
        <div class="tiny muted">调整后，每日任务的专业模块比重会随之变化。</div>
      </div>
      <div class="list__row" style="flex-direction:column;align-items:stretch;gap:8px">
        <span class="small" style="font-weight:600">计划开始日期</span>
        <input type="date" id="start-date" value="${esc(getState().profile.startDate)}"
          style="border:1px solid var(--line);border-radius:var(--r);height:40px;padding:0 10px;background:var(--surface)">
        <div class="tiny muted">从这一天开始计算 180 天进度。想重新开始，把日期改成今天。</div>
      </div>
      <div class="list__row" style="flex-direction:column;align-items:stretch;gap:8px">
        <span class="small" style="font-weight:600">称呼</span>
        <input id="nickname" value="${esc(getState().profile.name)}" placeholder="怎么称呼你？"
          style="border:1px solid var(--line);border-radius:var(--r);height:40px;padding:0 10px;background:var(--surface)">
      </div>
    </div>
  </section>

  <section class="section">
    <div class="card flat" style="box-shadow:none;background:var(--surface-2);border:0">
      <div class="small" style="font-weight:650">环境自检</div>
      <div class="tiny muted" style="margin-top:8px;line-height:1.8">
        语音朗读：${ttsSupported ? '✓ 支持' : '✗ 不支持'}<br>
        语音识别评分：${asrSupported() ? '✓ 支持' : '✗ 不支持（将使用自评模式）'}<br>
        录音回放：${micSupported() ? '✓ 支持' : '✗ 不支持'}<br>
        独立应用模式：${isStandalone() ? '✓ 已安装到主屏幕' : '未安装（可在分享菜单选择"添加到主屏幕"）'}
      </div>
    </div>
  </section>`;
};

/* ---------- 数据 ---------- */
export const renderData = () => `
  <section class="section" style="margin-top:4px">
    <div class="list">
      <button class="list__row" data-export>
        <span class="list__ico p">${icon('download')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">导出学习数据</span>
        <span class="list__sub" style="display:block">生成 JSON 备份文件，可保存到"文件"App</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-import>
        <span class="list__ico b">${icon('upload')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">导入备份</span>
        <span class="list__sub" style="display:block">从 JSON 文件恢复学习进度</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
      <button class="list__row" data-reset>
        <span class="list__ico c">${icon('trash')}</span>
        <span style="flex:1"><span class="list__title" style="display:block">清空所有数据</span>
        <span class="list__sub" style="display:block">删除进度、单词记录与成就（不可恢复）</span></span>
        ${icon('chevron-right', 'chev')}
      </button>
    </div>
  </section>
  <section class="section">
    <div class="card">
      <div class="small" style="font-weight:700">数据存在哪里？</div>
      <div class="tiny muted" style="margin-top:8px;line-height:1.7">
        所有学习记录保存在这台设备的浏览器本地存储中，不会上传到任何服务器（联网查词仅发送你点击的单词）。<br><br>
        这意味着：<b>更换手机或清理浏览器数据前，请务必先导出备份。</b>
      </div>
    </div>
  </section>
  <input type="file" id="import-file" accept="application/json,.json" class="hide">`;

/* ---------- 关于 / 安装指南 ---------- */
export const renderAbout = () => {
  const cs = contentStats();
  return `
  <section class="section" style="margin-top:4px">
    <div class="card">
      <div class="row">
        <span class="list__ico p" style="width:48px;height:48px">${icon('graduation-cap')}</span>
        <div style="flex:1">
          <div class="small" style="font-weight:750">英语教练 · English Coach</div>
          <div class="tiny muted" style="margin-top:2px">180 天口语与专业英语训练 · v1.0.0</div>
        </div>
      </div>
      <div class="grid c4" style="margin-top:14px;gap:8px">
        <div><div class="stat__v" style="font-size:17px">${cs.words}</div><div class="stat__k">词汇</div></div>
        <div><div class="stat__v" style="font-size:17px">${cs.dialogues}</div><div class="stat__k">场景</div></div>
        <div><div class="stat__v" style="font-size:17px">${cs.patterns}</div><div class="stat__k">句型</div></div>
        <div><div class="stat__v" style="font-size:17px">${cs.concepts}</div><div class="stat__k">专业概念</div></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><h2 class="section__title">安装到 iPhone</h2></div>
    <div class="list">
      <div class="list__row" style="align-items:flex-start">
        <span class="list__ico p">1</span>
        <span style="flex:1" class="small">用 <b>Safari</b> 打开本应用地址（必须是 Safari，微信/Chrome 内嵌浏览器不行）。</span>
      </div>
      <div class="list__row" style="align-items:flex-start">
        <span class="list__ico p">2</span>
        <span style="flex:1" class="small">点击底部中间的 <b>分享按钮</b>（方框向上箭头）。</span>
      </div>
      <div class="list__row" style="align-items:flex-start">
        <span class="list__ico p">3</span>
        <span style="flex:1" class="small">向下找到 <b>"添加到主屏幕"</b>，点击右上角"添加"。</span>
      </div>
      <div class="list__row" style="align-items:flex-start">
        <span class="list__ico p">4</span>
        <span style="flex:1" class="small">主屏幕会出现"英语教练"图标，点开即全屏运行，<b>断网也能用</b>。</span>
      </div>
    </div>
    <div class="banner p" style="margin-top:12px">${icon('shield-check')}<div>首次打开后建议完整使用一遍（听一段、读一段），让 App 把内容缓存到本机，之后离线可用。</div></div>
  </section>

  <section class="section">
    <div class="card">
      <div class="small" style="font-weight:700">内容与学习方法说明</div>
      <div class="tiny muted" style="margin-top:8px;line-height:1.75">
        · 课程设计遵循<b>刻意练习</b>：明确目标、即时反馈、专注重复、难度递进。<br>
        · 单词采用<b>间隔重复（SRS）</b>，跟读提供逐句评分，复盘日用于巩固。<br>
        · 专业模块（暖通空调、楼宇自控）为通用行业英语学习资料，产品名称与参数请以厂商官方最新资料为准。<br>
        · 发音音频由本地神经语音引擎 <b>Piper</b>（MIT）配合 <b>LJSpeech</b>（公有领域）音色离线生成，可随应用分发；未收录的句子自动回退到系统语音。<br>
        · 语音朗读由系统语音引擎提供，离线可用；语音识别评分需要开启 iOS 键盘听写功能。
      </div>
    </div>
  </section>

  <section class="section">
    <div class="card flat" style="box-shadow:none;background:var(--surface-2);border:0">
      <div class="small" style="font-weight:650">${icon('cloud-download')} 内容更新</div>
      <div class="tiny muted" style="margin-top:6px">应用会联网检查内容更新；有新版本时，重新打开即可自动生效。</div>
      <button class="btn sm soft" style="margin-top:10px" data-check-update>${icon('refresh-cw')}检查更新</button>
    </div>
  </section>`;
};

/* ---------- 查词 / 翻译台 ---------- */
export const renderSearch = () => `
  <section class="section" style="margin-top:4px">
    <div class="card" style="padding:12px">
      <div class="row" style="gap:8px">
        <input id="q" class="card" placeholder="输入英文单词或中文，例如 chiller / 冷水机"
          style="flex:1;border:1px solid var(--line);box-shadow:none;height:44px;padding:0 12px;font-size:15px">
        <button class="iconbtn on" data-do-search>${icon('search')}</button>
      </div>
      <div class="tiny muted" style="margin-top:8px">试试搜索：valve、commissioning、焓值、协议</div>
    </div>
  </section>
  <section class="section" id="results">
    <div class="empty">${icon('languages')}<h4>中英互查</h4><p class="small">输入中文或英文，会同时搜索全部 ${WORDS.length} 个术语与专业词汇。</p></div>
  </section>`;

export const mountSearch = (root) => {
  const input = $('#q', root);
  const run = async () => {
    const q = input.value.trim();
    const box = $('#results', root);
    if (!q) return;
    const { searchWords } = await import('../data/index.js');
    const list = searchWords(q, 30);
    if (!list.length) {
      box.innerHTML = `<div class="card"><div class="small" style="font-weight:650">本地词典未收录"${esc(q)}"</div>
        <div class="tiny muted" style="margin-top:6px">可以点下方按钮联网查询，或直接在任意英文句子里点这个词。</div>
        <button class="btn sm soft" style="margin-top:10px" data-net>${icon('cloud')}联网查询</button></div>`;
      $('[data-net]', box).onclick = async () => {
        const { lookup } = await import('../data/index.js');
        const { openWordSheet } = await import('../core/tap.js');
        openWordSheet(q);
      };
      return;
    }
    box.innerHTML = `<div class="list">${list.map((w) => `
      <div class="list__row" data-w="${esc(w.en)}">
        <span class="list__ico ${DECKS.find((d) => d.id === w.deck)?.tone || 'p'}">${icon(DECKS.find((d) => d.id === w.deck)?.ico || 'book-open')}</span>
        <span style="flex:1;min-width:0">
          <span class="list__title" style="display:block">${esc(w.en)} <span class="tiny muted mono" style="font-weight:400">${esc(w.ipa)}</span></span>
          <span class="list__sub" style="display:block">${esc(w.zh)}</span>
        </span>
        <button class="iconbtn sm" data-say="${esc(w.en)}">${icon('volume-2')}</button>
      </div>`).join('')}</div>`;
    box.querySelectorAll('[data-w]').forEach((b) => b.onclick = async (e) => {
      if (e.target.closest('[data-say]')) return;
      const { openWordSheet } = await import('../core/tap.js');
      openWordSheet(b.dataset.w);
    });
    box.querySelectorAll('[data-say]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.say); });
  };
  root.querySelector('[data-do-search]')?.addEventListener('click', run);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
};

/* ---------- 挂载 ---------- */
export const mountMe = (root, ctx) => {
  const { nav, rerender } = ctx;
  const g = (id) => root.querySelector(id);

  const remOn = g('#rem-on');
  if (remOn) remOn.onchange = () => { updateSettings({ reminderOn: remOn.checked }); toast(remOn.checked ? '已开启每日提醒' : '已关闭提醒', 'bell'); };
  const remTime = g('#rem-time');
  if (remTime) remTime.onchange = () => { updateSettings({ reminderTime: remTime.value }); toast(`提醒时间：${remTime.value}`, 'clock'); };
  const remWk = g('#rem-weekend');
  if (remWk) remWk.onchange = () => updateSettings({ remindWeekend: remWk.checked });

  root.querySelector('[data-ics]')?.addEventListener('click', () => {
    download('英语教练-每日提醒.ics', buildICS(), 'text/calendar');
    sheet({
      title: '已生成日历文件',
      body: `<div class="small" style="line-height:1.75">
        1. 在"文件"App 中找到刚下载的 <b>英语教练-每日提醒.ics</b><br>
        2. 点击它 → 选择"添加到日历"<br>
        3. 选择日历（建议新建"英语学习"）→ 添加<br>
        4. 之后每天 ${esc(S().reminderTime)} 手机会自动提醒你练习</div>
        <div class="banner p" style="margin-top:12px">${icon('info')}<div>如果没找到文件，可在 Safari 的下载列表里查看。</div></div>`,
    });
  });

  root.querySelector('[data-notify]')?.addEventListener('click', async () => {
    if (!('Notification' in window)) { toast('当前环境不支持网页通知', 'triangle-alert'); return; }
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? '通知已开启' : '通知未开启', p === 'granted' ? 'bell-ring' : 'bell');
    rerender();
  });

  root.querySelector('[data-shortcut]')?.addEventListener('click', () => {
    sheet({
      title: '用快捷指令每天自动打开',
      body: `<div class="small" style="line-height:1.8">
        1. 打开 iPhone 自带的 <b>快捷指令</b> App<br>
        2. 底部选择 <b>自动化</b> → 右上角 <b>+</b><br>
        3. 选择 <b>特定时间</b> → 设置为 ${esc(S().reminderTime)} → 每天 → 下一步<br>
        4. 搜索并添加 <b>打开 App</b> → 选择 <b>英语教练</b><br>
        5. 关闭"运行前询问" → 完成<br><br>
        <span class="muted">这样每天到点，手机会弹出提示并可直接进入练习。</span></div>`,
    });
  });

  const voice = g('#voice');
  if (voice) voice.onchange = () => updateSettings({ voiceURI: voice.value });
  const rate = g('#rate');
  if (rate) rate.oninput = () => { updateSettings({ rate: Number(rate.value) }); const v = g('#rate-val'); if (v) v.textContent = Number(rate.value).toFixed(2) + '×'; };
  const accent = g('#accent');
  if (accent) accent.onchange = () => updateSettings({ accent: accent.value });
  root.querySelector('[data-test-voice]')?.addEventListener('click', () => speak('This is how your English coach sounds. Let us start today.', { rate: S().rate, accent: S().accent, voiceURI: S().voiceURI }));

  [['#autoPlay', 'autoPlay'], ['#tapLook', 'tapLook'], ['#onlineLookup', 'onlineLookup'], ['#showZh', 'showZh'], ['#humanVoice', 'humanVoice']].forEach(([sel, key]) => {
    const el = g(sel);
    if (el) el.onchange = () => updateSettings({ [key]: el.checked });
  });

  root.querySelectorAll('[data-goal] [data-v]').forEach((b) => {
    b.onclick = () => { updateProfile({ dailyMinutes: Number(b.dataset.v) }); toast('已更新每日时长', 'clock'); rerender(); };
  });
  root.querySelectorAll('[data-track] [data-v]').forEach((b) => {
    b.onclick = () => { updateProfile({ track: b.dataset.v }); toast('已更新学习目标', 'target'); rerender(); };
  });
  const sd = g('#start-date');
  if (sd) sd.onchange = () => { updateProfile({ startDate: sd.value }); toast('计划已重新计算', 'calendar-check'); rerender(); };
  const nn = g('#nickname');
  if (nn) nn.onchange = () => updateProfile({ name: nn.value.trim() });

  root.querySelector('[data-export]')?.addEventListener('click', () => {
    download(`英语教练-备份-${dayKey()}.json`, exportData(), 'application/json');
    toast('已导出备份文件', 'download');
  });
  const file = g('#import-file');
  root.querySelector('[data-import]')?.addEventListener('click', () => file?.click());
  if (file) file.onchange = async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      importData(text);
      toast('备份已导入', 'check-check');
      rerender();
    } catch (e) {
      toast('导入失败：' + e.message, 'triangle-alert');
    }
  };
  root.querySelector('[data-reset]')?.addEventListener('click', async () => {
    const ok = await confirmSheet({ title: '清空所有数据？', text: '所有学习进度、单词记录与成就都会被删除，且无法恢复。建议先导出备份。', okText: '确认清空', danger: true });
    if (ok) { resetAll(); toast('已清空，重新开始', 'refresh-cw'); nav('#/today', { reload: true }); }
  });

  root.querySelector('[data-check-update]')?.addEventListener('click', async () => {
    try {
      const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
      const j = await r.json();
      const reg = await navigator.serviceWorker?.getRegistration?.();
      await reg?.update?.();
      toast(`内容版本 ${j.version} · 已是最新`, 'cloud-download');
    } catch {
      toast('检查更新失败，请稍后重试', 'triangle-alert');
    }
  });
};
