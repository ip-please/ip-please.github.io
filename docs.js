'use strict';
// 证件和纸张（移植自 pp/docs.py）。每种证件知道自己的尺寸、怎么画、各栏位的相对坐标（检查模式用）。

function docShadow(x, y, w, h) { rect(x + 2, y + 2, x + w + 1, y + h + 1, K.DESK_D); }

const DOC_LABEL = { DOB: '生日', ISS: '地点', EXP: '有效', TYPE: '类型', REG: '注册', EST: '成立' };
const DOC_VALUE = {
  'UNITED STATES OF AMERICA': '美国', 'UNITED KINGDOM': '英国', 'JAPAN': '日本', 'DEUTSCHLAND': '德国',
  'REPUBLIC OF SINGAPORE': '新加坡', 'NEW YORK': '纽约', 'LOS ANGELES': '洛杉矶', 'CHICAGO': '芝加哥',
  'SEATTLE': '西雅图', 'HOUSTON': '休斯敦', 'DENVER': '丹佛', 'BOSTON': '波士顿', 'LONDON': '伦敦',
  'MANCHESTER': '曼彻斯特', 'TOKYO': '东京', 'OSAKA': '大阪', 'BERLIN': '柏林', 'MUNICH': '慕尼黑',
  'SINGAPORE': '新加坡', 'SAN FRANCISCO': '旧金山', 'SAN JOSE': '圣何塞',
};
function docZh(s) { return DOC_VALUE[s] || DOC_LABEL[s] || s; }

class Passport {
  constructor({ country, name, rows, person, cover = C.NAVY, band = C.NAVY_L, mrz = '' }) {
    Object.assign(this, { country, name, rows, person, cover: rgb(cover), band: rgb(band), mrz });
    this.w = 176; this.h = 116;
    this.icon = ['book', cover];
    this.fields = { header: [3, 3, 172, 16], name: [56, 20, 172, 34], photo: [9, 22, 50, 73] };
    rows.forEach(([k], i) => { this.fields[k] = [56, 40 + i * 12, 150, 51 + i * 12]; });
  }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, this.cover);
    rect(x + 3, y + 3, x + w - 4, y + h - 4, K.PAPER);
    for (let yy = y + 22; yy < y + h - 22; yy += 4) rect(x + 56, yy, x + w - 8, yy, K.PAPER_LINE);
    rect(x + 3, y + 3, x + w - 4, y + 16, this.band);
    txt(x + w / 2, y + 6, docZh(this.country), 8, K.PAPER, 'ma');
    rect(x + 9, y + 22, x + 50, y + 73, K.PAPER_D);
    spr('photo:' + this.person, x + 10, y + 23);
    txt(x + 58, y + 22, this.name, tw(this.name, 12) > 112 ? 10 : 12, K.TEXT);
    this.rows.forEach(([k, v], i) => {
      const lab = docZh(k), val = docZh(v);
      txt(x + 58, y + 42 + i * 12, lab, 8, K.TEXT_L);
      txt(x + 80, y + 41 + i * 12, val, tw(val, 10) > 90 ? 8 : 10, K.TEXT);
    });
    spr('emblem', x + 18, y + 78);
    if (this.mrz) txt(x + 8, y + h - 15, this.mrz, 8, K.TEXT_L);
  }
}

// 中转站本站：一本护照上写着 1,000 个名字，放到桌上会像手风琴一样往下展开
const HOLDER_NAMES = ['KEVIN', '小王', 'TONY', '阿强', 'LUCY', '老张', 'MOMO', '大刘', 'JACK', '小美', 'ERIC', '阿杰',
  'AMY', '胖虎', 'LEO', '小林', 'MIA', '二狗', 'SAM', '阿珍', 'BEN', '老李', 'IVY', '小赵'];

class AccordionPassport extends Passport {
  constructor(opts) {
    super(opts);
    this.unfoldT = null;
    this.rowsList = Array.from({ length: 80 }, (_, i) => `#${String(i + 1).padStart(4, '0')}  ${HOLDER_NAMES[(i * 7) % HOLDER_NAMES.length]}`);
  }

  draw(x, y) {
    if (this.unfoldT !== null) {
      // 下面放不下就往上展开
      const up = H - (y + this.h) < 100;
      const sx = x + 12, w = 152;
      const L = Math.round(lerp(0, up ? 150 : 210, easeOut(seg(now, this.unfoldT, this.unfoldT + 2))));
      const sy = up ? y + 6 - L : y + this.h - 6;
      const scroll = Math.max(0, now - this.unfoldT - 2) * 30;
      rect(sx + 2, sy + 2, sx + w + 1, sy + L + 1, K.DESK_D);
      rect(sx, sy, sx + w - 1, sy + L, K.PAPER);
      for (let fy = sy + 22; fy < sy + L; fy += 22) rect(sx, fy, sx + w - 1, fy, K.PAPER_D);
      G.save(); G.beginPath(); G.rect(sx, sy + 2, w, Math.max(0, L - 4)); G.clip();
      this.rowsList.forEach((s, i) => txt(sx + 8, sy + 6 + i * 11 - Math.floor(scroll) % 600, s, 8, K.TEXT));
      G.restore();
    }
    super.draw(x, y);
  }
}

// 乔治老哥用蜡笔画的“美国护照”（整张预渲染）
class CrayonPassport {
  constructor() {
    this.w = 176; this.h = 116;
    this.icon = ['book', [70, 90, 170]];
    this.fields = { header: [3, 3, 172, 18], photo: [9, 22, 50, 73], eagle: [120, 70, 160, 104] };
  }

  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    spr('crayon', x, y);
  }
}

// 合上的护照封面（套娃用）
class MiniPassport {
  constructor(w, h, cover, label) {
    Object.assign(this, { w, h, cover, label });
    this.icon = ['book', cover];
    this.fields = { all: [0, 0, w - 1, h - 1] };
  }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, rgb(this.cover));
    if (w > 50) {
      outline(x + 3, y + 3, x + w - 4, y + h - 4, K.GOLD);
      spark(x + (w >> 1), y + (h >> 1) - 8, K.GOLD, false);
      const size = tw(this.label, 10) < w - 12 ? 10 : 8;
      txt(x + w / 2, y + h - 18, this.label, size, K.GOLD, 'ma');
    } else {
      txt(x + w / 2, y + h / 2 - 4, this.label, 8, K.GOLD, 'ma');
    }
  }
}

// 设备入境卡 / 账户卡：标题 + 若干行 label/value
class Card {
  constructor(rows, { title = '设备入境卡', sub = '入境', color = C.PINK, colorD = C.PINK_D, valueX = 38, seal } = {}) {
    this.rows = rows; this.title = title; this.sub = sub;
    this.color = rgb(color); this.colorD = rgb(colorD); this.valueX = valueX;
    this.seal = seal === undefined ? rows.length >= 4 : seal;
    this.w = 152;
    this.h = 20 + 14 * rows.length + (this.seal ? 14 : 6);
    this.icon = ['card', color];
    this.fields = {};
    rows.forEach(([k], i) => { this.fields[k] = [4, 18 + 14 * i, this.w - 5, 31 + 14 * i]; });
  }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, this.colorD);
    rect(x + 1, y + 1, x + w - 2, y + h - 2, this.color);
    rect(x + 1, y + 1, x + w - 2, y + 14, this.colorD);
    txt(x + 6, y + 4, this.title, 10, K.TEXT);
    txt(x + w - 6, y + 6, this.sub, 8, K.TEXT_L, 'ra');
    if (this.seal) spr('seal', x + w - 40, y + h - 38);
    this.rows.forEach(([k, v], i) => {
      const yy = y + 20 + i * 14;
      const val = docZh(v);
      txt(x + 8, yy, docZh(k), 10, K.TEXT_L);
      txt(x + this.valueX, yy, val, tw(val, 10) > w - this.valueX - 6 ? 8 : 10, K.TEXT);
      G.fillStyle = this.colorD;
      for (let sx = x + 6; sx < x + w - 6; sx += 2) G.fillRect(sx, yy + 11, 1, 1);
    });
  }
}

function accountCard(pay, bill, phone) {
  return new Card([['付款', pay], ['账单', bill], ['手机', phone]],
    { title: '账户卡', sub: '账户', color: C.SAGE, colorD: C.SAGE_D, seal: false });
}

// 夹在护照里的小纸条（地下中转联盟）
class Note {
  constructor(lines) {
    this.lines = lines;
    this.w = Math.max(...lines.map((s) => tw(s, 10))) + 16;
    this.h = 12 + 13 * lines.length;
    this.icon = ['card', [236, 228, 204]];
    this.fields = {};
  }

  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(236,228,204)');
    G.fillStyle = K.DESK_D;
    G.beginPath(); G.moveTo(x + this.w - 8, y); G.lineTo(x + this.w, y); G.lineTo(x + this.w, y + 8); G.fill();
    this.lines.forEach((s, i) => txt(x + 8, y + 7 + i * 13, s, 10, 'rgb(70,70,96)'));
  }
}

// 对齐部警告单（原作的罚单）
class Citation {
  constructor(lines) {
    this.lines = lines;
    this.w = 168;
    this.h = 26 + 13 * lines.length + 6;
    this.icon = ['card', [226, 184, 176]];
    this.fields = {};
  }

  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(226,184,176)');
    rect(x, y, x + this.w - 1, y + 16, K.RED_D);
    txt(x + 6, y + 4, 'M.O.A. 警告单', 10, K.WHITE);
    txt(x + this.w - 6, y + 6, '警告', 8, 'rgb(226,184,176)', 'ra');
    this.lines.forEach((s, i) => {
      txt(x + 8, y + 22 + i * 13, s, tw(s, 10) > this.w - 14 ? 8 : 10, i === this.lines.length - 1 ? K.RED_D : K.TEXT);
    });
  }
}

// 打印机吐出来的长纸条（号码查询）
class PrintStrip {
  constructor(header, rows) {
    this.header = header; this.rows = rows;
    this.w = 128;
    this.h = 10 + 13 * header.length + 6 + 10 * rows.length + 6;
    this.icon = ['card', [232, 230, 222]];
    this.fields = {};
  }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, 'rgb(232,230,222)');
    G.fillStyle = K.GREY;
    for (let yy = y + 3; yy < y + h; yy += 6) { G.fillRect(x + 2, yy, 1, 1); G.fillRect(x + w - 3, yy, 1, 1); }
    let yy = y + 6;
    for (const s of this.header) { txt(x + 8, yy, s, 10, K.INK); yy += 13; }
    rect(x + 6, yy, x + w - 7, yy, K.GREY);
    yy += 5;
    for (const s of this.rows) { txt(x + 8, yy, s, 8, K.TEXT); yy += 10; }
  }
}

// 结局：旅客递上来的不是护照，是一段 prompt
class PromptPaper {
  constructor(text) {
    this.lines = wrap(text, 10, 158);
    this.w = 176; this.h = 120;
    this.icon = ['card', [236, 234, 226]];
    this.fields = { text: [6, 20, 170, 20 + 13 * this.lines.length], header: [3, 3, 172, 16] };
  }

  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(236,234,226)');
    rect(x + 3, y + 3, x + this.w - 4, y + 16, 'rgb(120,116,110)');
    txt(x + 8, y + 6, '用户请求', 8, K.WHITE);
    this.lines.forEach((s, i) => txt(x + 9, y + 22 + i * 13, s, 10, K.INK));
  }
}

// 同一个门牌号：桌上摞起来的地址卡
function drawAddressCard(x, y) {
  docShadow(x, y, 96, 34);
  rect(x, y, x + 95, y + 33, K.PAPER_D);
  rect(x + 1, y + 1, x + 94, y + 32, K.PAPER);
  txt(x + 6, y + 6, '123 MAIN ST', 10, K.TEXT);
  txt(x + 6, y + 20, 'PORTLAND, OR', 8, K.TEXT_L);
}

// 《Claude 宪法》：当天的入境规则，分两页。每条规则是一个可在检查模式里点选的栏位。
const RULE_TABLE = [
  ['美国', 'America/*', 'en-US'], ['英国', 'Europe/London', 'en-GB'], ['日本', 'Asia/Tokyo', 'ja-JP'],
  ['德国', 'Europe/Berlin', 'de-DE'], ['新加坡', 'Asia/Singapore', 'en-SG'],
];
const RULES = [
  { day: 1, page: 0, key: 'region', head: '§1 仅限支持地区入境', subs: ['支持：美国  英国  日本  德国  新加坡', '不支持：中国大陆  中国香港  中国澳门'] },
  { day: 2, page: 0, key: 'tz', head: '§2 时区、语言须与 IP 归属一致', subs: RULE_TABLE.map((r) => r.join('|')) },
  { day: 2, page: 0, key: 'quiz', head: '§3 测谎露馅者：拘留', subs: ['有疑点才能测谎（证件矛盾 / 话里的马脚）'] },
  { day: 3, page: 1, key: 'pay', head: '§4 付款、账单、手机须真实', subs: ['禁止：虚拟卡、555 接码手机号', '账单所在州须与 IP 归属一致', '禁止拼车：一本护照只能一个人用'] },
  { day: 4, page: 1, key: 'xray', head: '§5 后台进程须干净', subs: ['禁止“小猫咪”、中文输入法（『X光』）'] },
  { day: 5, page: 1, key: 'corp', head: '§6 中资控股过半：一律禁止', subs: ['无论公司注册在哪（套娃要拆到底）'] },
];

class Rulebook {
  constructor(day) {
    this.day = day;
    this.w = 200;
    this.icon = ['book', C.BOOK];
    const rules = RULES.filter((r) => r.day <= day);
    this.npages = day >= 3 ? 2 : 1;
    this.pages = [];
    for (let p = 0; p < this.npages; p++) {
      const L = [];
      for (const r of rules.filter((q) => q.page === p)) {
        L.push({ s: r.head, size: 10, col: r.day === day ? K.RED_D : K.TEXT, key: r.key, isNew: r.day === day });
        for (const s of r.subs) L.push({ s, size: 8, col: K.TEXT_L, key: r.key });
      }
      if (p === this.npages - 1) L.push({ s: '§12 只看地区，不看脸', size: 8, col: K.TEXT_L, key: null });
      let y = 22;
      const fields = {};
      for (const row of L) {
        row.y = y;
        y += row.size === 10 ? 14 : 10;
        if (row.key) {
          const f = fields[row.key];
          fields[row.key] = f ? [f[0], f[1], f[2], y - 2] : [4, row.y - 2, this.w - 5, y - 2];
        }
      }
      this.pages.push({ rows: L, fields, h: y + 6 });
    }
    this.h = Math.max(...this.pages.map((p) => p.h));
    this.page = this.npages - 1;
    this.tab = [this.w - 52, 3, this.w - 4, 16];
  }

  get fields() { return this.pages[this.page].fields; }

  flip() { this.page = (this.page + 1) % this.npages; }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, K.BOOK);
    rect(x + 3, y + 3, x + w - 4, y + h - 4, K.PAPER);
    rect(x + 3, y + 3, x + w - 4, y + 16, K.BOOK_L);
    txt(x + 8, y + 5, '宪法 · 入境规则', 10, K.PAPER);
    if (this.npages > 1) {
      rect(x + this.tab[0], y + this.tab[1], x + this.tab[2], y + this.tab[3], K.BOOK);
      txt(x + this.tab[2] - 4, y + 7, `第${this.page + 1}/${this.npages}页 ▶`, 8, K.PAPER, 'ra');
    } else {
      txt(x + w - 8, y + 7, `DAY ${this.day}`, 8, K.PAPER, 'ra');
    }
    for (const r of this.pages[this.page].rows) {
      if (r.s.includes('|')) {
        const [a, b, c] = r.s.split('|');
        txt(x + 12, y + r.y, a, 8, r.col);
        txt(x + 52, y + r.y, b, 8, r.col);
        txt(x + 150, y + r.y, c, 8, r.col);
        continue;
      }
      txt(x + 8, y + r.y, r.s, r.size, r.col);
      if (r.isNew) {
        const nx = x + 10 + tw(r.s, r.size);
        rect(nx, y + r.y - 1, nx + 19, y + r.y + 8, K.RED);
        txt(nx + 2, y + r.y, 'NEW', 8, K.WHITE);
      }
    }
  }
}

// 柜台上的小图标
function smallIcon(kind, color, x, y) {
  if (kind === 'book') {
    rect(x, y, x + 18, y + 12, K.INK);
    rect(x + 1, y + 1, x + 17, y + 11, rgb(color));
    pt(x + 9, y + 6, K.GOLD);
  } else {
    const d = color.map((c) => Math.floor(c * 0.85)), d2 = color.map((c) => Math.floor(c * 0.8));
    rect(x, y, x + 16, y + 10, rgb(d));
    rect(x + 1, y + 1, x + 15, y + 9, rgb(color));
    rect(x + 3, y + 4, x + 12, y + 4, rgb(d2));
  }
}
