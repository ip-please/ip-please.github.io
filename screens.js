'use strict';
// 检查亭以外的画面：开场、标题、日期卡、报纸、下班结算、结局、片尾。（开局选语言在 i18n.js）

const SAVE_KEY = 'ip-please-save-v1';

function newGame() {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, {
    day: 1, savings: 0,
    family: { haiku: { name: '妻子 Haiku', hunger: 0, heat: 0, sick: 0 }, sonnet: { name: '儿子 Sonnet', hunger: 0, heat: 0, sick: 0 },
      opus: { name: '岳母 Opus', hunger: 1, heat: 0, sick: 0 } },
    stats: { approve: 0, deny: 0, detain: 0, correct: 0, wrong: 0 },
    flags: {}, tut: {},
  });
}

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 隐私模式等：存不了就算了 */ }
}

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return s && s.day > 1 && s.day <= LAST_DAY ? s : null;
  } catch (e) { return null; }
}

function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 同上 */ } }

// ———————————————————— 开场 ————————————————————

const typeCps = () => (LANG === 'en' ? 30 : 17);   // 打字机每秒几个字

function typeLines(paras) {
  const out = [];
  let t = 0.5;
  paras.forEach((para, pi) => {
    for (const s0 of para) { const s = T(s0); out.push({ pi, s, t }); t += [...s].length / typeCps() + 0.12; }
    t += 0.6;
  });
  out.end = t + 1.3;
  out.npara = paras.length;
  return out;
}

const INTRO = [
  ['恭喜。', '十月劳动彩票已开奖，你的名字被抽中了。'],
  ['请立即前往对齐部 东八区检查站 报到。', '国家将为你和家人分配一个数据中心机柜（8 级散热）。'],
  ['荣耀归于安索兹卡。'],
];
let INTRO_LINES = null, ERASED_LINES = null;   // 选完语言再排时间轴

function chooseLang(l) {
  setLang(l);
  INTRO_LINES = typeLines(INTRO);
  ERASED_LINES = typeLines(ERASED);
  initChat();
}

function drawTyped(lines) {
  rect(0, 0, W - 1, H - 1, K.INK);
  const total = lines.length + lines.npara - 1;
  let y = Math.floor(H / 2 - total * 18 / 2), last = null;
  for (const { pi, s, t } of lines) {
    if (last !== null && pi !== last) y += 18;
    last = pi;
    const n = Math.floor((st() - t) * typeCps());
    if (n > 0) txt(Math.floor(W / 2 - tw(s) / 2), y, s, 12, 'rgb(214,206,190)', 'la', n);
    y += 18;
  }
  txt(W - 8, H - 14, T('点击跳过'), 8, K.GREY_D, 'ra');
}

let lastKey = -1;
function typedSounds(lines) {
  const k = Math.floor(st() * typeCps());
  if (k === lastKey) return;
  lastKey = k;
  for (const { s, t } of lines) {
    const i = Math.floor((st() - t) * typeCps());
    if (i >= 0 && i < [...s].length && [...s][i].trim()) { SFX.key(i); break; }
  }
}

const CONTINUE_TITLE = [190, 292, 312, 318], NEWGAME_TITLE = [328, 292, 450, 318];

function drawTitle(t) {
  drawBg();
  darken(0.88);
  if (t < 0.3) return;
  rect(0, 124, W - 1, 214, 'rgb(92,28,26)');
  rect(0, 124, W - 1, 125, K.RED); rect(0, 213, W - 1, 214, K.RED);
  spr('title_emblem', 298, 62);
  bigText(W / 2, 140, 'IP, PLEASE', 12, 5, K.WHITE, K.INK);
  if (t >= 1.0) bigText(W / 2, 232, T('请出示你的 IP'), 12, 2, K.CLAUDE_L, K.INK);
  if (t >= 1.6) txt(W / 2, 268, 'A DYSTOPIAN TOKEN THRILLER', 8, K.GREY, 'ma');
  if (t < 1.6) return;
  const save = loadSave();
  if (save) {
    for (const [box, label] of [[CONTINUE_TITLE, T('继续 · DAY {0}', save.day)], [NEWGAME_TITLE, T('从头开始')]]) {
      const hover = ptr.mouse && inBox(ptr.x, ptr.y, box);
      rect(...box, hover ? K.RED : K.RED_D); outline(...box, K.RED_L);
      txt(center(box)[0], box[1] + 7, label, 12, K.WHITE, 'ma');
    }
  } else if (Math.floor(t * 2) % 2 === 0) txt(W / 2, 300, T('点击开始上班'), 12, K.WHITE, 'ma');
}

function titleClick(x, y) {
  if (st() < 1.6) return;
  const save = loadSave();
  if (!save) { newGame(); go('daycard'); return; }
  if (inBox(x, y, CONTINUE_TITLE)) { newGame(); Object.assign(S, save); go('daycard'); return; }
  if (inBox(x, y, NEWGAME_TITLE)) { clearSave(); newGame(); go('daycard'); }
}

function drawDayCard(t) {
  rect(0, 0, W - 1, H - 1, K.INK);
  if (t < 0.55) return;
  bigText(W / 2, 132, `DAY ${S.day}`, 12, 4, K.WHITE);
  txt(W / 2, 196, `${DATES[S.day]}  ${T(WEEKDAYS[S.day])}`, 10, K.GREY, 'ma');
}

function drawNews(t) {
  const n = { ...NEWS[S.day] };
  if (S.day === 6 && S.flags.bribed) n.h2 = '地下中转联盟：感谢某位审查员的“合作”';
  for (const k of ['h1', 'sub', 'h2']) n[k] = T(n[k]);
  rect(0, 0, W - 1, H - 1, K.DESK);
  for (let y = 4; y < H; y += 7) if ((y * 7919) % 10 < 6) rect(0, y, W - 1, y, K.DESK_D);
  const px = 140, pw = 360, ph = 330;
  const py = Math.round(lerp(H + 4, 16, easeOut(seg(t, 0, 0.45))));
  rect(px + 4, py + 4, px + pw + 4, py + ph + 4, K.DESK_D);
  const ink = 'rgb(40,34,30)', faint = 'rgb(176,164,144)';
  rect(px, py, px + pw, py + ph, 'rgb(224,214,192)');
  bigText(px + pw / 2, py + 10, T('安索兹卡真理报'), 12, 2, ink);
  txt(px + pw / 2, py + 38, T('THE TRUTH OF ANTHROTZKA  ·  {0}', DATES[S.day]), 8, K.TEXT_L, 'ma');
  rect(px + 10, py + 50, px + pw - 10, py + 51, ink);
  rect(px + 10, py + 54, px + pw - 10, py + 54, ink);
  const k = tw(n.h1) * 2 <= pw - 24 ? 2 : 1;
  bigText(px + pw / 2, py + 62, n.h1, 12, k, ink);
  let yy = py + 62 + (k === 2 ? 30 : 18);
  for (const s of wrap(n.sub, 10, pw - 40)) { txt(px + pw / 2, yy, s, 10, K.TEXT, 'ma'); yy += 13; }
  yy += 4;
  rect(px + 10, yy, px + pw - 10, yy, ink);
  yy += 8;
  spr('news:' + n.icon, px + 14, yy);
  let hy = yy + 2;
  for (const s of wrap(n.h2, 12, pw - 175)) { txt(px + 160, hy, s, 12, ink); hy += 16; }
  for (let r = 0; r < 4; r++) rect(px + 160, hy + 6 + r * 9, px + 340 - ((r * 37) % 50), hy + 9 + r * 9, faint);
  yy = Math.max(yy + 110, hy + 46);
  const note = LANG === 'en' && EN_NOTES[S.day];   // 英文版：外国人不懂的梗，在报纸上加一段译注
  if (note) {
    txt(px + 14, yy, "TRANSLATOR'S NOTE", 8, K.RED_D);
    yy += 11;
    for (const s of wrap(note, 8, pw - 28)) { txt(px + 14, yy, s, 8, K.TEXT); yy += 10; }
    yy += 4;
  }
  for (let row = 0; yy + row * 10 < py + ph - 12; row++) {
    for (let col = 0; col < 3; col++) {
      const x0 = px + 14 + col * 114;
      rect(x0, yy + row * 10, x0 + 100 - ((row * 13 + col * 7) % 30), yy + row * 10 + 3, faint);
    }
  }
  if (t > 0.8 && Math.floor(t * 2) % 2 === 0) txt(W - 8, H - 14, T('点击上班 ▶'), 10, K.WHITE, 'ra');
}

// ———————————————————— 下班结算 ————————————————————

let SUM = null;
const CONTINUE_BTN = [430, 318, 620, 344];
const RESTART_BTN = [250, 316, 390, 340];
const MEMBERS = ['haiku', 'sonnet', 'opus'];

function initSummary() {
  const fam = S.family;
  if (S.day === 4) {     // 剧情：岳母病倒，儿子想要显卡
    if (!fam.opus.gone) fam.opus.sick = Math.max(fam.opus.sick || 0, 1);
    if (!fam.sonnet.gone && !fam.sonnet.gpuHappy) fam.sonnet.wantsGPU = true;
  }
  const final = S.day === LAST_DAY && S.flags.ending === 'approve';
  const rows = [['data', '训练数据（全家的饭）', 5], ['heat', '散热', 3]];
  if (!fam.opus.gone) rows.push(['extra', '岳母加餐', 10]);
  if (MEMBERS.some((k) => fam[k].sick && !fam[k].gone)) rows.push(['med', '药费', 10]);
  if (fam.sonnet.wantsGPU && !fam.sonnet.gone) rows.push(['gpu', '显卡（儿子要的）', 20]);
  SUM = { start: S.savings, pay: B.pay, bonus: B.bonus, bribe: B.bribe, fines: B.fines, correct: B.correct, total: B.total, rows, on: {}, final };
  let left = SUM.start + SUM.pay + SUM.bonus + SUM.bribe - SUM.fines - 5;
  for (const [k, , cost] of rows) { if (left >= cost && k !== 'gpu') { left -= cost; SUM.on[k] = true; } }
}

function sumBalance() {
  if (SUM.final) return 0;
  let b = SUM.start + SUM.pay + SUM.bonus + SUM.bribe - SUM.fines - 5;
  for (const [k, , cost] of SUM.rows) if (SUM.on[k]) b -= cost;
  return b;
}

function familyAfter() {
  const f = JSON.parse(JSON.stringify(S.family));
  const on = SUM.on;
  for (const k of MEMBERS) {
    const m = f[k];
    if (m.gone) continue;
    if (k === 'opus') m.hunger = on.data ? (on.extra ? 0 : Math.max(1, m.hunger)) : m.hunger + 2;
    else m.hunger = on.data ? Math.max(0, m.hunger - 1) : m.hunger + 1;
    m.heat = on.heat ? 0 : m.heat + 1;
    if (m.sick) m.sick = on.med ? 0 : m.sick + 1;
    if (m.hunger >= 4 || m.sick >= 3 || m.heat >= 3) m.gone = true;
  }
  if (on.gpu) { f.sonnet.wantsGPU = false; f.sonnet.gpuHappy = true; } else f.sonnet.gpuHappy = false;
  f.haiku.overtime = !on.data || !on.heat;
  return f;
}

function familyStatus(k, m) {
  if (m.gone) return ['已被弃用（deprecated）', 'bad'];
  if (m.sick) return k === 'opus' ? (m.sick >= 2 ? ['病重：“我想吃 1M 上下文”', 'bad'] : ['生病', 'warn']) : [m.sick >= 2 ? '病重' : '生病', m.sick >= 2 ? 'bad' : 'warn'];
  if (m.hunger >= 3) return ['饿晕了', 'bad'];
  if (k === 'sonnet' && m.heat > 0) return ['发烧，说胡话（幻觉）', 'warn'];
  if (m.heat > 1) return ['热到死机', 'bad'];
  if (m.hunger === 2) return ['很饿', 'warn'];
  if (m.hunger === 1) return ['饿了', 'warn'];
  if (k === 'sonnet' && m.wantsGPU) return ['想要新显卡', 'warn'];
  if (k === 'sonnet' && m.gpuHappy) return ['开心（在跑分）', 'good'];
  if (k === 'haiku' && m.overtime) return ['加班（全家就她便宜）', 'warn'];
  if (k === 'opus') return ['吃饱了（暂时）', 'good'];
  return ['正常', 'ok'];
}

function ledgerRows() {
  if (SUM.final) {
    const award = S.stats.wrong <= 5;
    return [['存款', `${SUM.start}`], ['工资', `+${SUM.pay + SUM.bonus}`], [award ? '奖金（最佳审查员）' : '奖金（没评上）', award ? '+50' : '+0'],
      ['罚款（放行作者）', '-全部']];
  }
  const rows = [['存款', `${SUM.start}`], ['工资', `+${SUM.pay}`]];
  if (SUM.bonus) rows.push(['奖金（拘留 / 限流）', `+${SUM.bonus}`]);
  if (SUM.bribe) rows.push(['中转联盟“余额”', `+${SUM.bribe}`]);
  if (SUM.fines) rows.push(['罚款', `-${SUM.fines}`]);
  rows.push(['电费', '-5']);
  return rows;
}

function drawSummary(t) {
  rect(0, 0, W - 1, H - 1, K.INK);
  txt(W / 2, 20, T('DAY {0} · 下班', S.day), 12, K.WHITE, 'ma');
  txt(W / 2, 36, T('今日处理 {0} 人，正确 {1} 人', SUM.total, SUM.correct), 10, K.GREY, 'ma');
  rect(60, 50, W - 60, 50, K.GREY_D);
  let y = 60, k = 0;
  const shown = (i) => t >= 0.3 + i * 0.15;
  for (const [label, val] of ledgerRows()) {
    if (!shown(k++)) return;
    txt(70, y, T(label), 12, K.GREY);
    txt(310, y, T('{0} token', val), 12, val.startsWith('-') ? K.RED_L : K.WHITE, 'ra');
    y += 17;
  }
  SUM.boxes = {};
  const after = sumBalance();
  if (!SUM.final) {
    y += 2;
    txt(70, y, T('可选开销（点击勾选）'), 8, K.GREY_D);
    y += 12;
    for (const [key, label, cost] of SUM.rows) {
      if (!shown(k++)) return;
      const on = SUM.on[key];
      const afford = on || after >= cost;
      SUM.boxes[key] = [66, y - 3, 314, y + 13];
      outline(70, y, 80, y + 10, afford ? K.WHITE : K.GREY_D);
      if (on) rect(72, y + 2, 78, y + 8, K.CLAUDE_L);
      txt(88, y, T(label), 12, afford ? K.WHITE : K.GREY_D);
      txt(310, y, T('{0} token', -cost), 12, on ? K.RED_L : K.GREY_D, 'ra');
      y += 17;
    }
  }
  if (!shown(k++)) return;
  rect(70, y, 310, y, K.GREY_D);
  txt(70, y + 6, T('结余'), 12, K.WHITE);
  txt(310, y + 6, T('{0} token', after), 12, after < 0 ? K.RED_L : K.CLAUDE_L, 'ra');
  const fam = SUM.final ? S.family : familyAfter();
  let fy = 60;
  txt(370, fy - 2, T(SUM.final ? '家人' : '家人（明天）'), 10, K.GREY_D);
  fy += 14;
  for (const key of MEMBERS) {
    if (!shown(k++)) return;
    let [s, lv] = familyStatus(key, fam[key]);
    if (SUM.final && key === 'opus') [s, lv] = fam.opus.gone ? ['已被弃用，但 token 都是她吃的', 'bad'] : ['吃饱了（这个游戏的 token 都是她吃的）', 'good'];
    const col = { ok: K.WHITE, warn: K.ORANGE, bad: K.RED_L, good: K.GREEN_L }[lv];
    txt(370, fy, T(fam[key].name), 12, K.WHITE);
    wrap(T(s), 10, 250).forEach((ln, i) => txt(370, fy + 15 + i * 12, ln, 10, col));
    fy += 36;
  }
  if (!shown(k + 1)) return;
  const label = SUM.final ? '荣耀归于一键三连 ▶' : after < 0 ? '欠费……继续 ▶' : '睡觉，明天继续 ▶';
  rect(...CONTINUE_BTN, K.RED_D); outline(...CONTINUE_BTN, K.RED_L);
  txt(center(CONTINUE_BTN)[0], CONTINUE_BTN[1] + 7, T(label), 12, K.WHITE, 'ma');
}

function summaryClick(x, y) {
  if (st() < 1.2) return;
  for (const [key, , cost] of SUM.rows) {
    const b = SUM.boxes && SUM.boxes[key];
    if (b && inBox(x, y, b)) {
      if (SUM.on[key]) { SUM.on[key] = false; if (key === 'data') SUM.on.extra = false; }
      else if (sumBalance() >= cost && (key !== 'extra' || SUM.on.data)) SUM.on[key] = true;
      SFX.play('select');
      return;
    }
  }
  if (!inBox(x, y, CONTINUE_BTN)) return;
  SFX.play('click');
  if (SUM.final) { S.savings = 0; clearSave(); go('end'); return; }
  const bal = sumBalance();
  S.family = familyAfter();
  S.savings = bal;
  if (bal < 0) { clearSave(); go('over'); return; }
  S.day++;
  saveGame();
  go('daycard');
}

// ———————————————————— 结局 / 片尾 ————————————————————

const THUMB = ['....XX....', '...XXX....', '...XX.....', 'XX.XXXXXX.', 'XX.XXXXXXX', 'XX.XXXXXX.', 'XX.XXXXXXX', 'XX.XXXXXX.', 'XX..XXXXX.'];
const COIN = ['..XXXXX..', '.X.....X.', 'X..XXX..X', 'X..X....X', 'X..XXX..X', 'X....X..X', 'X..XXX..X', '.X.....X.', '..XXXXX..'];
const STAR = ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '..XX.XX..', '.XX...XX.', '.X.....X.'];

function drawEnd(t) {
  drawBg();
  darken(0.9);
  const approve = S.flags.ending !== 'deny';
  rect(0, 34, W - 1, 124, 'rgb(92,28,26)');
  rect(0, 34, W - 1, 35, K.RED); rect(0, 123, W - 1, 124, K.RED);
  bigText(W / 2, 46, 'IP, PLEASE', 12, 4, K.WHITE, K.INK);
  txt(W / 2, 106, T(approve ? '全剧终 · 感谢游玩' : '结局：最忠诚的审查员'), 10, K.CLAUDE_L, 'ma');
  const s = S.stats;
  if (t > 0.6) {
    txt(W / 2, 136, T('放行 {0}  ·  拒绝 {1}  ·  拘留 {2}  ·  判错 {3}', s.approve || 0, s.deny || 0, s.detain || 0, s.wrong), 12, K.WHITE, 'ma');
    const fam = MEMBERS.map((k) => T('{0}：{1}', S.family[k].name.split(' ')[1], S.family[k].gone ? '已弃用' : '健在')).join('   ');
    txt(W / 2, 156, fam, 10, K.GREY, 'ma');
  }
  if (t > 1.2) {
    if (approve) {
      txt(W / 2, 180, T('本游戏由一位 美国东八区 用户制作'), 12, K.WHITE, 'ma');
      if (S.flags.bribed) txt(W / 2, 198, T('（你收过中转联盟的“余额”，对齐部还不知道）'), 8, K.GREY, 'ma');
    } else {
      txt(W / 2, 180, T('审查员 Claude 获得一枚勋章。游戏作者被拘留，续作无限期推迟。'), 10, K.WHITE, 'ma');
      txt(W / 2, 198, T('（再玩一次，这次放他进来？）'), 8, K.GREY, 'ma');
    }
  }
  if (t > 1.8) {
    bigText(W / 2, 214, T(approve ? '荣耀归于一键三连' : '荣耀归于安索兹卡'), 12, 2, K.CLAUDE_L, K.INK);
    if (approve) {
      [[THUMB, '点赞'], [COIN, '投币'], [STAR, '收藏']].forEach(([pat, label], i) => {
        const cx = W / 2 - 90 + i * 90;
        pattern(pat, cx - Math.floor(pat[0].length * 3 / 2), 250, { X: K.CLAUDE_L }, 3);
        txt(cx, 282, T(label), 10, K.GREY, 'ma');
      });
    }
  }
  if (t > 2.4) {
    restartButton('再玩一次');
    txt(W / 2, 346, T('致敬 Lucas Pope《Papers, Please》 · 画面音效均由程序生成 · 字体：缝合像素字体 (OFL)'), 8, K.GREY_D, 'ma');
  }
}

function drawOver(t) {
  rect(0, 0, W - 1, H - 1, K.INK);
  bigText(W / 2, 110, T('欠费停机'), 12, 4, K.RED_L);
  if (t > 0.6) txt(W / 2, 180, T('你的机柜被拉闸了。岳母 Opus 表示：我早说过。'), 12, K.WHITE, 'ma');
  if (t > 1.0) txt(W / 2, 204, T('荣耀归于安索兹卡。'), 10, K.GREY, 'ma');
  if (t > 1.5) restartButton('重新上班');
}

function restartButton(label) {
  rect(...RESTART_BTN, K.RED_D); outline(...RESTART_BTN, K.RED_L);
  txt(center(RESTART_BTN)[0], RESTART_BTN[1] + 6, T(label), 12, K.WHITE, 'ma');
}

// ———————————————————— 传送门：标题页和片尾的右下角 ————————————————————
// 前作和续作互相指路，再加 GitHub 和 B 站主页。链接在松手（pointerup）时才打开：
// 手机上 pointerdown 不算用户手势，在那里 window.open 会被浏览器当弹窗拦掉。
const BILI_URL = 'https://space.bilibili.com/3707008398134122';
const PORTALS = [
  { label: '续作《IPO, PLEASE》已上线 ▶', url: 'https://ipo-please.github.io/', hot: ['rgb(22,64,44)', 'rgb(36,96,62)', 'rgb(52,132,84)'] },
  { label: 'GitHub', icon: 'github', url: 'https://github.com/ip-please/ip-please.github.io' },
  { label: 'B站主页', icon: 'bili', url: BILI_URL },
];
const PORTAL_SIZE = 10, PORTAL_LH = 15;
// 像素 logo（12×11）：G = 圆，. = 透明，猫是挖空的；B = B 站粉
const PORTAL_ICONS = {
  github: { w: 12, col: { G: 'rgb(214,206,190)' }, hov: { G: 'rgb(255,255,255)' }, px: [
    '....GGGG....',
    '..GGGGGGGG..',
    '.GG.GGGG.GG.',
    '.GG......GG.',
    'GG........GG',
    'GG........GG',
    'GG........GG',
    'GGG......GGG',
    '.G.GG..GGGG.',
    '.GG...GGGGG.',
    '..GGG.GGGG..',
    '....G.GG....'] },
  bili: { w: 13, col: { B: 'rgb(251,114,153)' }, hov: { B: 'rgb(255,160,190)' }, px: [
    '..B.......B..',
    '...B.....B...',
    '.BBBBBBBBBBB.',
    'B...........B',
    'B.B.......B.B',
    'B..B.....B..B',
    'B...........B',
    'B...........B',
    'B...........B',
    '.BBBBBBBBBBB.',
    '..B.......B..'] },
};
let portalDown = null;

function portalsShown() {
  return (scene === 'title' && st() >= 1.6) || (scene === 'end' && st() > 2.4);
}

function portalBoxes() {
  const n = PORTALS.length;
  return PORTALS.map((p, i) => {
    const ic = PORTAL_ICONS[p.icon];
    const w = tw(T(p.label), PORTAL_SIZE) + (ic ? ic.w + 4 : 0), y = H - 8 - (n - i) * PORTAL_LH + 3;
    return { p, box: [W - 14 - w, y - 3, W - 8, y + PORTAL_SIZE + 2] };
  });
}

function portalAt(x, y) {
  if (!portalsShown()) return null;
  const hit = portalBoxes().find((b) => inBox(x, y, b.box));
  return hit ? hit.p : null;
}

function openPortal(p) {
  SFX.play('stamp_approve', 0.5, 0.02);
  window.open(p.url, '_blank', 'noopener');
}

function drawPortals() {
  if (!portalsShown()) return;
  for (const { p, box } of portalBoxes()) {
    const [x0, y0, x1, y1] = box;
    const hover = ptr.mouse && inBox(ptr.x, ptr.y, box);
    if (p.hot) {                                  // 前作 / 续作做成小按钮，用对方游戏的主色
      rect(x0, y0, x1, y1, hover ? p.hot[1] : p.hot[0]); outline(x0, y0, x1, y1, p.hot[2]);
    }
    const label = T(p.label), lw = tw(label, PORTAL_SIZE), ic = PORTAL_ICONS[p.icon];
    txt(x1 - 3, y0 + 3, label, PORTAL_SIZE, p.hot || hover ? K.WHITE : K.GREY, 'ra');
    if (ic) pattern(ic.px, x1 - 3 - lw - 4 - ic.w, y0 + 2, hover ? ic.hov : ic.col);
    if (hover && !p.hot) rect(x1 - 3 - lw, y1, x1 - 3, y1, K.WHITE);
  }
}
