'use strict';
// Bridge Sim v1 — 社屋断面ビュー。データは data.js（配員表から自動生成・機微マスク済み）
// ?shot=1: headless撮影用（Windows表示スケールの右端切れ対策で左寄せにする）
if (location.search.includes('shot')) document.body.style.justifyContent = 'flex-start';
const D = window.BRIDGE_DATA || { group:'', generatedAt:'', projects:[], jobs:[] };

// ---- データ整理 ----
const byCat = c => D.projects.filter(p => (p.category || '').startsWith(c));
const hq      = D.projects.find(p => p.name === 'bridge');
const rensai  = byCat('連載');
const kikan   = byCat('基幹').filter(p => p.name !== 'bridge');
const tenji   = byCat('展示');
const kisetsu = byCat('季節');
const fukaki  = byCat('孵化器');
const kyumin  = byCat('休眠');
const jobsLive = D.jobs.filter(j => j.state === 'proposed' || j.state === 'queued');

const SHORT = { 'engine-zukan':'図鑑', 'machikoba':'町工場', 'travel-itinerary':'旅行' };
const short = n => SHORT[n] || (n.length > 8 ? n.slice(0, 7) + '…' : n);
const warn = p => /要注視|未達|差戻し/.test(p.status || '');

// ---- キャンバス ----
const cv = document.getElementById('cv'), g = cv.getContext('2d');
const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const BX = 10, BW = 162;
const F = { f6:42, f5:78, f4:114, f3:150, f2:186, f1:222 }; // 各フロア天井y（内高36）

// タップ領域（描画レイアウトと同期）
const regions = [];
function reg(x, y, w, h, kind, data) { regions.push({ x, y, w, h, kind, data }); }

// 5F 連載デスクの位置
const deskSlots = rensai.map((p, i) => {
  const slotW = (BW - 16) / Math.max(rensai.length, 1);
  return { p, cx: BX + 8 + slotW * i + slotW / 2 };
});
// 4F 基幹ラックの位置
const rackSlots = kikan.map((p, i) => {
  const slotW = (BW - 12) / Math.max(kikan.length, 1);
  return { p, x: BX + 6 + slotW * i + (slotW - 12) / 2 };
});
// 3F 展示の額縁
const frameColors = ['#58a8d8', '#e8883d', '#48a048', '#8c68b8', '#c84848', '#38a0a0'];
const frameSlots = tenji.map((p, i) => ({ p, x: 18 + i * 16, c: frameColors[i % frameColors.length] }));
// 1F コンベアの荷箱
const crateSlots = jobsLive.slice(0, 3).map((j, i) => ({ j, x: 18 + i * 18 }));

// 静的な当たり判定を登録
deskSlots.forEach(s => reg(s.cx - 11, F.f5 + 10, 24, 26, 'project', s.p));
rackSlots.forEach(s => reg(s.x - 2, F.f4 + 6, 16, 26, 'project', s.p));
frameSlots.forEach(s => reg(s.x - 2, F.f3 + 6, 16, 14, 'project', s.p));
if (kisetsu[0]) reg(108, F.f3 + 4, 50, 30, 'project', kisetsu[0]);
if (fukaki[0])  reg(14, F.f2 + 4, 80, 30, 'project', fukaki[0]);
if (kyumin[0])  reg(116, F.f2 + 2, 44, 30, 'project', kyumin[0]);
if (hq)         reg(16, F.f6 + 4, 44, 30, 'project', hq);
crateSlots.forEach(s => reg(s.x - 2, F.f1 + 22, 16, 16, 'job', s.j));

// ---- スプライト ----
function worker(x, y, hair, shirt, typing, tick) {
  const bob = typing && tick % 2 ? 1 : 0;
  P(x + 1, y + bob, 4, 3, hair); P(x + 1, y + 3 + bob, 4, 2, '#f0c8a0');
  P(x, y + 5, 6, 4, shirt); P(x + 1, y + 9, 1, 2, '#4a5878'); P(x + 4, y + 9, 1, 2, '#4a5878');
}
function desk(x, y, on, tick) {
  P(x, y + 6, 14, 2, '#b87840'); P(x + 1, y + 8, 2, 5, '#8c5830'); P(x + 11, y + 8, 2, 5, '#8c5830');
  P(x + 8, y, 6, 5, '#384858');
  P(x + 9, y + 1, 4, 3, on ? (tick % 4 === 3 ? '#78d8e8' : '#58c8d8') : '#586878');
}
function zzz(x, y, t) {
  const f = (t * 0.6) % 1;
  const zy = y - f * 8;
  g.globalAlpha = 1 - f * 0.8;
  P(x, zy, 4, 1, '#f8ecd0'); P(x + 2, zy + 1, 1, 1, '#f8ecd0'); P(x + 1, zy + 2, 1, 1, '#f8ecd0'); P(x, zy + 3, 4, 1, '#f8ecd0');
  g.globalAlpha = 1;
}
const HAIR = ['#3a3028', '#6b4226', '#8c6838', '#c89858'];

// ---- シーン描画 ----
let selected = null; // {kind, data}
function draw(t) {
  const tick = Math.floor(t * 2);
  // 空と太陽
  P(0, 0, 195, 300, '#9cd4e4');
  P(150, 14, 16, 16, '#f8d858'); P(154, 10, 8, 24, '#f8d858'); P(146, 18, 24, 8, '#f8d858');
  // 流れる雲
  [[0.9, 20, 28], [0.55, 32, 96], [1.4, 52, 160]].forEach(([sp, y, x0]) => {
    const x = ((x0 + t * sp) % 240) - 30;
    P(x, y, 22, 7, '#fff'); P(x + 4, y - 4, 14, 5, '#fff'); P(x - 5, y + 2, 8, 5, '#eef8fa');
  });
  // ビル外形
  P(BX - 4, 36, BW + 8, 6, '#8c7858');
  P(BX, 42, BW, 236, '#f0dcb0');
  P(BX - 2, 42, 2, 236, '#c8a878'); P(BX + BW, 42, 2, 236, '#b89058');
  // 旗（はためく2コマ）
  P(24, 16, 2, 22, '#4a3828');
  if (tick % 2) { P(26, 16, 18, 10, '#e85838'); P(28, 18, 14, 6, '#f8ecd0'); }
  else { P(26, 17, 18, 9, '#e85838'); P(28, 19, 13, 5, '#f8ecd0'); }
  // フロア内装
  Object.values(F).forEach(y => {
    P(BX + 2, y, BW - 4, 36, '#fbf0d8');
    P(BX + 2, y + 28, BW - 4, 8, '#d4a868');
    for (let x = BX + 2; x < BX + BW - 4; x += 16) P(x, y + 28, 1, 8, '#b88848');
    P(BX, y + 36, BW, 4, '#b89058'); P(BX, y + 36, BW, 1, '#8c6838');
  });

  // 6F 本社
  if (hq) { desk(30, F.f6 + 10, true, tick); worker(22, F.f6 + 8, '#3a3028', '#8c3838', true, tick); }
  P(70, F.f6 + 18, 44, 3, '#b87840'); P(74, F.f6 + 21, 3, 7, '#8c5830'); P(106, F.f6 + 21, 3, 7, '#8c5830');
  worker(72, F.f6 + 8, '#6b4226', '#4878c0', true, tick + 1);
  worker(88, F.f6 + 8, '#3a3028', '#48a048', true, tick);
  worker(104, F.f6 + 8, '#8c6838', '#e8883d', true, tick + 1);
  P(130, F.f6 + 6, 26, 14, '#e0d0a8'); P(132, F.f6 + 8, 22, 10, '#fbf0d8');
  P(140, F.f6 + 2, 6, 4, jobsLive.length && tick % 2 ? '#e85838' : '#a85838'); // 検収・承認待ちランプ

  // 5F 連載
  deskSlots.forEach((s, i) => {
    const active = (s.p.energy ?? 0) > 30;
    desk(s.cx - 4, F.f5 + 14, active, tick + i);
    worker(s.cx - 10, F.f5 + 12, HAIR[i % HAIR.length], '#e8883d', active, tick + i);
  });

  // 4F 基幹（ラック）
  rackSlots.forEach((s, i) => {
    const x = s.x, y = F.f4 + 8;
    P(x, y, 12, 22, '#586878'); P(x + 2, y + 2, 8, 2, '#8898a8');
    const lampOn = tick % 4 !== i % 4;
    P(x + 2, y + 6, 2, 2, lampOn ? '#78e858' : '#48a838'); P(x + 6, y + 6, 2, 2, '#78e858');
    P(x + 2, y + 10, 2, 2, warn(s.p) ? (tick % 2 ? '#e8d838' : '#a89828') : '#78e858');
    P(x + 2, y + 14, 8, 1, '#8898a8'); P(x + 2, y + 17, 8, 1, '#8898a8');
  });
  // 保守員が巡回
  {
    const span = BW - 30, ph = (t * 8) % (span * 2);
    const wx = BX + 12 + (ph < span ? ph : span * 2 - ph);
    worker(wx, F.f4 + 19, '#3a3028', '#4878c0', false, tick);
  }

  // 3F 展示・季節
  frameSlots.forEach(s => { P(s.x, F.f3 + 8, 12, 10, '#8c5830'); P(s.x + 1, F.f3 + 9, 10, 8, '#f8ecd0'); P(s.x + 3, F.f3 + 11, 6, 4, s.c); });
  {
    const span = Math.max(frameSlots.length * 16, 40), ph = (t * 4) % (span * 2);
    const wx = 20 + (ph < span ? ph : span * 2 - ph);
    worker(wx, F.f3 + 18, '#8c6838', '#68b8c8', false, tick); // 鑑賞する人
  }
  if (kisetsu.length) {
    P(112, F.f3 + 18, 30, 3, '#b87840'); P(114, F.f3 + 21, 2, 6, '#8c5830'); P(138, F.f3 + 21, 2, 6, '#8c5830');
    worker(118, F.f3 + 8, '#3a3028', '#38a0a0', true, tick);
    P(146, F.f3 + 8, 8, 12, '#c89858'); P(147, F.f3 + 9, 6, 4, '#e85838'); // スーツケース
  }

  // 2F 孵化器・倉庫
  if (fukaki.length) {
    P(20, F.f2 + 10, 20, 14, '#c89858'); P(22, F.f2 + 12, 16, 10, '#e8d8b0');
    const wob = tick % 8 === 7 ? 1 : 0;
    P(26 + wob, F.f2 + 6, 8, 6, '#f8f0e0'); P(28 + wob, F.f2 + 4, 4, 4, '#f8f0e0'); // タマゴ
    const plant = x => { P(x, F.f2 + 20, 8, 6, '#b86838'); P(x + 2, F.f2 + 12, 4, 8, '#48a048'); P(x, F.f2 + 10, 3, 4, '#68c868'); P(x + 5, F.f2 + 10, 3, 4, '#68c868'); };
    plant(50); plant(66);
    worker(84, F.f2 + 11, '#6b4226', '#48a048', true, tick);
  }
  if (kyumin.length) {
    P(120, F.f2 + 6, 36, 20, '#a89878'); P(124, F.f2 + 10, 12, 16, '#786858');
    P(138, F.f2 + 12, 14, 6, '#f8ecd0'); P(139, F.f2 + 13, 12, 4, '#586060');
    zzz(146, F.f2 + 4, t);
  }

  // 1F 搬入口
  P(76, F.f1 + 16, 26, 34, '#4a3828'); P(79, F.f1 + 19, 20, 31, '#a8d8e8'); P(84, F.f1 + 22, 10, 26, '#88c0d8');
  // コンベア（ベルトが流れる）
  P(14, F.f1 + 36, 58, 6, '#687078'); P(14, F.f1 + 42, 58, 2, '#4a5058');
  for (let i = 0; i < 7; i++) { const x = 16 + ((i * 8 + t * 6) % 54); P(x, F.f1 + 38, 4, 2, '#8898a8'); }
  crateSlots.forEach(s => {
    const queued = s.j.state === 'queued';
    P(s.x, F.f1 + 26, 12, 10, queued ? '#c89858' : '#b8b0a0');
    P(s.x + 2, F.f1 + 28, 8, 2, queued ? '#a87838' : '#98908c');
    P(s.x + 5, F.f1 + 26, 2, 10, queued ? '#a87838' : '#98908c');
  });
  if (crateSlots.length && crateSlots[0].j.state === 'proposed' && tick % 2) P(22, F.f1 + 18, 3, 6, '#e85838'); // 承認待ち「！」
  // 行き交う社員
  {
    const ph = (t * 10) % 160;
    worker(110 + (ph < 80 ? ph : 160 - ph) * 0.4, F.f1 + 36, '#3a3028', '#4878c0', false, tick);
    const ph2 = (t * 7 + 60) % 140;
    worker(150 - (ph2 < 70 ? ph2 : 140 - ph2) * 0.5, F.f1 + 36, '#8c6838', '#e8883d', false, tick + 1);
  }
  P(150, F.f1 + 24, 4, 26, '#48a048'); P(146, F.f1 + 20, 12, 8, '#68c868');

  // 地面
  P(0, 278, 195, 22, '#88b858'); P(0, 278, 195, 3, '#68a048');
  for (let x = 4; x < 195; x += 22) P(x, 286, 10, 3, '#98c868');

  // 選択ハイライト（点滅枠）
  if (selected && tick % 2 === 0) {
    const r = regions.find(r => r.kind === selected.kind &&
      (r.kind === 'project' ? r.data.name === selected.data.name : r.data.id === selected.data.id));
    if (r) {
      g.fillStyle = '#f8f048';
      g.fillRect(r.x - 1, r.y - 1, r.w + 2, 1); g.fillRect(r.x - 1, r.y + r.h, r.w + 2, 1);
      g.fillRect(r.x - 1, r.y - 1, 1, r.h + 2); g.fillRect(r.x + r.w, r.y - 1, 1, r.h + 2);
    }
  }
}

// ---- 12fpsで回す（レトロ演出＆省電力。ビル表示中のみ描画） ----
let currentView = 'home';
let last = 0;
function loop(ms) {
  if (currentView === 'home' && ms - last > 80) { last = ms; draw(ms / 1000); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- タップ ----
cv.addEventListener('click', e => {
  const rc = cv.getBoundingClientRect();
  const lx = (e.clientX - rc.left) / (rc.width / 195);
  const ly = (e.clientY - rc.top) / (rc.height / 300);
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h) {
      select(r.kind, r.data);
      return;
    }
  }
});

// ---- DOM ----
const $ = id => document.getElementById(id);
function esc(s) { const d = document.createElement('span'); d.textContent = s ?? ''; return d.innerHTML; }

function select(kind, data) {
  selected = { kind, data };
  if (kind === 'project') {
    const p = data;
    const cls = p.category.startsWith('休眠') ? 'zzz' : (p.energy < 40 ? 'low' : '');
    $('d-title').textContent = `${p.name}　${p.industry}`;
    $('d-body').innerHTML =
      `<div class="row"><span class="k">区分</span> ${esc(p.category)}　<span class="k">自動航行</span> ${esc(p.autopilot)}</div>` +
      `<div class="row"><span class="k">元気（更新の鮮度）</span>${p.daysAgo != null ? `　${p.daysAgo}日前に活動` : ''}</div>` +
      `<div class="bar"><i class="${cls}" style="width:${Math.max(p.energy, 6)}%"></i></div>` +
      `<div class="row">${esc(p.status)}</div>` +
      `<div class="row"><span class="k">次の一手</span> ${esc(p.next)}</div>`;
  } else {
    const j = data;
    $('d-title').textContent = `${j.id}　クエスト`;
    $('d-body').innerHTML =
      `<div class="row">${esc(j.title)}</div>` +
      `<div class="row"><span class="k">${esc(j.meta)}</span></div>` +
      `<div class="row"><span class="tag ${j.state}">${esc(j.stateLabel)}</span>${j.state === 'proposed' ? 'しゃちょうの しょうにんを まっている！' : 'じゅんばんを まっている'}</div>`;
  }
  document.querySelectorAll('.qrow').forEach(el =>
    el.classList.toggle('sel', kind === 'job' && el.dataset.id === data.id));
}

// 上部バー
{
  const [y, mo, d] = (D.generatedAt || '').split('-').map(Number);
  const dateStr = y ? `${y}年${mo}月${d}日` : '';
  const nProposed = D.jobs.filter(j => j.state === 'proposed').length;
  $('topstat').innerHTML = `${dateStr}<br>${D.projects.length}社 ／ キュー${jobsLive.length}件${nProposed ? ' 承認待ち' : ''}`;
}

// フロアラベル・デスク名
{
  const lab = (top, text) => `<div class="flabel" style="top:${top}px; right:8px;">${text}</div>`;
  $('labels').innerHTML =
    lab(F.f6 * 2 - 6, '6F 本社') +
    lab(F.f5 * 2 - 6, `5F 連載 ${rensai.length}社`) +
    lab(F.f4 * 2 - 6, `4F 基幹 ${kikan.length + 1}社`) +
    lab(F.f3 * 2 - 6, `3F 展示${tenji.length}${kisetsu.length ? '・季節' + kisetsu.length : ''}`) +
    lab(F.f2 * 2 - 6, '2F 孵化器・倉庫') +
    lab(F.f1 * 2 - 6, '1F 搬入口') +
    deskSlots.map(s => `<div class="deskname" style="top:196px; left:${s.cx * 2}px;">${esc(short(s.p.name))}</div>`).join('');
}

// キューウィンドウ
{
  const rows = D.jobs.slice(0, 5).map(j =>
    `<div class="qrow" data-id="${esc(j.id)}"><span class="tag ${j.state}">${esc(j.stateLabel)}</span>${esc(j.id)} ${esc(j.title)}</div>`).join('');
  $('q-body').innerHTML = rows || '<div class="row">荷はありません（キューは空）</div>';
  document.querySelectorAll('.qrow').forEach(el =>
    el.addEventListener('click', () => {
      const j = D.jobs.find(x => x.id === el.dataset.id);
      if (j) select('job', j);
    }));
}

// 初期選択: いちばん元気な連載、なければ本社
select('project', rensai.slice().sort((a, b) => (b.energy ?? 0) - (a.energy ?? 0))[0] || hq || D.projects[0]);

// ============================================================
// タブ切替（ビル / 名簿 / クエスト）
// ============================================================
const VIEW_TITLES = { home: 'Bridgeビル', roster: 'グループ名簿', quests: 'クエスト帳' };
function showView(v) {
  if (!VIEW_TITLES[v]) v = 'home';
  currentView = v;
  ['home', 'roster', 'quests'].forEach(k => { $('view-' + k).hidden = (k !== v); });
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  $('toptitle').textContent = VIEW_TITLES[v];
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  window.scrollTo(0, 0);
}
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
window.addEventListener('hashchange', () => showView(location.hash.slice(1)));

// ============================================================
// 名簿ページ
// ============================================================
const CATCOLOR = { 基幹:'#4878c0', 連載:'#e8883d', 展示:'#8c68b8', 季節:'#38a0a0', 休眠:'#88807c', 孵化器:'#48a048' };
const hash = s => { let h = 5381; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };

function drawAvatar(canvas, p) {
  canvas.width = 16; canvas.height = 16;
  const a = canvas.getContext('2d');
  const R = (x, y, w, h, c) => { a.fillStyle = c; a.fillRect(x, y, w, h); };
  const shirt = p.name === 'bridge' ? '#8c3838' : (CATCOLOR[p.category] || '#c8b078');
  const hair = HAIR[hash(p.name) % HAIR.length];
  const sleeping = p.category.startsWith('休眠');
  R(4, 1, 8, 4, hair); R(3, 3, 2, 3, hair); R(11, 3, 2, 3, hair);
  R(4, 5, 8, 5, '#f0c8a0');
  if (sleeping) { R(5, 7, 2, 1, '#3a3028'); R(9, 7, 2, 1, '#3a3028'); }
  else { R(5, 6, 2, 2, '#3a3028'); R(9, 6, 2, 2, '#3a3028'); }
  R(3, 10, 10, 6, shirt); R(5, 10, 6, 2, '#f0c8a0');
}

function buildRoster() {
  const groups = [
    ['本社', hq ? [hq] : []],
    ['連載', rensai], ['基幹', kikan], ['季節', kisetsu],
    ['展示', tenji], ['孵化器', fukaki], ['休眠', kyumin],
  ].filter(([, arr]) => arr.length);
  $('panel-roster').innerHTML = groups.map(([label, arr]) => `
    <div class="win">
      <h2>${label}　${arr.length}社</h2>
      ${arr.map(p => `
        <div class="prow" data-name="${esc(p.name)}">
          <canvas></canvas>
          <div class="info">
            <div class="nm">${esc(p.name)}</div>
            <div class="role">${esc(p.industry)}</div>
          </div>
          <div class="side">
            <span class="ctag c${esc(p.category)}">${esc(p.category)}</span>
            <div class="minibar"><i class="${p.category.startsWith('休眠') ? 'zzz' : (p.energy < 40 ? 'low' : '')}" style="width:${Math.max(p.energy ?? 6, 6)}%"></i></div>
          </div>
        </div>
        <div class="pdetail" hidden>
          <span class="k">自動航行</span> ${esc(p.autopilot)}${p.daysAgo != null ? `　<span class="k">最終活動</span> ${p.daysAgo}日前` : ''}<br>
          ${esc(p.status)}<br>
          <span class="k">次の一手</span> ${esc(p.next)}
        </div>`).join('')}
    </div>`).join('');
  document.querySelectorAll('.prow').forEach(row => {
    const p = D.projects.find(x => x.name === row.dataset.name);
    drawAvatar(row.querySelector('canvas'), p);
    row.addEventListener('click', () => { const d = row.nextElementSibling; d.hidden = !d.hidden; });
  });
}
buildRoster();

// ============================================================
// クエスト帳（チェックは端末メモ → 「報告をコピー」でClaudeへ round-trip）
// ============================================================
const LS_CHECKS = 'bsim_checks', LS_ADDED = 'bsim_added';
const store = k => { try { return JSON.parse(localStorage.getItem(k)) || (k === LS_ADDED ? [] : {}); } catch { return k === LS_ADDED ? [] : {}; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const taskId = t => 'T' + hash(t.section + t.text).toString(36);

function buildQuests() {
  const checks = store(LS_CHECKS);
  const added = store(LS_ADDED);
  const tasks = D.tasks || [];
  const openTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);

  const jobRow = j => {
    const closed = j.state === 'done';
    const memo = !!checks[j.id];
    return `<div class="trow ${closed || memo ? 'dn' : ''}">
      ${closed ? '<input type="checkbox" checked disabled>' : `<input type="checkbox" data-id="${esc(j.id)}" ${memo ? 'checked' : ''}>`}
      <span class="txt"><span class="tag ${j.state}">${esc(j.stateLabel)}</span>${esc(j.id)} ${esc(j.title)}</span>
    </div>`;
  };
  const taskRow = t => {
    const id = taskId(t);
    const memo = !!checks[id];
    return `<div class="trow ${t.done || memo ? 'dn' : ''}">
      ${t.done ? '<input type="checkbox" checked disabled>' : `<input type="checkbox" data-id="${esc(id)}" ${memo ? 'checked' : ''}>`}
      <span class="txt">${esc(t.text)}<span class="sec">${esc(t.section)}</span></span>
    </div>`;
  };

  $('panel-quests').innerHTML = `
    <div class="win qsec">
      <h2>クエスト（キュー）</h2>
      ${D.jobs.map(jobRow).join('') || '<div class="row">キューは空です</div>'}
    </div>
    <div class="win qsec">
      <h2>経営のやること</h2>
      ${openTasks.map(taskRow).join('') || '<div class="row">未着手はありません</div>'}
      ${doneTasks.length ? `<div class="note" style="margin-top:6px;">済み ${doneTasks.length}件は台帳に記録済み</div>` : ''}
    </div>
    <div class="win qsec">
      <h2>ローカルメモ</h2>
      ${added.map((m, i) => `<div class="trow"><input type="checkbox" checked disabled><span class="txt">${esc(m)}</span><button class="pixbtn" data-del="${i}">×</button></div>`).join('') || '<div class="note">思いついたやることをここに書き留め、下のボタンでまとめてClaudeへ。</div>'}
      <div class="addrow"><input id="addinput" maxlength="120" placeholder="やることを追加（端末メモ）"><button class="pixbtn" id="addbtn">追加</button></div>
    </div>
    <div class="win qsec">
      <h2>報告</h2>
      <div class="note">チェックや追加はこの端末のメモです（台帳はまだ変わりません）。<br>「報告をコピー」→ Claudeに貼って一言で、正式に台帳へ反映されます。</div>
      <div class="addrow"><button class="pixbtn orange" id="copybtn" style="flex:1;">報告をコピー</button></div>
    </div>`;

  $('panel-quests').querySelectorAll('input[type=checkbox][data-id]').forEach(cb =>
    cb.addEventListener('change', () => {
      const c = store(LS_CHECKS);
      if (cb.checked) c[cb.dataset.id] = true; else delete c[cb.dataset.id];
      save(LS_CHECKS, c); buildQuests();
    }));
  $('panel-quests').querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => {
      const a = store(LS_ADDED); a.splice(Number(btn.dataset.del), 1); save(LS_ADDED, a); buildQuests();
    }));
  $('addbtn').addEventListener('click', () => {
    const v = $('addinput').value.trim();
    if (!v) return;
    const a = store(LS_ADDED); a.push(v); save(LS_ADDED, a); buildQuests();
  });
  $('copybtn').addEventListener('click', copyReport);
}

function copyReport() {
  const checks = store(LS_CHECKS);
  const added = store(LS_ADDED);
  const doneJobs = D.jobs.filter(j => checks[j.id]);
  const doneTasks = (D.tasks || []).filter(t => !t.done && checks[taskId(t)]);
  const lines = [`【Bridge Sim 報告 ${D.generatedAt}】`];
  if (doneJobs.length || doneTasks.length) {
    lines.push('対応済みにしたい:');
    doneJobs.forEach(j => lines.push(`- ${j.id} ${j.title}`));
    doneTasks.forEach(t => lines.push(`- [${t.section}] ${t.text}`));
  }
  if (added.length) {
    lines.push('やることに追加したい:');
    added.forEach(m => lines.push(`- ${m}`));
  }
  if (lines.length === 1) { lines.push('（メモはありません）'); }
  const text = lines.join('\n');
  const done = () => { $('copybtn').textContent = 'コピーしました！'; setTimeout(() => { $('copybtn').textContent = '報告をコピー'; }, 1600); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done);
  else {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); done();
  }
}
buildQuests();

// 初期ビュー（URLの#を尊重）
showView(location.hash.slice(1) || 'home');
