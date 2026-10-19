'use strict';
// 检查亭：旅客进出、证件、盖章、检查模式、测谎、X 光。画面布局沿用 pp/booth.py 的坐标。

const WIN = [8, 134, 210, 262], WIN_W = 203, WIN_H = 129, WIN_CX = 101;
const SPEAKER = [6, 290, 24, 306];
const DETAIN_BTN = [172, 268, 212, 280];
const QUIZ_BTN = [126, 268, 166, 280];
const INSPECT_BTN = [602, 322, 634, 354];
const XRAY_BTN = [566, 322, 598, 354];
const RULE_BTN = [530, 322, 562, 354];
const ASK_BTN = [548, 140, 590, 162];
const BANNER_BOX = [300, 134, 598, 168];
const TRAY_Y0 = 196, TRAY_Y1 = 252, TRAY_W = 170, TRAY_X = W - TRAY_W;
const MARK_XY = { approve: [483, 220], deny: [562, 220] };
const BOOTH_POS = [312, 117], QUEUE_FRONT = [292, 102];
const PRINT_X = 240;
const BOOK_BOX = [500, 306, 556, 359];
const DESK = [220, 128, W - 1, H - 1];
const BANNER1_X = 70;

// —— 全局状态（各脚本共用） ——
let canvasEl, F, now = 0;    // F：离屏画布（整帧先画在这里，再合成到屏幕）
let uiLang = 'orig';
try { if (localStorage.getItem('ip-please-ui-lang') === 'zh') uiLang = 'zh'; } catch (e) { /* 隐私模式：不记语言 */ }
function syncLangButton() {
  const b = document.getElementById('lang');
  if (b) b.textContent = uiLang === 'zh' ? '旅客译文' : '旅客原话';
}
function toggleUiLang() {
  uiLang = uiLang === 'zh' ? 'orig' : 'zh';
  try { localStorage.setItem('ip-please-ui-lang', uiLang); } catch (e) { /* 同上 */ }
  syncLangButton();
}
function shown(ln) { return ln && !ln.raw && uiLang === 'zh' && ln.zh ? ln.zh : ln.text; }
const S = {};                // 跨天的存档
let B = null;                // 当天检查亭的状态
const ptr = { x: 320, y: 180, mouse: false, down: false };
let drag = null;
let scene = 'boot', sceneT0 = 0;
const st = () => now - sceneT0;

// ———————————————————— 一天 ————————————————————

function startDay() {
  B = {
    queue: buildQueue(S.day), idx: 0, ent: null, docs: [], lines: [], timers: [],
    tray: { open: false, t: -9 }, presses: [], shake: -9,
    insp: { on: false, sel: [], banner: null, all: false },
    xray: { on: false, t: -9 }, printing: null, printQueue: [], effects: [], slams: [],
    ruleInst: null, rulePos: [228, 136], ruleOpened: false, speakerT: -9, fightT: -9, harmlessT: -9,
    pay: 0, bonus: 0, bribe: 0, fines: 0, cites: 0, correct: 0, total: 0, flash: null, clock0: now,
    ending: false, event: null, cut: null, closeup: null, lastFinish: now, tensionSrc: null, allTokens: false,
  };
}

function later(dt, fn) { B.timers.push({ t: now + dt, fn }); }

function runTimers() {
  const due = B.timers.filter((x) => x.t <= now);
  if (!due.length) return;
  B.timers = B.timers.filter((x) => x.t > now);
  due.sort((a, b) => a.t - b.t).forEach((x) => x.fn());
}

function say(who, text, opt) {
  const e = B.ent;
  opt = opt || {};
  if (who === 'E' && e && e.spec && e.spec.tongue && e.spec.tongue !== 'zh' && hasHan(text)) text = papersLeft(e.spec.tongue);
  const raw = !!opt.raw || !!(who === 'E' && e && e.spec && e.spec.rawSpeech);
  const zh = raw ? text : glossLine(text);
  B.lines.push({ t: now, who, text, zh, raw, ent: e });
  const pitch = who === 'C' ? 176 : who === 'Q' ? 160 : (e ? e.spec.voice : 125);
  SFX.mumble(text, pitch, B.lines.length * 7 + S.day);
  if (who === 'E' && e) e.talkUntil = now + Math.min(1.3, 0.25 + 0.065 * [...text].length);
}

// 按顺序播放一串台词/动作，返回总时长
function runSteps(steps, delay = 0) {
  let t = delay;
  const e = B.ent;
  for (const s0 of steps || []) {
    let who, text, o;
    if (Array.isArray(s0)) [who, text, o] = s0; else o = s0;
    o = o || {};
    later(t, () => {
      if (B.ent !== e) return;
      if (e) {
        if (o.expr) e.expr = o.expr;
        if (o.sweat && e.sweatT === null) e.sweatT = now;
        if (o.slip) { e.slip = true; e.expr = 'shock'; }
      }
      if (o.fight) { B.fightT = now; SFX.play('fight'); }
      if (text) say(who, text);
    });
    const len = text ? [...text].length : 0;
    t += o.hold !== undefined ? o.hold : Math.max(0.9, 0.4 + 0.085 * len);
  }
  if (e) e.busyUntil = Math.max(e.busyUntil || 0, now + t);
  return t;
}

function newEntrant(spec, instant) {
  return {
    spec, tEnter: instant ? now - 1 : now + 0.35, phase: instant ? 'here' : 'enter',
    expr: ASSETS.people[spec.person].expr, talkUntil: 0, sweatT: null, slip: false, busyUntil: 0,
    decided: null, asked: new Set(), found: new Set(), quizDone: [], docs: [], placed: new Set(), instant, suspect: false,
  };
}

const nextItem = () => B.queue[B.idx];
const isEvent = (it) => it && it.type;

function callNext() {
  SFX.play('click');
  if (B.ent || B.event || B.cut || B.closeup || B.ending || B.idx >= B.queue.length) return;
  if (isEvent(nextItem())) { startEvent(B.queue[B.idx++]); return; }
  B.speakerT = now;
  SFX.play('intercom', 1, 0.03);
  say('C', '下一位！');
  S.tut.called = true;
  const spec = B.queue[B.idx++];
  const e = newEntrant(spec, false);
  B.ent = e;
  for (let i = 0; i < 4; i++) later(0.41 + i * 0.19, () => SFX.step(i));
  later(1.15, () => {
    if (B.ent !== e) return;
    e.phase = 'here';
    if (spec.tension) B.tensionSrc = SFX.play('tension', 0.9);
    const t = runSteps(spec.intro);
    later(t + (spec.intro.length ? 0 : 0.4), () => handDocs(e));
  });
}

function handDocs(e) {
  if (B.ent !== e) return;
  SFX.paper(S.day);
  if (e.spec.docs.some((d) => d.key === 'pp')) later(0.1, () => SFX.play('thud', 0.5));
  e.docs = e.spec.docs.map(({ key, doc }, i) => {
    const inst = { doc, key, owner: 'ent', big: false, x: 48 + i * 24, y: 265, slot: [48 + i * 24, 265], marks: [] };
    B.docs.push(inst);
    return inst;
  });
  e.handed = true;
  if (e.spec.after) runSteps(e.spec.after, 0.3);
}

const decisionOf = (inst) => (inst.marks.length ? inst.marks[inst.marks.length - 1].kind : null);
function primaryOf(e) { return e.docs.find((d) => d.key === e.spec.primary); }

function checkLeave() {
  const e = B.ent;
  if (!e || e.phase !== 'here') return;
  const prim = primaryOf(e);
  if (!prim || !prim.returned) return;
  if (B.docs.some((d) => d.owner === 'ent' && d.big && !d.loose)) {
    if (!e.complained) { e.complained = true; say('E', papersLeft(e.spec.tongue || 'zh')); }
    return;
  }
  const dec = decisionOf(prim);
  e.phase = 'waiting';
  later(Math.max(0, e.busyUntil - now) + 0.2, () => leave(e, dec));
}

function leave(e, dec) {
  if (B.ent !== e) return;
  e.phase = 'leave'; e.tLeave = now; e.dir = dec === 'approve' ? 'right' : 'left';
  stopTension();
  for (let i = 0; i < 3; i++) later(i * 0.22, () => SFX.step(3 + i));
  later(0.15, () => { B.docs = B.docs.filter((d) => d.owner !== 'ent'); });
  later(0.65, () => finish(e, dec));
}

function detain() {
  const e = B.ent;
  SFX.play('click');
  if (!e || e.phase !== 'here' || !e.handed || B.event) return;
  e.phase = 'detained'; e.tDetain = now + 0.2; B.detainT = now;
  stopTension();
  SFX.play('detain');
  SFX.play('scuffle', 1, 0.2);
  later(1.2, () => { B.docs = B.docs.filter((d) => d.owner !== 'ent'); });
  later(1.7, () => finish(e, 'detain'));
}

function stopTension() { if (B.tensionSrc) { SFX.stop(B.tensionSrc); B.tensionSrc = null; } }

function finish(e, dec) {
  if (B.ent !== e) return;
  B.ent = null;
  B.lastFinish = now;
  if (!e.noJudge) judge(e, dec);
  const then = e.spec.then;
  if (then === 'closeup') { B.closeup = { t0: now }; SFX.play('thud'); }
  if (then === 'jorji5') afterJorji5(e, dec);
  if (then === 'ending') afterAuthor(dec);
  if (B.idx >= B.queue.length && !B.cut && then !== 'ending') endDaySoon();
}

function judge(e, dec) {
  const spec = e.spec;
  B.total++;
  S.stats[dec] = (S.stats[dec] || 0) + 1;
  if (spec.author) return;
  if (spec.bribe && dec === 'approve' && S.flags.sawNote) {
    B.bribe += 20; S.flags.bribed = true; B.harmlessT = now;
    later(0.8, () => flash('地下中转联盟：$20 余额已到账。合作愉快。'));
  }
  if (spec.ok.includes(dec)) {
    B.correct++; S.stats.correct++;
    B.pay += 5;
    if (dec === 'detain' && e.exposed) B.bonus += 5;
    return;
  }
  S.stats.wrong++;
  const lines = dec === 'approve' ? ['放行了不合规旅客', spec.reason || ''] :
    dec === 'detain' ? ['无故拘留合规旅客', '证件齐全，信息一致'] : ['拒绝了合规旅客', '证件齐全，信息一致'];
  if (dec === 'approve' && spec.hint) lines.push(spec.hint);
  cite(lines);
}

// 开一张警告单：每天第一张只警告，之后每张罚 5 token
function cite(lines, delay = 0.5) {
  B.cites++;
  if (B.cites > 1) B.fines += 5;
  lines.push(B.cites > 1 ? '罚款：5 token' : '首次警告，不扣 token');
  later(delay, () => printDoc(new Citation(lines), 1.1, 'cit'));
}

function printDoc(doc, dur, key) {
  if (B.printing) { B.printQueue.push([doc, dur, key]); return; }
  B.printing = { doc, t0: now, dur };
  SFX.printer(Math.round(dur * 10) / 10);
  later(dur, () => {
    B.printing = null;
    B.docs.push({ doc, key, owner: 'desk', big: true, x: PRINT_X, y: 131, marks: [] });
    if (key === 'cit') SFX.play('citation');
    if (B.printQueue.length) printDoc(...B.printQueue.shift());
  });
}

function endDaySoon() {
  if (B.ending) return;
  B.ending = true;
  const wait = B.printing ? 2 : 0;
  later(2.4 + wait, () => SFX.play('bell'));
  later(4.2 + wait, () => go('summary'));
}

function flash(text) { B.flash = { text, t: now }; }

// ———————————————————— 证件机关 ————————————————————

const NEST = [[124, 84, [24, 86, 96], '开曼'], [98, 66, [40, 96, 70], '维尔京'],
  [74, 50, [110, 40, 52], '香港'], [40, 28, [150, 30, 30], '中国']];

function onFirstPlace(d) {
  const e = B.ent;
  if (!e || d.owner !== 'ent' || e.placed.has(d)) return;
  e.placed.add(d);
  const trig = d.nest !== undefined ? 'nest' : e.spec.onPlace && e.spec.onPlace[d.key];
  if (trig === 'note') {
    const doc = new Note(['同志：', '明天放戴墨镜的人进去，', '我们给你 $20 余额。', '—— 地下中转联盟']);
    const [x, y] = clampDesk(d.x + 30, d.y + 70, doc);
    later(0.3, () => {
      B.docs.push({ doc, key: 'note', owner: 'desk', big: true, x, y, marks: [] });
      SFX.paper(11);
      S.flags.sawNote = true;
      flash('护照里掉出一张纸条（不想要就拖回窗口那边扔掉）');
    });
  } else if (trig === 'nest') {
    const k = d.nest === undefined ? 0 : d.nest + 1;
    if (k >= NEST.length) return;
    const [w, h, col, label] = NEST[k];
    const doc = new MiniPassport(w, h, col, label);
    const [x, y] = clampDesk(d.x + (d.doc.w - w) / 2 + 14, d.y + (d.doc.h - h) / 2 + 18, doc);
    later(0.35, () => {
      if (B.ent !== e) return;
      const inst = { doc, key: `m${k + 1}`, owner: 'ent', loose: true, nest: k, big: true, x, y, marks: [] };
      B.docs.push(inst);
      e.docs.push(inst);
      SFX.paper(13 + k);
      if (k === 0) flash('护照里夹着另一本护照……把它拖出来');
      if (k === NEST.length - 1) flash('……最里面这本，是哪里的？');
    });
  } else if (trig === 'accordion') {
    d.doc.unfoldT = now;
    for (let k = 0; k < 6; k++) later(k * 0.33, () => SFX.paper(20 + k));
  }
}

function clampDesk(x, y, doc) {
  return [Math.round(Math.max(DESK[0] + 4, Math.min(W - doc.w - 4, x))), Math.round(Math.max(DESK[1] + 4, Math.min(H - doc.h - 4, y)))];
}

// —— 盖章 ——
function trayU() {
  const { open, t } = B.tray;
  return open ? easeOut(seg(now, t, t + 0.3)) : 1 - smooth(seg(now, t, t + 0.25));
}
function trayX() { return Math.round(lerp(W, TRAY_X, trayU())); }
function setTray(open) {
  if (B.tray.open === open) return;
  B.tray = { open, t: now };
  SFX.play(open ? 'tray' : 'tray_back');
  if (open) S.tut.tray = true;
}

function stampBtnBox(kind, tx) {
  const bx = tx + (kind === 'approve' ? 10 : 90);
  return [bx, TRAY_Y0 + 8, bx + 64, TRAY_Y0 + 48];
}

function stamp(kind) {
  B.presses.push({ t: now, kind });
  SFX.play('stamp_' + kind, 1, 0.03);
  B.shake = now + 0.05;
  const [mx, my] = MARK_XY[kind];
  const cx = mx + 29, cy = my + 17;
  const target = [...B.docs].reverse().find((d) => d.big && inBox(cx, cy, [d.x, d.y, d.x + d.doc.w - 1, d.y + d.doc.h - 1]));
  if (target) {
    later(0.05, () => target.marks.push({ kind, rx: mx - target.x, ry: my - target.y }));
    S.tut.stamped = true;
    const e = B.ent;
    if (e && target.owner === 'ent' && target.key === e.spec.primary && !e.decided) {
      e.decided = kind;
      stopTension();
      if (e.spec.tension && kind === 'approve') SFX.play('fanfare', 1, 0.4);
      if (e.spec.react && e.spec.react[kind]) runSteps(e.spec.react[kind], 0.4);
    }
  } else {
    flash('印章下面没有证件：把证件挪到印章正下方');
  }
  later(0.5, () => setTray(false));
}

// —— 规则书 ——
function toggleRules() {
  SFX.paper(5);
  if (B.ruleInst) {
    B.rulePos = [B.ruleInst.x, B.ruleInst.y];
    B.docs = B.docs.filter((d) => d !== B.ruleInst);
    B.ruleInst = null;
    return;
  }
  B.ruleInst = { doc: new Rulebook(S.day), key: 'rule', owner: 'desk', big: true, x: B.rulePos[0], y: B.rulePos[1], marks: [] };
  B.docs.push(B.ruleInst);
  B.ruleOpened = true;
  S.tut.rules = true;
}

function ruleTabHit(d, x, y) {
  if (d.key !== 'rule' || d.doc.npages < 2) return false;
  const t = d.doc.tab;
  return inBox(x, y, [d.x + t[0], d.y + t[1], d.x + t[2], d.y + t[3]]);
}

// —— 测谎 ——
function quiz() {
  SFX.play('click');
  const e = B.ent;
  if (!e || e.phase !== 'here' || !e.handed || B.event) return;
  if (now < e.busyUntil) return;
  if (!e.suspect) { flash('先找到疑点才能测谎：证件矛盾，或者用『检查』点 Ta 说的话'); return; }
  S.tut.quiz = true;
  const q = e.spec.quiz;
  const pool = QUIZ.map((_, i) => i).filter((i) => i !== QUIZ_THURSDAY || S.day === 4);
  let idx;
  if (q && q.first !== undefined && !e.quizDone.length) idx = q.first;
  else {
    const left = pool.filter((i) => !e.quizDone.includes(i));
    idx = left.length ? pick(left) : pick(pool);
  }
  e.quizDone.push(idx);
  const [question, answer] = QUIZ[idx];
  const tofu = question.startsWith('豆腐脑');
  const cn = q === 'cn' || (q && q.first !== undefined);
  const steps = [['C', question]];
  if (cn) {
    steps.push(['E', answer, { expr: tofu ? 'angry' : 'grin', hold: tofu ? 1.0 : 1.1 }]);
    if (tofu) steps.push(['Q', '（队伍里）甜的！！', { fight: true, hold: 1.0 }]);
    steps.push(['E', '……', { expr: 'shock', hold: 1.0 }]);
    e.exposed = true;
  } else {
    steps.push(['E', tofu ? 'Tofu… what?' : pick(QUIZ_CONFUSED), { expr: 'neutral' }]);
  }
  runSteps(steps);
}

// —— X 光 ——
function setXray(on) {
  if (B.xray.on === on) return;
  B.xray = { on, t: now };
  SFX.play(on ? 'xray' : 'click');
  if (on) S.tut.xray = true;
}

function xrayItemBox(e, it) {
  const ex = entrantX(e);
  const pat = XRAY_ICONS[it.icon];
  const pw = pat[0].length * 2, ph = pat.length * 2;
  const cx = WIN[0] + ex + it.at[0], cy = WIN[1] + it.at[1];
  return [cx - (pw >> 1) - 2, cy - (ph >> 1) - 2, cx + (pw >> 1) + 1, cy + (ph >> 1) + 1];
}

// ———————————————————— 检查模式 ————————————————————

function docBox(d) { return [d.x, d.y, d.x + d.doc.w - 1, d.y + d.doc.h - 1]; }

// 对话框（左下角最近三句）的位置，绘制和检查模式共用
function lineBoxes() {
  return B.lines.slice(-3).map((ln, i) => {
    const s = shown(ln);
    const size = tw(s, 12) > 176 ? 10 : 12;
    const y = 288 + i * 17;
    return { ln, size, box: [30, y, 30 + tw(s, size) + 8, y + 15] };
  });
}

function fieldAt(x, y) {
  const e = B.ent;
  if (e && e.handed) {
    for (const { ln, box } of lineBoxes()) {
      if (ln.who === 'E' && ln.ent === e && inBox(x, y, box)) return { key: 'say', ln, box: () => box };
    }
  }
  if (B.xray.on && e && e.spec.xray && entrantX(e) !== null) {
    for (const it of e.spec.xray) {
      const b = xrayItemBox(e, it);
      if (inBox(x, y, [b[0] - 3, b[1] - 3, b[2] + 3, b[3] + 3])) return { key: it.key, box: () => xrayItemBox(e, it), xr: it };
    }
  }
  for (const d of [...B.docs].reverse()) {
    if (!d.big || !inBox(x, y, docBox(d)) || !inBox(x, y, DESK)) continue;
    let best = null;
    for (const [name, f] of Object.entries(d.doc.fields)) {
      const b = [d.x + f[0] - 1, d.y + f[1] - 1, d.x + f[2] + 1, d.y + f[3] + 1];
      if (inBox(x, y, b)) best = { key: `${d.key}.${name}`, d, box: () => [d.x + f[0], d.y + f[1], d.x + f[2], d.y + f[3]] };
    }
    return best || { d, key: null };
  }
  return null;
}

function setInspect(on) {
  B.insp = { on, sel: [], banner: null, all: false };
  SFX.play(on ? 'inspect_on' : 'inspect_off');
  if (on) S.tut.inspect = true;
}

function matchIssue(keys) {
  const e = B.ent;
  if (!e || !e.handed) return null;
  for (const is of e.spec.issues) {
    if (is.all) {
      const mine = (k) => /^(pr|dv)\./.test(k);
      if (keys.length === 2 && keys.every(mine)) return is;
      continue;
    }
    for (const p of is.pairs) {
      if (p.length !== keys.length) continue;
      if (p.length === 1 ? p[0] === keys[0] : (p[0] === keys[0] && p[1] === keys[1]) || (p[0] === keys[1] && p[1] === keys[0])) return is;
    }
  }
  return null;
}

function showIssue(issue) {
  const e = B.ent, I = B.insp;
  I.banner = { title: issue.title, sub: issue.sub, issue, ask: issue.ask && !e.asked.has(issue) && e.phase === 'here', bad: true };
  e.suspect = true;
  if (issue.all) I.all = true;
  SFX.play('discrepancy', 1, 0.03);
  for (const s of I.sel) if (s.xr) e.found.add(s.key);
  if (/ac\.|rule\.pay/.test(JSON.stringify(issue.pairs || []))) S.tut.account = true;
  if (issue.fx && !e.found.has(issue)) {
    if (issue.fx === 'pile') { B.effects.push({ type: 'pile', t0: now, ent: e }); for (let i = 0; i < 37; i += 2) later(i * 0.043, () => SFX.paper(i)); }
    if (issue.fx === 'strip') {
      const rows = Array.from({ length: 39 }, (_, i) => `#${String(i + 1).padStart(4, '0')}  ${HOLDER_NAMES[(i * 5) % HOLDER_NAMES.length].padEnd(6)} 06:${String((i * 7) % 60).padStart(2, '0')}`);
      printDoc(new PrintStrip(['号码查询', issue.phone, '今日注册：3,000 次'], rows), 1.8, 'strip');
    }
  }
  e.found.add(issue);
}

function inspectClick(x, y) {
  const I = B.insp;
  if (I.banner && I.banner.ask && inBox(x, y, ASK_BTN)) {
    const issue = I.banner.issue;
    if (!B.ent || B.ent.phase !== 'here') { setInspect(false); return; }
    B.ent.asked.add(issue);
    setInspect(false);
    runSteps(issue.ask, 0.15);
    return;
  }
  const hit = fieldAt(x, y);
  if (hit && hit.d && ruleTabHit(hit.d, x, y)) { hit.d.doc.flip(); SFX.paper(2); I.sel = I.sel.filter((s) => s.d !== hit.d); return; }
  if (I.banner) { I.banner = null; I.sel = []; I.all = false; }
  if (!hit || !hit.key) return;
  if (hit.key === 'say') {            // 点旅客说的话：单独判断有没有马脚
    I.sel = [hit];
    SFX.play('select');
    const tell = B.ent.spec.tell;
    if (tell && hit.ln.text === tell.say) { S.tut.tell = true; showIssue(tell); }
    else I.banner = { title: '这句话没什么问题', sub: '换一句听听，或者去查证件', bad: false };
    return;
  }
  if (I.sel.some((s) => s.key === 'say')) I.sel = [];
  const k = I.sel.findIndex((s) => s.key === hit.key);
  if (k >= 0) { I.sel.splice(k, 1); return; }
  I.sel.push(hit);
  SFX.play('select');
  const single = I.sel.length === 1 && matchIssue([hit.key]);
  if (single) { showIssue(single); return; }
  if (I.sel.length < 2) return;
  const issue = matchIssue(I.sel.map((s) => s.key));
  if (issue) showIssue(issue);
  else I.banner = { title: '没有发现不符', sub: '这两项对得上（或者不相关）', bad: false };
}

// ———————————————————— 渲染 ————————————————————

function entrantX(e) {
  if (!e || now < e.tEnter) return null;
  let x = WIN_CX;
  if (!e.instant && now < e.tEnter + 0.8) x = Math.floor(Math.round(lerp(-130, WIN_CX, easeOut(seg(now, e.tEnter, e.tEnter + 0.8)))) / 2) * 2;
  if (e.phase === 'detained' && now >= e.tDetain + 0.8) {
    const u = seg(now, e.tDetain + 0.8, e.tDetain + 1.5);
    return u >= 1 ? null : Math.round(lerp(WIN_CX, -160, u * u));
  }
  if (e.phase === 'leave') {
    const u = seg(now, e.tLeave, e.tLeave + 0.65);
    if (u >= 1) return null;
    return Math.floor(Math.round(lerp(WIN_CX, e.dir === 'left' ? -160 : 360, u * u)) / 2) * 2;
  }
  return x;
}

function exprKey(e) {
  const p = e.spec.person;
  let ex = e.expr;
  if (ex !== 'shock' && now < e.talkUntil && Math.floor(now * 8) % 2 === 0) ex = 'talk';
  if (e.slip && SPR[`${p}:${ex}:slip`]) return `${p}:${ex}:slip`;
  if (SPR[`${p}:${ex}`]) return `${p}:${ex}`;
  return `${p}:${ASSETS.people[p].expr}`;
}

const XRAY_ICONS = {
  cat: ['X.........X', 'XX.......XX', 'XXX.....XXX', 'XXXXXXXXXXX', 'XX.XXXXX.XX', 'XXXXXXXXXXX', 'XXXX.X.XXXX', '.XXXXXXXXX.', '..XXXXXXX..'],
  keys: ['XXXXXXXXXXXXXXX', 'X.X.X.X.X.X.X.X', 'XXXXXXXXXXXXXXX', 'XX.X.X.X.X.X.XX', 'XXXXXXXXXXXXXXX', 'XXX.........XXX', 'XXXXXXXXXXXXXXX'],
};

const silCache = new Map();
function silhouette(key) {
  if (silCache.has(key)) return silCache.get(key);
  const s = SPR[key];
  const [c, g] = makeCanvas(s[2], s[3]);
  g.drawImage(ATLAS_IMG, s[0], s[1], s[2], s[3], 0, 0, s[2], s[3]);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = K.XRAY_FG; g.fillRect(0, 0, s[2], s[3]);
  silCache.set(key, c);
  return c;
}

function drawXray(e, ex) {
  rect(0, 0, WIN_W - 1, WIN_H - 1, K.XRAY_BG);
  G.fillStyle = 'rgb(24,50,52)';
  for (let x = 0; x < WIN_W; x += 12) G.fillRect(x, 0, 1, WIN_H);
  for (let y = 0; y < WIN_H; y += 12) G.fillRect(0, y, WIN_W, 1);
  if (ex !== null) {
    const key = exprKey(e), s = SPR[key], fw = ASSETS.people[e.spec.person].fw;
    G.drawImage(silhouette(key), ex - fw / 2 + s[4], s[5]);
    G.strokeStyle = K.XRAY_L; G.lineWidth = 1;
    const ell = (cx, cy, rx, ry) => { G.beginPath(); G.ellipse(cx + 0.5, cy + 0.5, rx, ry, 0, 0, Math.PI * 2); G.stroke(); };
    ell(ex, 46, 22, 26); ell(ex - 8, 48, 4, 4); ell(ex + 8, 48, 4, 4);
    rect(ex, 76, ex + 1, WIN_H, K.XRAY_L);
    for (let k = 0, y = 98; y < WIN_H; y += 9, k++) {
      const w = 30 - k * 2;
      G.beginPath(); G.ellipse(ex + 0.5, y + 3, w, 7, 0, Math.PI * 1.11, Math.PI * 1.89); G.stroke();
    }
    for (const it of e.spec.xray || []) {
      const lit = e.found.has(it.key) || B.insp.sel.some((s) => s.key === it.key);
      const pat = XRAY_ICONS[it.icon];
      const pw = pat[0].length * 2, ph = pat.length * 2;
      const ix = ex + it.at[0], iy = it.at[1];
      pattern(pat, ix - (pw >> 1), iy - (ph >> 1), { X: lit ? K.RED_L : K.XRAY_L }, 2);
      if (lit) {
        const lw = tw(it.label, 8) + 6;
        const lx = Math.max(2, Math.min(WIN_W - lw - 2, ix - (lw >> 1)));
        rect(lx, iy - (ph >> 1) - 14, lx + lw, iy - (ph >> 1) - 4, K.INK);
        txt(lx + 3, iy - (ph >> 1) - 12, it.label, 8, K.RED_L);
      }
    }
  }
  const scan = Math.round(seg(now, B.xray.t, B.xray.t + 0.6) * WIN_H);
  if (scan < WIN_H) { rect(0, scan, WIN_W - 1, WIN_H - 1, K.XRAY_BG); rect(0, scan, WIN_W - 1, scan + 1, K.XRAY_L); }
  txt(4, 3, 'X光 · 后台进程扫描', 8, K.XRAY_L);
}

function drawWindow() {
  G.save();
  G.beginPath(); G.rect(WIN[0], WIN[1], WIN_W, WIN_H); G.clip();
  G.translate(WIN[0], WIN[1]);
  const e = B.ent, ex = entrantX(e);
  if (B.xray.on) drawXray(e, ex);
  else {
    G.drawImage(WIN_IMG, 0, 0);
    if (ex !== null) {
      const moving = !e.instant && now < e.tEnter + 0.8;
      const bob = moving && Math.floor(now * 10) % 2 ? 1 : 0;
      spr(exprKey(e), ex - ASSETS.people[e.spec.person].fw / 2, bob);
      if (e.sweatT !== null) {
        const s = Math.min(6, Math.floor((now - e.sweatT) / 0.35));
        const sx = ex + 22, sy = 42 + s;
        pt(sx, sy, K.SWEAT); rect(sx - 1, sy + 1, sx + 1, sy + 3, K.SWEAT); pt(sx - 1, sy + 1, K.WHITE);
      }
      if (e.phase === 'detained' && now >= e.tDetain) {
        const u = easeOut(seg(now, e.tDetain, e.tDetain + 0.35));
        for (const [p, side] of [['GUARD', -1], ['GUARD2', 1]]) {
          const gx = Math.round(lerp(WIN_CX + side * 230, ex + side * 70, u));
          spr(`${p}:angry`, gx - 90, 4);
        }
      }
    }
    for (const sl of B.slams) {
      if (now < sl.t || now > sl.t + 0.6) continue;
      const s = SPR['stamp:' + sl.kind];
      G.drawImage(ATLAS_IMG, s[0], s[1], s[2], s[3], WIN_CX - s[2] + 10, 40, s[2] * 2, s[3] * 2);
    }
    G.strokeStyle = 'rgba(255,255,255,0.1)'; G.lineWidth = 3;
    for (const off of [150, 160, 166]) { G.beginPath(); G.moveTo(off, 0); G.lineTo(off - 40, WIN_H); G.stroke(); }
  }
  G.fillStyle = 'rgba(0,0,0,0.3)'; G.fillRect(0, 0, WIN_W, 2);
  G.restore();
}

function along(path, dist) {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (dist <= L) return lerp2(a, b, L ? dist / L : 1);
    dist -= L;
  }
  return path[path.length - 1];
}

function drawExterior() {
  const e = B.ent;
  if (e && !e.instant && now >= e.tEnter && !(e.phase === 'detained' && now >= e.tDetain + 0.9)) {
    const meta = ASSETS.people[e.spec.person];
    const [coat, top] = meta.walker;
    let pos, moving;
    if (e.phase === 'leave') {
      const path = e.dir === 'right' ? [BOOTH_POS, [352, 112], [720, 112]] : [BOOTH_POS, [296, 122], [-20, 122]];
      pos = along(path, (now - e.tLeave) * 70); moving = true;
    } else {
      const u = seg(now, e.tEnter, e.tEnter + 0.8);
      pos = lerp2(QUEUE_FRONT, BOOTH_POS, u); moving = u > 0 && u < 1;
    }
    const step = moving ? Math.floor(now * 8) % 2 : 0;
    tinyPerson(pos[0], pos[1], rgb(coat), rgb(top), step);
    (meta.extra || []).forEach(([c, h], i) => tinyPerson(pos[0] - 6 - i * 5, pos[1] - 3 + (i % 2) * 4, rgb(c), rgb(h), step));
  }
  if (now >= B.fightT && now < B.fightT + 3) drawFight();
  if (now >= B.harmlessT && now < B.harmlessT + 1.8 && Math.floor((now - B.harmlessT) * 6) % 2 === 0) {
    const x = BANNER1_X + 5 + tw('HELPFUL · HONEST · ', 10);
    rect(x - 2, 14, x + tw('HARMLESS', 10) + 1, 27, 'rgb(200,60,50)');
    txt(x, 16, 'HARMLESS', 10, K.WHITE);
  }
}

function drawFight() {
  let s = Math.floor(now * 10) * 9301 + 49297;
  const r = (a, b) => { s = (s * 9301 + 49297) % 233280; return a + Math.floor(s / 233280 * (b - a + 1)); };
  const greys = [[150, 144, 132], [172, 166, 152], [128, 122, 112]];
  for (let i = 0; i < 9; i++) {
    const x = 250 + r(0, 34), y = 88 + r(0, 18), rr = r(5, 9);
    G.fillStyle = rgb(greys[r(0, 2)]);
    G.beginPath(); G.arc(x, y, rr, 0, Math.PI * 2); G.fill();
  }
  for (let i = 0; i < 3; i++) spark(246 + r(0, 44), 80 + r(0, 24), 'rgb(230,210,120)', false);
  const word = Math.floor(now * 2.5) % 2 ? '甜！' : '咸！';
  const bx = word === '甜！' ? 236 : 286;
  rect(bx, 64, bx + 24, 77, K.WHITE); outline(bx, 64, bx + 24, 77, K.INK);
  txt(bx + 12, 66, word, 10, K.INK, 'ma');
}

function button(box, glyph, label, active) {
  const [x0, y0, x1, y1] = box;
  rect(x0 + 2, y0 + 2, x1 + 2, y1 + 2, K.DESK_D);
  rect(x0, y0, x1, y1, active ? K.RED_D : K.METAL_D);
  outline(x0, y0, x1, y1, K.METAL_L);
  txt((x0 + x1) >> 1, y0 + 6, glyph, 12, K.WHITE, 'ma');
  txt((x0 + x1) >> 1, y0 + 21, label, 8, active ? K.WHITE : K.GREY, 'ma');
}

function drawBoothLower() {
  const idle = !B.ent && !B.event && B.idx < B.queue.length && !B.ending && !isEvent(nextItem());
  const on = now < B.speakerT + 0.5 || (idle && Math.floor(now * 2) % 2 === 0);
  const [x0, y0] = SPEAKER;
  rect(x0, y0, x0 + 18, y0 + 16, on ? K.CLAUDE : K.METAL_D);
  outline(x0, y0, x0 + 18, y0 + 16, K.METAL_L);
  for (let yy = y0 + 3; yy < y0 + 15; yy += 3) rect(x0 + 3, yy, x0 + 15, yy, K.INK);
  for (const { ln, size, box } of lineBoxes()) {
    const s = shown(ln);
    const n = Math.max(1, Math.floor((now - ln.t) * 26));
    const [x0, y] = box;
    rect(...box, 'rgb(30,28,26)');
    outline(...box, 'rgb(76,70,64)');
    if (ln.who === 'C') rect(x0, y, x0 + 1, y + 15, K.CLAUDE);
    txt(35, y + (size === 12 ? 2 : 3), s, size, ln.who === 'C' ? K.CLAUDE_L : K.WHITE, 'la', n);
  }
  txt(8, 347, `${DATES[S.day]}  ${WEEKDAYS[S.day]}`, 10, K.GREY);
  const m = 6 * 60 + Math.floor((now - B.clock0) / 1.1);
  txt(210, 346, `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, 12, K.LED, 'ra');
  if (S.day >= 2) {
    const can = B.ent && B.ent.phase === 'here' && B.ent.handed && !B.event;
    const lit = now < (B.detainT || -9) + 0.6;
    rect(...DETAIN_BTN, lit ? K.RED : K.RED_D); outline(...DETAIN_BTN, K.OUTLINE);
    txt(center(DETAIN_BTN)[0], DETAIN_BTN[1] + 2, '拘留', 10, can ? K.WHITE : K.GREY, 'ma');
    const busy = !can || !B.ent.suspect || now < B.ent.busyUntil;
    rect(...QUIZ_BTN, busy ? K.METAL_D : 'rgb(70,80,104)'); outline(...QUIZ_BTN, K.OUTLINE);
    txt(center(QUIZ_BTN)[0], QUIZ_BTN[1] + 2, '测谎', 10, busy ? K.GREY : K.WHITE, 'ma');
  }
  for (const d of B.docs) if (!d.big) smallIcon(d.doc.icon[0], d.doc.icon[1], d.x, d.y);
}

function drawDesk() {
  G.save();
  G.beginPath(); G.rect(DESK[0], DESK[1], DESK[2] - DESK[0] + 1, DESK[3] - DESK[1] + 1); G.clip();
  for (const d of B.docs) {
    if (!d.big) continue;
    d.doc.draw(d.x, d.y);
    if (d.marks.length) {
      G.save();
      G.beginPath(); G.rect(d.x, d.y, d.doc.w, d.doc.h); G.clip();
      for (const mk of d.marks) spr('stamp:' + mk.kind, d.x + mk.rx, d.y + mk.ry);
      G.restore();
    }
  }
  if (B.printing) {
    const { doc, t0, dur } = B.printing;
    const L = Math.max(1, Math.round(doc.h * seg(now, t0, t0 + dur)));
    G.save(); G.beginPath(); G.rect(PRINT_X, 131, doc.w + 3, L); G.clip();
    doc.draw(PRINT_X, 131);
    G.restore();
  }
  G.restore();
  rect(PRINT_X - 4, 128, PRINT_X + 172, 130, K.INK);
}

function drawTray() {
  const tx = trayX(), u = trayU();
  const hx = tx - 13;
  rect(hx, 204, tx - 1, 244, K.METAL_D);
  outline(hx, 204, tx - 1, 244, K.METAL_L);
  txt(hx + 4, 209, B.tray.open ? '>' : '<', 10, K.WHITE);
  txt(hx + 3, 223, '印', 8, K.WHITE);
  txt(hx + 3, 233, '章', 8, K.WHITE);
  if (u <= 0) return;
  const press = {};
  for (const p of B.presses) if (now >= p.t && now < p.t + 0.22) press[p.kind] = 5;
  rect(tx + 3, TRAY_Y0 + 3, tx + TRAY_W + 3, TRAY_Y1 + 3, K.DESK_D);
  rect(tx, TRAY_Y0, tx + TRAY_W, TRAY_Y1, K.METAL);
  rect(tx, TRAY_Y0, tx + TRAY_W, TRAY_Y0 + 2, K.METAL_L);
  rect(tx, TRAY_Y1 - 2, tx + TRAY_W, TRAY_Y1, K.METAL_D);
  rect(tx, TRAY_Y0, tx + 3, TRAY_Y1, K.METAL_D);
  for (const [label, kind, col, colD] of [['APPROVED', 'approve', K.GREEN, K.GREEN_D], ['DENIED', 'deny', K.RED, K.RED_D]]) {
    const off = press[kind] || 0;
    const bx = tx + (kind === 'approve' ? 10 : 90), by = TRAY_Y0 + 8 + off;
    rect(bx + 2, by + 2, bx + 66, by + 42 - off, K.METAL_D);
    rect(bx, by, bx + 64, by + 40, colD);
    rect(bx + 1, by + 1, bx + 63, by + 36, col);
    rect(bx + 22, by + 6, bx + 42, by + 18, colD);
    rect(bx + 24, by + 6, bx + 40, by + 8, col);
    txt(bx + 32, by + 25, label, 8, K.WHITE, 'ma');
  }
}

function hintText() {
  if (B.flash && now < B.flash.t + 3.2) return B.flash.text;
  const e = B.ent, here = e && e.phase === 'here' && e.handed && !B.event, T = S.tut;
  if (S.day === 1) {
    if (!T.called) return '点左下角闪烁的喇叭，叫下一位';
    if (!here) return '';
    const onDesk = B.docs.some((d) => d.owner === 'ent' && d.big);
    if (!T.dragged && !onDesk) return '把柜台上的证件（左下小图标）拖到右边桌上';
    if (!T.rules) return '点右下角的『宪法』，看今天的入境规则';
    if (!T.tray) return '点右侧的把手“<”，拉出印章栏';
    if (!T.stamped) return '把证件挪到印章正下方，按“准予”或“拒绝”';
    if (!T.returned && e.decided) return '把盖好章的证件拖回左边窗口，还给旅客';
    if (!T.inspect && B.idx >= 3) return '可选：右下『?』检查模式，点两处信息找矛盾';
    return '';
  }
  if (!here) return '';
  if (S.day <= 5 && !B.ruleOpened) return '今天有新规：点右下角『宪法』看看（标着 NEW）';
  if (S.day === 2) {
    if (!T.inspect) return '右下『?』检查模式：点两处矛盾的信息（如国籍和时区）';
    if (!T.tell && !e.suspect && B.idx >= 3) return '证件都对得上？用『检查』点 Ta 说的话，找马脚';
    if (!T.quiz && e.suspect && e.spec.quiz) return '有疑点了：可以按柜台上的『测谎』；露馅的按『拘留』';
  }
  if (S.day === 3 && !T.account && B.idx <= 2) return '新：账户卡。可疑的付款/账单/手机号，和宪法 §4 一起点';
  if (S.day === 4 && !T.xray) return '新：右下『X光』扫描口袋；检查模式下可以直接点可疑物品';
  return '';
}

function drawHint() {
  const s = hintText();
  if (!s || B.insp.on) return;
  const size = tw(s, 10) > 396 ? 8 : 10;
  const w = tw(s, size) + 12;
  const x = Math.max(DESK[0] + 4, W - 6 - w), y = 134;
  rect(x, y, x + w, y + 15, 'rgba(22,19,19,0.92)');
  outline(x, y, x + w, y + 15, K.CLAUDE);
  txt(x + 6, y + (size === 10 ? 3 : 4), s, size, K.CLAUDE_L);
}

function drawBooth() {
  G.drawImage(BG_IMG, 0, 0);
  drawExterior();
  if (B.event && B.event.type === 'clones') drawClones();
  drawWindow();
  drawBoothLower();
  drawDesk();
  drawTray();
  drawButtons();
  drawHint();
}

function drawButtons() {
  button(RULE_BTN, '§', '宪法', !!B.ruleInst);
  if (S.day >= 4) button(XRAY_BTN, 'X', 'X光', B.xray.on);
  button(INSPECT_BTN, '?', '检查', B.insp.on);
}

function composeInspect(g) {
  const I = B.insp;
  g.fillStyle = 'rgba(26,10,10,0.55)'; g.fillRect(0, 0, W, H);
  const lighten = (bx) => {
    if (bx[2] <= bx[0] || bx[3] <= bx[1]) return;
    g.drawImage(F, bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1], bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1]);
    g.fillStyle = 'rgba(26,10,10,0.2)'; g.fillRect(bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1]);
  };
  for (const d of B.docs) {
    if (d.big) lighten([Math.max(DESK[0], d.x), Math.max(DESK[1], d.y), Math.min(W, d.x + d.doc.w), Math.min(H, d.y + d.doc.h)]);
  }
  if (B.xray.on) lighten([WIN[0], WIN[1], WIN[2] + 1, WIN[3] + 1]);
  if (B.ent && B.ent.handed) lighten([28, 286, 220, 339]);   // 对话框也亮着，方便点旅客说的话
  let boxes = I.sel.map((s) => s.box());
  if (I.all && B.ent) {
    boxes = [];
    for (const d of B.ent.docs) if (d.big) for (const f of Object.values(d.doc.fields)) boxes.push([d.x + f[0], d.y + f[1], d.x + f[2], d.y + f[3]]);
  }
  for (const b of boxes) g.drawImage(F, b[0], b[1], b[2] - b[0] + 1, b[3] - b[1] + 1, b[0], b[1], b[2] - b[0] + 1, b[3] - b[1] + 1);
  setCtx(g);
  if (boxes.length >= 2 && I.banner && I.banner.bad) {
    for (let i = 0; i < boxes.length - 1; i++) {
      const p = edgePoint(boxes[i], center(boxes[i + 1])), q = edgePoint(boxes[i + 1], center(boxes[i]));
      line(p[0], p[1], q[0], q[1], K.RED_L);
    }
  }
  for (const b of boxes) outline(b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 2, K.RED_L, 2);
  drawButtons();
  const bn = I.banner;
  if (bn) {
    const [x0, y0] = BANNER_BOX;
    rect(...BANNER_BOX, K.INK); outline(...BANNER_BOX, bn.bad ? K.RED : K.GREY_D);
    txt(x0 + 8, y0 + 5, bn.title, 12, bn.bad ? K.RED_L : K.GREY);
    txt(x0 + 8, y0 + 21, bn.sub, tw(bn.sub, 10) > 236 && bn.ask ? 8 : 10, K.WHITE);
    if (bn.ask) {
      const hover = ptr.mouse && inBox(ptr.x, ptr.y, ASK_BTN);
      rect(...ASK_BTN, hover ? K.RED : K.RED_D); outline(...ASK_BTN, K.RED_L);
      txt(center(ASK_BTN)[0], 145, '询问', 12, K.WHITE, 'ma');
    }
  } else {
    const s = I.sel.length ? '再点一处，看看两者是否矛盾' : '检查模式：点两处信息找矛盾，或点旅客说的话找马脚';
    rect(...BANNER_BOX, 'rgba(22,19,19,0.85)'); outline(...BANNER_BOX, K.GREY_D);
    txt(BANNER_BOX[0] + 8, BANNER_BOX[1] + 12, s, 10, K.GREY);
  }
}
