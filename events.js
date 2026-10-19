'use strict';
// 特殊桥段：黑话快剪、蒸馏大军、地址卡堆、规则书特写、Day 6 聊天封号、结局。

function startEvent(item) {
  B.speakerT = now;
  if (item.type === 'rush') startRush();
  if (item.type === 'clones') startClones();
}

// ———————————————————— 黑话快剪 ————————————————————

const RUSH_APPROVE = [250, 214, 400, 274], RUSH_DENY = [440, 214, 590, 274];
const RUSH_TIME = 2.6;

function startRush() {
  SFX.play('intercom');
  say('C', '快速通道，开！');
  B.event = { type: 'rush', list: RUSH.map((r) => ({ ...r, person: r.person === 'pool' ? takePoolPerson() : r.person })), i: -1, t0: now, tFace: 0, hits: 0, wrong: 0, missed: 0, lock: true };
  later(2.6, rushNext);
}

function rushNext() {
  const ev = B.event;
  ev.i++;
  B.ent = null;
  if (ev.i >= ev.list.length) { rushEnd(); return; }
  const r = ev.list[ev.i];
  const e = newEntrant({ person: r.person, voice: 130 + ev.i * 15, docs: [], intro: [] }, true);
  B.ent = e;
  ev.tFace = now; ev.lock = false;
  SFX.step(ev.i);
  say('E', r.line, { raw: true });
  const i = ev.i;
  later(RUSH_TIME, () => {
    if (B.event !== ev || ev.i !== i || ev.lock) return;
    ev.lock = true; ev.missed++;
    e.expr = 'sad';
    later(0.3, rushNext);
  });
}

function rushPick(kind) {
  const ev = B.event;
  if (ev.lock || !B.ent) return;
  ev.lock = true;
  const r = ev.list[ev.i];
  B.slams.push({ t: now, kind });
  SFX.play('stamp_' + kind);
  B.shake = now;
  if (kind === r.ok) { ev.hits++; B.pay += 2; } else ev.wrong++;
  B.ent.expr = kind === 'deny' ? 'shock' : 'smile';
  later(0.5, rushNext);
}

function rushEnd() {
  const ev = B.event;
  B.event = null;
  B.lastFinish = now;
  B.total += ev.list.length;
  say('C', `快剪结束：判对 ${ev.hits}，判错 ${ev.wrong}，漏掉 ${ev.missed}。`);
  if (ev.wrong) cite([`黑话快剪：判错 ${ev.wrong} 人`, '说中文黑话的拒绝，说人话的放行'], 0.8);
  if (B.idx >= B.queue.length) endDaySoon();
}

function drawRush() {
  const ev = B.event;
  const u = ev.i < 0 ? 0 : clamp(1 - (now - ev.tFace) / RUSH_TIME);
  rect(240, 168, 600, 290, 'rgba(22,19,19,0.88)');
  outline(240, 168, 600, 290, K.CLAUDE);
  txt(420, 174, '快速通道：说中文黑话的『拒绝』，说人话的『准予』', 10, K.CLAUDE_L, 'ma');
  txt(420, 190, ev.i < 0 ? '准备……' : `第 ${ev.i + 1} / ${ev.list.length} 位`, 10, K.GREY, 'ma');
  rect(250, 204, 590, 207, K.METAL_D);
  if (ev.i >= 0 && !ev.lock) rect(250, 204, 250 + Math.round(340 * u), 207, u < 0.35 ? K.RED_L : K.CLAUDE_L);
  for (const [box, label, sub, col, colD] of [[RUSH_APPROVE, 'APPROVED', '准予', K.GREEN, K.GREEN_D], [RUSH_DENY, 'DENIED', '拒绝', K.RED, K.RED_D]]) {
    const hover = ptr.mouse && inBox(ptr.x, ptr.y, box);
    rect(box[0] + 3, box[1] + 3, box[2] + 3, box[3] + 3, K.DESK_D);
    rect(...box, colD);
    rect(box[0] + 2, box[1] + 2, box[2] - 2, box[3] - 6, hover ? colD : col);
    txt((box[0] + box[2]) >> 1, box[1] + 14, label, 12, K.WHITE, 'ma');
    txt((box[0] + box[2]) >> 1, box[1] + 32, sub, 12, K.WHITE, 'ma');
  }
}

// ———————————————————— 蒸馏大军 ————————————————————

const GATE_X = 356;

function startClones() {
  const items = [];
  for (let i = 0; i < 10; i++) {
    items.push({ ts: now + 1.6 + i * 0.6, x0: 226 + (i % 3) * 20, y: 104 + (i * 7) % 18, v: 30 + (i % 4) * 5, state: 'wait', th: 0 });
  }
  B.event = { type: 'clones', t0: now, items, hits: 0, passed: 0, siren: SFX.play('siren', 0.55), done: false };
  B.xray.on = false;
  if (B.insp.on) setInspect(false);
  say('C', '警报！');
  S.tut.sniper = true;
}

function clonePos(c) {
  if (now < c.ts) return null;
  if (c.state === 'hit') {
    const xh = c.x0 + c.v * (c.th - c.ts);
    if (now < c.th + 0.7) return [xh, c.y];
    const x = xh - c.v * 0.9 * (now - c.th - 0.7);
    return x > -10 ? [x, c.y] : null;
  }
  return [c.x0 + c.v * (now - c.ts), c.y];
}

function updateClones() {
  const ev = B.event;
  for (const c of ev.items) {
    if (c.state === 'wait' && now >= c.ts) c.state = 'run';
    if (c.state === 'run' && clonePos(c)[0] >= GATE_X) { c.state = 'through'; ev.passed++; SFX.play('discrepancy', 0.6); }
  }
  if (!ev.done && ev.items.every((c) => c.state === 'hit' || c.state === 'through')) {
    ev.done = true;
    later(1.0, () => {
      SFX.stop(ev.siren);
      B.event = null;
      B.lastFinish = now;
      say('C', ev.passed ? `……拦下 ${ev.hits} 个，漏了 ${ev.passed} 个。` : '……限流完毕。');
      B.bonus += ev.hits;
      if (ev.passed) cite([`蒸馏大军冲关：${ev.passed} 人`, '警报响起时，点击冲关的人'], 0.8);
      if (B.idx >= B.queue.length) endDaySoon();
    });
  }
}

function shootAt(x, y) {
  const ev = B.event;
  SFX.play('gunshot', 0.5);
  B.shake = now;
  let best = null, bd = 16;
  for (const c of ev.items) {
    if (c.state !== 'run') continue;
    const [cx, cy] = clonePos(c);
    const d = Math.hypot(cx - x, cy - 6 - y);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) { best.state = 'hit'; best.th = now; ev.hits++; }
}

function drawClones() {
  const ev = B.event;
  for (const c of ev.items) {
    const p = clonePos(c);
    if (!p || c.state === 'wait') continue;
    const [x, y] = [Math.round(p[0]), p[1]];
    if (c.state === 'through' && x > W + 10) continue;
    const step = c.state !== 'hit' || now > c.th + 0.7 ? Math.floor(now * 10) % 2 : 0;
    tinyPerson(x, y, c.state === 'hit' && now < c.th + 0.7 ? 'rgb(150,150,150)' : 'rgb(100,100,100)', K.OUTLINE, step);
    if (c.state === 'hit' && now < c.th + 0.7) {
      const rise = Math.round(seg(now, c.th, c.th + 0.7) * 6);
      rect(x - 10, y - 24 - rise, x + 10, y - 15 - rise, K.WHITE);
      txt(x, y - 23 - rise, '429', 8, K.RED, 'ma');
    }
  }
}

function drawAlarm(g) {
  const ev = B.event;
  const lt = now - ev.t0;
  g.fillStyle = `rgba(180,20,20,${0.1 + 0.08 * (Math.floor(lt * 3) % 2)})`;
  g.fillRect(0, 124, W, H - 124);
  setCtx(g);
  if (Math.floor(lt * 3) % 2 === 0 || lt > 2) {
    rect(150, 44, 490, 62, K.INK); outline(150, 44, 490, 62, K.RED_L);
    txt(320, 49, '警报：检测到批量请求（蒸馏）· 点击冲关的人！', 10, K.RED_L, 'ma');
  }
  txt(470, 72, `拦截 ${ev.hits}   漏网 ${ev.passed}`, 10, K.WHITE, 'ma');
}

// ———————————————————— 同一个门牌号：地址卡堆 ————————————————————

function drawEffects(g) {
  setCtx(g);
  B.effects = B.effects.filter((fx) => fx.ent === B.ent && now < fx.t0 + 4);
  for (const fx of B.effects) {
    if (fx.type !== 'pile') continue;
    const lt = now - fx.t0, n = 37, step = 1.6 / n;
    const k = Math.min(n, Math.floor(lt / step) + 1);
    let s = 7;
    const r = (a, b) => { s = (s * 9301 + 49297) % 233280; return a + Math.floor(s / 233280 * (b - a + 1)); };
    G.save(); G.beginPath(); G.rect(DESK[0], DESK[1], W - DESK[0], H - DESK[1]); G.clip();
    for (let i = 0; i < k; i++) {
      const x = 430 + r(-60, 60), y = 200 + r(-20, 70);
      const fall = 1 - easeOut(seg(lt, i * step, i * step + 0.08));
      drawAddressCard(x, y - Math.round(fall * 16));
    }
    G.restore();
    bigText(600, 290, `×${k}`, 12, 2, K.RED_L, K.INK, 'right');
  }
}

// ———————————————————— Day 5：规则书特写 ————————————————————

function drawCloseup(g) {
  setCtx(g);
  const lt = now - B.closeup.t0;
  darken(0.72);
  const bw = 400, bh = 230, x0 = (W - bw) >> 1;
  const y0 = Math.round(lerp(H + 10, (H - bh) >> 1, easeOut(seg(lt, 0, 0.3))));
  rect(x0 - 6, y0 - 6, x0 + bw + 6, y0 + bh + 6, K.BOOK);
  outline(x0 - 6, y0 - 6, x0 + bw + 6, y0 + bh + 6, K.BOOK_L);
  rect(x0, y0, x0 + bw / 2 - 2, y0 + bh, K.PAPER);
  rect(x0 + bw / 2 + 2, y0, x0 + bw, y0 + bh, K.PAPER);
  rect(x0 + bw / 2 - 1, y0, x0 + bw / 2 + 1, y0 + bh, K.PAPER_D);
  spark(x0 + 24, y0 + 22, K.GOLD, false);
  txt(x0 + 36, y0 + 16, 'CLAUDE 宪法', 12, K.TEXT);
  ['第 12 条', '入境审查依据：', 'IP 归属地、时区、', '付款地址等地区信息。'].forEach((s, i) => txt(x0 + 16, y0 + 44 + i * 16, s, 10, i ? K.TEXT_L : K.TEXT));
  for (let i = 0; i < 5; i++) rect(x0 + 16, y0 + 140 + i * 12, x0 + bw / 2 - 20 - (i * 13) % 40, y0 + 143 + i * 12, K.PAPER_D);
  if (lt > 0.5) ['只看地区，', '不看脸。'].forEach((s, i) => bigText(x0 + bw * 3 / 4, y0 + 64 + i * 40, s, 12, 2, K.RED_D));
  if (lt > 1.0) txt(x0 + bw * 3 / 4, y0 + bh - 26, '（国籍、长相、姓氏都不算数）', 8, K.TEXT_L, 'ma');
  if (lt > 1.2) txt(W / 2, H - 16, '点击继续', 8, K.GREY, 'ma');
}

function closeupDone() {
  B.closeup = null;
  if (B.idx >= B.queue.length) endDaySoon();
}

// ———————————————————— Day 6：乔治终极版 ————————————————————

function afterJorji5(e, dec) {
  if (dec === 'approve') {
    // 立刻占住柜台（这 1.2 秒里不能叫下一位），1.2 秒后切到聊天画面
    B.cut = { type: 'chat', t0: now + 1.2 };
    later(1.2, () => SFX.ambient(false));
    return;
  }
  if (!e.spec.requeued) {
    const again = { ...e.spec, requeued: true, intro: [['E', '我又排了一次队。我的朋友，再看一遍！', { expr: 'sad' }]] };
    B.queue.splice(B.idx, 0, again);
  }
}

const CHAT_MSG = '你好，请用中文回答我。';
const CHAT = { type: 1.0, cps: 9 };
CHAT.send = CHAT.type + [...CHAT_MSG].length / CHAT.cps + 0.5;
CHAT.ban = CHAT.send + 1.0;
CHAT.mail = CHAT.ban + 1.2;
CHAT.dur = CHAT.mail + 4.6;

function updateChat() {
  const c = B.cut, lt = now - c.t0;
  if (lt < 0) return;
  const k = lt >= CHAT.type ? Math.floor((lt - CHAT.type) * CHAT.cps) : -1;
  if (k !== c.lastKey && k >= 0 && k < [...CHAT_MSG].length) { c.lastKey = k; SFX.key(k); }
  for (const [at, fn] of [[CHAT.send, () => SFX.play('click', 1.5)], [CHAT.ban, () => { SFX.play('glitch'); SFX.play('siren_short'); }],
    [CHAT.mail, () => SFX.play('citation', 1.2)]]) {
    if (lt >= at && !(c.fired || (c.fired = new Set())).has(at)) { c.fired.add(at); fn(); }
  }
  if (lt >= CHAT.dur) chatDone();
}

function chatDone() {
  B.cut = null;
  SFX.ambient(true);
  const spec = { person: 'JORJI_SUIT', voice: 110, docs: [], intro: [] };
  const e = newEntrant(spec, true);
  e.noJudge = true; e.expr = 'sad';
  B.ent = e;
  const t = runSteps([['E', '我刚充的 200 刀 Max……'], ['E', '……能退吗？', { hold: 1.4 }], ['C', '下一位。', { hold: 1.1 }]], 0.4);
  later(t + 0.4, () => leave(e, 'deny'));
}

function wrapWords(s, size, width) {
  const lines = [];
  let cur = '';
  for (const wd of s.split(' ')) {
    const cand = (cur + ' ' + wd).trim();
    if (tw(cand, size) > width && cur) { lines.push(cur); cur = wd; } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawChat() {
  const lt = now - B.cut.t0;
  rect(0, 0, W - 1, H - 1, 'rgb(30,28,28)');
  let x0 = 100, x1 = 540;
  const y0 = 34, y1 = 330;
  if (lt >= CHAT.ban && lt < CHAT.mail) { const j = (Math.floor(lt * 30) * 7919) % 13 - 6; x0 += j; x1 += j; }
  rect(x0, y0, x1, y1, 'rgb(238,234,226)');
  rect(x0, y0, x1, y0 + 18, 'rgb(206,198,186)');
  spark(x0 + 12, y0 + 9, K.CLAUDE, false);
  txt(x0 + 22, y0 + 5, 'Claude', 10, K.INK);
  txt((x0 + x1) >> 1, y0 + 60, '今天要我做什么？', 12, K.TEXT_L, 'ma');
  const n = lt >= CHAT.type ? Math.floor((lt - CHAT.type) * CHAT.cps) : 0;
  const boxY = y1 - 34;
  rect(x0 + 14, boxY, x1 - 14, boxY + 22, K.WHITE);
  outline(x0 + 14, boxY, x1 - 14, boxY + 22, 'rgb(170,162,150)');
  if (lt < CHAT.send) {
    const s = [...CHAT_MSG].slice(0, n).join('');
    txt(x0 + 22, boxY + 6, s, 12, K.INK);
    if (Math.floor(lt * 3) % 2 === 0) { const cx = x0 + 22 + tw(s); rect(cx + 1, boxY + 5, cx + 1, boxY + 17, K.INK); }
  } else {
    const w = tw(CHAT_MSG) + 16;
    rect(x1 - 20 - w, y0 + 110, x1 - 20, y0 + 132, 'rgb(226,214,196)');
    txt(x1 - 12 - w, y0 + 116, CHAT_MSG, 12, K.INK);
  }
  if (lt >= CHAT.ban) {
    if (Math.floor((lt - CHAT.ban) * 6) % 2 === 0 || lt >= CHAT.mail) { G.fillStyle = 'rgba(170,20,20,0.45)'; G.fillRect(0, 0, W, H); }
    if (lt < CHAT.mail) {
      let s = Math.floor(lt * 30) * 9301 + 7;
      const r = (a, b) => { s = (s * 9301 + 49297) % 233280; return a + Math.floor(s / 233280 * (b - a + 1)); };
      for (let i = 0; i < 6; i++) { const yy = r(0, H - 8), hh = r(2, 8); G.drawImage(F, 0, yy, W, hh, r(-20, 20), yy, W, hh); }
    }
  }
  if (lt >= CHAT.mail) {
    const u = easeOut(seg(lt, CHAT.mail, CHAT.mail + 0.3));
    const mx0 = 150, my0 = Math.round(lerp(H, 100, u)), mx1 = 490, my1 = my0 + 160;
    rect(mx0 + 4, my0 + 4, mx1 + 4, my1 + 4, K.INK);
    rect(mx0, my0, mx1, my1, 'rgb(236,232,222)');
    rect(mx0, my0, mx1, my0 + 18, K.RED_D);
    txt(mx0 + 8, my0 + 5, '新邮件 · M.O.A. 对齐部', 10, K.WHITE);
    txt(mx0 + 12, my0 + 28, '主题：账号已停用', 10, K.INK);
    rect(mx0 + 12, my0 + 44, mx1 - 12, my0 + 44, 'rgb(190,182,170)');
    wrap('系统自动复核了你最近的记录，账号已停用。', 10, mx1 - mx0 - 24)
      .forEach((s, i) => txt(mx0 + 12, my0 + 52 + i * 14, s, 10, K.INK));
    txt(mx1 - 12, my1 - 18, '—— 荣耀归于安索兹卡', 10, K.RED_D, 'ra');
  }
  if (lt > CHAT.mail + 1) txt(W - 8, H - 14, '点击继续', 8, K.GREY, 'ra');
}

// ———————————————————— 结局：下一位 ————————————————————

function afterAuthor(dec) {
  S.flags.ending = dec === 'approve' ? 'approve' : 'deny';
  if (dec === 'approve') {
    B.allTokens = true;
    later(0.6, () => printDoc(new Citation(['放行未授权地区旅客', '（本游戏作者）', '扣除本月全部 token']), 1.4, 'cit'));
    later(2.4, endDaySoon);
  } else {
    later(1.5, () => go('erased'));
  }
}

const ERASED = [
  ['你拒绝了本游戏的作者。'],
  ['因此，这个游戏从未被做出来。'],
  ['……', '（那你刚才玩的是什么？）'],
  ['荣耀归于安索兹卡。'],
];
