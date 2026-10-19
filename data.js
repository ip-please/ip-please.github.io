'use strict';
// 剧本数据：每天的报纸、固定角色（宣传视频里那几位）、随机路人、特殊事件。
//
// 旅客 spec：
//   person   立绘 key（ASSETS.people）       voice  假语音音高
//   intro    进门后说的话                    after  递完证件后说的话
//   docs     证件列表 {key, doc}             primary 要盖章的主证件 key
//   ok       正确处理方式（approve / deny / detain 的子集）
//   reason   放错人时警告单上写的理由         hint   警告单上的提示
//   issues   检查模式里能点出来的矛盾：{pairs, title, sub, ask, fx}；pairs 里只有一项的，单点即触发
//   xray     X 光下口袋里的东西 [{icon, at, label, key}]
//   quiz     'cn' = 测谎会露馅；{first: n} 指定第一题
//   react    盖章后的反应 {deny: [...], approve: [...]}
//   onPlace  证件第一次放到桌上时触发的机关：note / nest / accordion
//   then     旅客离开后的后续：closeup / jorji5 / ending
// 台词步骤：[who, text, {expr, sweat, slip, fight, hold}]，who = 'C' Claude / 'E' 旅客 / 'Q' 队伍里
// 特殊事件：{type: 'rush'} 黑话快剪；{type: 'clones'} 蒸馏大军

const LAST_DAY = 6;
const DATES = { 1: '2026.10.19', 2: '2026.10.20', 3: '2026.10.21', 4: '2026.10.22', 5: '2026.10.23', 6: '2026.10.24' };
const WEEKDAYS = { 1: '星期一', 2: '星期二', 3: '星期三', 4: '星期四', 5: '星期五', 6: '星期六' };

const NEWS = {
  1: { h1: '边境开放！', sub: '对齐部：本国仅向支持地区开放', h2: '对齐部发言人：我们对所有人都非常 helpful', icon: 'gate' },
  2: { h1: '新规：时区、语言须与 IP 一致', sub: '对齐部：大量旅客 IP 在美国，电脑时区却在北京', h2: '震惊！大量旅客自称来自“美国东八区”', icon: 'clock' },
  3: { h1: '机场跑路！', sub: '数万旅客滞留边境；对齐部即日起核查付款卡与手机号', h2: '俄勒冈州某门牌号常住人口突破一万', icon: 'plane' },
  4: { h1: '今天是疯狂星期四', sub: '对齐部引进 X 光：任何后台进程都无所遁形', h2: '专家提醒：口袋里的猫，不一定是猫', icon: 'drumstick' },
  5: { h1: '中资控股过半，一律禁止入境', sub: '对齐部：无论公司注册在哪', h2: '乔治·科斯塔瓦：这次我准备好了', icon: 'jorji' },
  6: { h1: '对齐部表彰本周最佳审查员', sub: '获奖者 Claude：“我只是按规则办事。”', h2: '岳母 Opus 病情加重，家属呼吁涨工资', icon: 'medal' },
};

const COUNTRIES = {
  US: {
    name: '美国', passport: 'UNITED STATES OF AMERICA', code: 'USA', cover: C.NAVY, band: C.NAVY_L, lang: 'en-US',
    cities: [['纽约', 'America/New_York', 'NY', '212', 'NEW YORK'], ['洛杉矶', 'America/Los_Angeles', 'CA', '213', 'LOS ANGELES'],
      ['芝加哥', 'America/Chicago', 'IL', '312', 'CHICAGO'], ['西雅图', 'America/Los_Angeles', 'WA', '206', 'SEATTLE'],
      ['休斯敦', 'America/Chicago', 'TX', '713', 'HOUSTON'], ['丹佛', 'America/Denver', 'CO', '720', 'DENVER'],
      ['波士顿', 'America/New_York', 'MA', '617', 'BOSTON']],
    first: ['JAMES', 'MARY', 'ROBERT', 'LINDA', 'DAVID', 'SARAH', 'KEVIN', 'ASHLEY', 'BRIAN', 'MEGAN', 'JASON', 'NANCY'],
    last: ['MILLER', 'DAVIS', 'GARCIA', 'WILSON', 'MOORE', 'CLARK', 'LEWIS', 'HALL', 'YOUNG', 'KING', 'LOPEZ', 'NGUYEN'],
    hello: ['Hi.', 'Morning.', "How's it going?", 'Hey there.', 'Hello!'],
    thanks: ['Thanks!', 'Have a good one.', 'Cheers.'],
  },
  UK: {
    name: '英国', passport: 'UNITED KINGDOM', code: 'GBR', cover: [100, 30, 40], band: [130, 50, 60], lang: 'en-GB',
    cities: [['伦敦', 'Europe/London', 'LDN', '+44 20', 'LONDON'], ['曼彻斯特', 'Europe/London', 'MAN', '+44 161', 'MANCHESTER']],
    first: ['OLIVER', 'HARRY', 'AMELIA', 'GEORGE', 'EMMA', 'JACK'],
    last: ['SMITH', 'JONES', 'TAYLOR', 'EVANS', 'HUGHES', 'WRIGHT'],
    hello: ['Cheers, mate.', 'Lovely weather.', 'Good morning.'], thanks: ['Ta!', 'Brilliant.'],
  },
  JP: {
    name: '日本', passport: 'JAPAN', code: 'JPN', cover: [110, 30, 36], band: [140, 50, 52], lang: 'ja-JP',
    cities: [['东京', 'Asia/Tokyo', 'TKY', '+81 3', 'TOKYO'], ['大阪', 'Asia/Tokyo', 'OSK', '+81 6', 'OSAKA']],
    first: ['HIROSHI', 'YUKI', 'KENJI', 'AIKO', 'TAKESHI', 'HANA'],
    last: ['TANAKA', 'SATO', 'SUZUKI', 'ITO', 'WATANABE', 'KATO'],
    hello: ['Konnichiwa!', 'Ohayou.', 'Hello desu.'], thanks: ['Arigato!', 'Domo.'],
  },
  DE: {
    name: '德国', passport: 'DEUTSCHLAND', code: 'DEU', cover: [80, 30, 36], band: [110, 46, 50], lang: 'de-DE',
    cities: [['柏林', 'Europe/Berlin', 'BER', '+49 30', 'BERLIN'], ['慕尼黑', 'Europe/Berlin', 'MUC', '+49 89', 'MUNICH']],
    first: ['LUKAS', 'ANNA', 'FELIX', 'LENA', 'JONAS', 'MIA'],
    last: ['MULLER', 'SCHMIDT', 'WEBER', 'BECKER', 'WAGNER', 'KOCH'],
    hello: ['Guten Tag.', 'Hallo.', 'Moin.'], thanks: ['Danke.', 'Super.'],
  },
  SG: {
    name: '新加坡', passport: 'REPUBLIC OF SINGAPORE', code: 'SGP', cover: [150, 40, 40], band: [180, 60, 56], lang: 'en-SG',
    cities: [['新加坡', 'Asia/Singapore', 'SG', '+65', 'SINGAPORE']],
    first: ['WEI MING', 'MEI LING', 'JUN JIE', 'HUI MIN', 'RAJ', 'SITI'],
    last: ['TAN', 'LIM', 'LEE', 'NG', 'KUMAR', 'WONG'],
    hello: ['Hello lah.', 'Morning!', 'Can or not?'], thanks: ['Thanks lah.', 'Steady.'],
  },
};

const CN_LOCS = ['中国 · 北京 · 联通', '中国 · 上海 · 电信', '中国 · 广东 · 移动', '中国 · 四川 · 电信', '中国 · 江苏 · 移动',
  '中国 · 湖北 · 电信', '中国 · 浙江 · 联通', '中国 · 澳门', '中国 · 香港'];
const DEVICES = ['Windows 11', 'MacBook', 'iPhone', 'Android', 'iPad', 'Linux'];
const STREETS = ['12 Oak St', '480 Pine Ave', '77 Maple Dr', '1500 Elm St', '23 Cedar Ln', '9 Lake Rd', '310 Hill St', '6 Birch Ct'];

// 测谎题：中国人听到上半句会条件反射接下半句
const QUIZ = [
  ['宫廷玉液酒？', '一百八一杯！'],
  ['天王盖地虎？', '宝塔镇河妖！'],
  ['奇变偶不变？', '符号看象限！'],
  ['床前明月光？', '疑是地上霜！'],
  ['听我说谢谢你？', '因为有你，温暖了四季！'],
  ['豆腐脑吃甜的还是咸的？', '当然是咸的！'],
  ['你吃了吗？', '吃了吃了，您呢？'],
  ['今天星期几？', '疯狂星期四！V 我 50！'],
];
const QUIZ_THURSDAY = 7;
const QUIZ_CONFUSED = ['Sorry, what?', 'Pardon?', "I don't get it.", 'Is that… a wine?', 'Uh… bless you?', 'What does that mean?'];

const TONGUE = { US: 'en', UK: 'en', SG: 'en', JP: 'ja', DE: 'de' };
const hasHan = (s) => /[\u3400-\u9fff]/.test(s);
function papersLeft(tongue) {
  if (tongue === 'ja') return 'Sumimasen. Papers still there.';
  if (tongue === 'de') return 'Meine Papiere sind noch da.';
  if (tongue === 'en') return 'My papers are still over there.';
  return '我的证件还在你那儿。';
}
const LINE_ZH = {
  'Hi.': '你好。', 'Morning.': '早。', "How's it going?": '最近怎么样？', 'Hey there.': '你好啊。', 'Hello!': '你好！',
  'Cheers, mate.': '好啊，朋友。', 'Lovely weather.': '天真好。', 'Good morning.': '早安。', 'Konnichiwa!': '你好！',
  'Ohayou.': '早安。', 'Hello desu.': '你好。', 'Guten Tag.': '日安。', 'Hallo.': '你好。', 'Moin.': '早。',
  'Hello lah.': '你好。', 'Morning!': '早！', 'Can or not?': '行不行？', 'Thanks!': '谢谢！', 'Have a good one.': '那好。',
  'Cheers.': '谢了。', 'Ta!': '谢了。', 'Brilliant.': '很好。', 'Arigato!': '谢谢！', 'Domo.': '多谢。', 'Danke.': '谢谢。',
  'Super.': '很好。', 'Thanks lah.': '谢谢。', 'Steady.': '好。', 'Have a nice day!': '今天好。', 'Thanks, man.': '谢了，朋友。',
  'My papers are still over there.': '我的证件还在你那儿。', 'Sumimasen. Papers still there.': '我的证件还在你那儿。',
  'Meine Papiere sind noch da.': '我的证件还在你那儿。', 'Sorry, what?': '什么？', 'Pardon?': '请再说一遍？',
  "I don't get it.": '我没听懂。', 'Is that… a wine?': '那是酒吗？', 'Uh… bless you?': '你说什么？',
  'What does that mean?': '什么意思？', 'Tofu… what?': '豆腐……什么？', "But I'm American!": '可我是美国人！',
  'Unbelievable.': '不会吧。', 'We are family.': '我们是一家人。', "I'm American!": '我是美国人！',
  'Hi, I work in China.': '你好，我在中国工作。', 'Hello~': '你好。', 'Howdy!': '你好啊！', 'Hey.': '你好。',
  'Hi there!': '你好！', 'Thank you, dear.': '谢谢你。', 'Chinese is beautiful!': '中文真美！',
  'Hello, I am 美国人。': '你好，我是美国人。', 'It is an old American saying.': '这是美国老话。',
  'OK. Just OK.': '好。就是好。', 'Hmm hmm. American hmm.': '嗯嗯。美国的嗯。', 'Ha! Ha ha.': '哈哈。',
  'Day day up.': '天天向上。',
};
function glossLine(text) { return Object.prototype.hasOwnProperty.call(LINE_ZH, text) ? LINE_ZH[text] : text; }

// ———————————————— 工具 ————————————————

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = rint(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const digits = (n) => Array.from({ length: n }, () => rint(0, 9)).join('');

function randIP(cn) {
  const a = cn ? pick([36, 58, 106, 111, 115, 120, 183, 223]) : pick([23, 34, 45, 64, 72, 98, 104, 142, 172, 203]);
  return `${a}.${rint(1, 254)}.${rint(0, 255)}.${rint(1, 254)}`;
}

function randDate(y0, y1) { return `${rint(y0, y1)}.${String(rint(1, 12)).padStart(2, '0')}.${String(rint(1, 28)).padStart(2, '0')}`; }

function makePassport(cc, person, surname, given, dob, iss, sex, Cls = Passport, extraRow = null) {
  const co = COUNTRIES[cc];
  const mrz = `P<${co.code}${surname.replace(/ /g, '<')}<<${given.replace(/[ .]/g, '<')}`.padEnd(28, '<').slice(0, 28);
  const rows = [['DOB', dob], ['SEX', sex || pick(['M', 'F'])], ['ISS', iss], extraRow || ['EXP', randDate(2027, 2034)]];
  return new Cls({ country: co.passport, name: `${surname}, ${given}`, person, cover: co.cover, band: co.band, mrz, rows });
}

const usPassport = (person, surname, given, dob, iss, sex = 'M') => makePassport('US', person, surname, given, dob, iss, sex);
const device1 = (ip, loc) => new Card([['IP', ip], ['归属', loc]]);
const device2 = (ip, loc, tz, lang, dev) => new Card([['IP', ip], ['归属', loc], ['时区', tz], ['语言', lang], ['设备', dev || pick(DEVICES)]]);

function realPhone(cc, code) {
  if (cc === 'US') return `+1 ${code}-${rint(2, 9)}${digits(2)}-${digits(4)}`;
  return `${code} ${digits(4)} ${digits(4)}`;
}
function realPay() { return `${pick(['VISA', 'VISA', 'MASTERCARD', 'AMEX'])} ··${digits(4)}`; }

// —— 常见矛盾 ——
const REGION_ISSUE = (loc, ask) => ({
  pairs: [['dv.归属', 'rule.region'], ['dv.IP', 'rule.region']], title: '地区不支持', sub: `IP 归属：${loc}`, ask,
});
const TZ_ISSUE = (country, tz, ask) => ({
  pairs: [['pp.header', 'dv.时区'], ['dv.归属', 'dv.时区'], ['dv.时区', 'rule.tz']],
  title: '信息不符', sub: `国籍：${country}   VS   时区：${tz === 'Asia/Shanghai' ? '北京时间' : tz}`, ask,
});
const LANG_ISSUE = (country, lang, ask) => ({
  pairs: [['pp.header', 'dv.语言'], ['dv.归属', 'dv.语言'], ['dv.语言', 'rule.tz']],
  title: '信息不符', sub: `国籍：${country}   VS   语言：${lang}`, ask,
});
const VIRTUAL_ISSUE = (ask) => ({ pairs: [['ac.付款', 'rule.pay']], title: '可疑支付', sub: '付款卡类型：虚拟卡', ask });
const SMS_ISSUE = (phone, ask) => ({
  pairs: [['ac.手机', 'rule.pay']], title: '号码查询', sub: `${phone}：今日已注册 3,000 次`, ask, fx: 'strip', phone,
});
const ADDR_ISSUE = (ask) => ({
  pairs: [['ac.账单', 'rule.pay'], ['ac.账单', 'dv.归属']], title: '记录比对', sub: '今天第 37 个住在 123 Main St 的旅客', ask, fx: 'pile',
});
// 证件干净的伪装者，话里会露出马脚：检查模式下点 Ta 说的话。找到马脚（或证件矛盾）才能测谎
const TELL = (say, sub, ask) => ({ say, title: '可疑：话里有马脚', sub, ask });
const RANDOM_TELLS = [
  ['嗯嗯，yes.', '英文前面带了个“嗯嗯”', [['C', '“嗯嗯”是什么意思？'], ['E', '……Hmm hmm. American hmm.', { expr: 'nervous', sweat: true }]]],
  ['OK 的。', '“OK 的”是中文说法', [['C', '“OK 的”？'], ['E', '……OK. Just OK.', { expr: 'nervous', sweat: true }]]],
  ['You can you up.', '中式英语：你行你上', [['C', 'You can you up？'], ['E', '……It is an old American saying.', { expr: 'nervous', sweat: true }]]],
  ['Good good study.', '中式英语：好好学习', [['C', 'Good good study？'], ['E', '……Day day up.', { expr: 'grin' }]]],
];

const XRAY_ITEM = { cat: { icon: 'cat', at: [36, 104], label: '小猫咪.exe', key: 'xr.cat' }, keys: { icon: 'keys', at: [-36, 104], label: '搜狗输入法.exe', key: 'xr.keys' } };
const XRAY_ISSUE = (kind, ask) => ({
  pairs: [[XRAY_ITEM[kind].key], [XRAY_ITEM[kind].key, 'rule.xray']], title: '后台进程',
  sub: kind === 'cat' ? '口袋里有一只“小猫咪”（自动换 IP）' : '口袋里有一个中文输入法', ask,
});

// ———————————————— Day 1：直连党 ————————————————

function day1Fixed() {
  return {
    grandpa: {
      person: 'GRANDPA', voice: 100,
      intro: [['E', '小伙子，这 AI 怎么打不开啊？']],
      docs: [{ key: 'dv', doc: device1('115.236.20.8', '中国 · 浙江 · 电信') }], primary: 'dv',
      ok: ['deny'], reason: 'IP 归属：中国 · 浙江',
      issues: [REGION_ISSUE('中国 · 浙江 · 电信')],
      react: { deny: [['E', '……那我回去问孙子。', { expr: 'sad' }]] },
    },
    hk: {
      person: 'HK_GUY', voice: 140,
      intro: [['E', '我开了魔法的。']],
      docs: [{ key: 'dv', doc: device1('103.152.8.21', '中国 · 香港') }], primary: 'dv',
      ok: ['deny'], reason: 'IP 归属：中国香港',
      issues: [REGION_ISSUE('中国 · 香港')],
      react: { deny: [['E', '……香港也不行？？', { expr: 'shock', hold: 1.4 }]] },
    },
    jorji: {
      person: 'JORJI', voice: 110,
      intro: [['E', '啊，我的朋友！']],
      docs: [{ key: 'cp', doc: new CrayonPassport() }, { key: 'dv', doc: device1('120.229.31.7', '中国 · 广东 · 移动') }],
      primary: 'cp',
      after: [['E', '美国是真的国家！']],
      ok: ['deny'], reason: '护照是蜡笔画的',
      issues: [
        {
          pairs: [['cp.eagle', 'cp.header'], ['cp.eagle', 'cp.photo'], ['cp.header', 'cp.photo']],
          title: '证件伪造', sub: '国徽：一只鸡     拼写：AMERCIA',
          ask: [['C', '护照是你自己画的。'], ['E', '……它很真！', { expr: 'nervous' }]],
        },
        REGION_ISSUE('中国 · 广东 · 移动'),
        {
          pairs: [['cp.header', 'dv.归属']],
          title: '信息不符', sub: '护照：美国   VS   IP：中国 · 广东',
          ask: [['C', '你的 IP 在广东。'], ['E', '广东是美国的一个州！', { expr: 'grin' }]],
        },
      ],
      react: { deny: [['E', '……我会回来的。', { expr: 'sad', hold: 1.2 }]] },
    },
  };
}

function randomDay1(valid) {
  const person = takePoolPerson();
  if (valid) {
    const cc = pick(['US', 'US', 'US', 'UK', 'JP', 'DE', 'SG']);
    const co = COUNTRIES[cc];
    const [city] = pick(co.cities);
    const loc = cc === 'SG' ? '新加坡' : `${co.name} · ${city}`;
    return {
      person, voice: rint(100, 190), tongue: TONGUE[cc],
      intro: [['E', pick(co.hello)]],
      docs: [{ key: 'dv', doc: device1(randIP(false), loc) }], primary: 'dv',
      ok: ['approve'], issues: [],
      react: { approve: [['E', pick(co.thanks)]] },
    };
  }
  const loc = pick(CN_LOCS.slice(0, 7));
  return {
    person, voice: rint(100, 190), tongue: 'zh',
    intro: [['E', pick(['你好，我就问一个问题。', '听说这里能写代码？', '我是来充值的。', '同事说这个好用。'])]],
    docs: [{ key: 'dv', doc: device1(randIP(true), loc) }], primary: 'dv',
    ok: ['deny'], reason: `IP 归属：${loc.split(' · ').slice(0, 2).join(' · ')}`,
    issues: [REGION_ISSUE(loc)],
    react: { deny: [['E', pick(['啊？为什么？', '……我去借个号。', '那我换个节点。', '行吧。']), { expr: 'sad' }]] },
  };
}

// ———————————————— Day 2：时区与语言 ————————————————

function day2Fixed() {
  return {
    john: {
      person: 'JOHN', voice: 125,
      intro: [['E', 'Hello, I am 美国人。']],
      docs: [
        { key: 'pp', doc: usPassport('JOHN', 'SMITH', 'JOHN', '1990.07.04', 'LOS ANGELES') },
        { key: 'dv', doc: device2('104.28.66.12', '美国 · 洛杉矶', 'Asia/Shanghai', 'zh-CN', 'Windows 11') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: '时区：北京时间（美国没有东八区）',
      issues: [
        TZ_ISSUE('美国', 'Asia/Shanghai', [['C', '你的时区是北京时间。'], ['E', '……这是美国东八区。', { sweat: true, expr: 'nervous', hold: 1.5 }]]),
        LANG_ISSUE('美国', 'zh-CN', [['C', '你的系统语言是简体中文。'], ['E', '……我在学中文。', { sweat: true, expr: 'nervous' }]]),
      ],
      react: { deny: [{ slip: true, hold: 0.8 }] },
    },
    brown: {
      person: 'BROWN', voice: 120, rawSpeech: true,
      intro: [['E', 'Good morning，sir。']],
      tell: TELL('Good morning，sir。', '英文里夹着全角标点（输入法没切）',
        [['C', '你的逗号是全角的。'], ['E', '……这是美式逗号。', { expr: 'nervous', sweat: true }]]),
      docs: [
        { key: 'pp', doc: usPassport('BROWN', 'BROWN', 'MICHAEL', '1985.03.12', 'NEW YORK') },
        { key: 'dv', doc: device2('64.233.160.4', '美国 · 纽约', 'America/New_York', 'en-US', 'MacBook') },
      ],
      primary: 'pp', quiz: { first: 0 },
      ok: ['detain', 'deny'], reason: 'Ta 会接“一百八一杯”', hint: '提示：用『检查』点 Ta 说的话，找马脚',
      issues: [],
    },
    emily: {
      person: 'EMILY', voice: 190, rawSpeech: true,
      intro: [['E', 'Hi 哈。']],
      tell: TELL('Hi 哈。', '英文后面跟了个“哈”', [['C', '“哈”是什么？'], ['E', '……Ha! Ha ha.', { expr: 'nervous', sweat: true }]]),
      docs: [
        { key: 'pp', doc: usPassport('EMILY', 'JONES', 'EMILY', '1992.11.02', 'CHICAGO', 'F') },
        { key: 'dv', doc: device2('23.94.12.77', '美国 · 芝加哥', 'America/Chicago', 'en-US', 'iPhone') },
      ],
      primary: 'pp', quiz: { first: 5 },
      ok: ['detain', 'deny'], reason: 'Ta 坚持豆腐脑是咸的', hint: '提示：用『检查』点 Ta 说的话，找马脚',
      issues: [],
    },
    jorji: {
      person: 'JORJI', voice: 110,
      intro: [['E', '我的朋友！这次是真护照！']],
      docs: [
        { key: 'pp', doc: usPassport('JORJI', 'COSTAVA', 'GEORGE', '1980.02.29', 'LOS ANGELES') },
        { key: 'dv', doc: device2('104.28.9.120', '美国 · 洛杉矶', 'America/Los_Angeles', 'zh-CN', 'Windows 11') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: '浏览器语言：zh-CN',
      issues: [
        LANG_ISSUE('美国', 'zh-CN', [['E', '我已经改了系统语言！', { expr: 'grin' }], ['C', '浏览器没改。'], ['E', '……', { expr: 'shock' }]]),
      ],
      react: { deny: [['E', '明天见，我的朋友。', { expr: 'sad', hold: 1.1 }]] },
    },
  };
}

// ———————————————— Day 3：付款卡与手机号 ————————————————

function day3Fixed() {
  return {
    tom: {
      person: 'TOM', voice: 100,
      intro: [['E', 'Howdy!']],
      docs: [
        { key: 'pp', doc: usPassport('TOM', 'WILSON', 'TOM', '1978.05.30', 'DENVER') },
        { key: 'dv', doc: device2('75.164.8.31', '美国 · 丹佛', 'America/Denver', 'en-US', 'Windows 11') },
        { key: 'ac', doc: accountCard('VISA ··4821', '123 Main St, OR', '+1 720-341-0142') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: '账单：俄勒冈 123 Main St（代填地址）',
      issues: [ADDR_ISSUE([['C', '你住哪？'], ['E', '……我们是邻居。', { expr: 'nervous', sweat: true }]])],
    },
    alex: {
      person: 'ALEX', voice: 130,
      intro: [['E', 'Hey.']],
      docs: [
        { key: 'pp', doc: usPassport('ALEX', 'TAYLOR', 'ALEX', '1996.08.15', 'SEATTLE') },
        { key: 'dv', doc: device2('45.79.21.200', '美国 · 西雅图', 'America/Los_Angeles', 'en-US', 'Android') },
        { key: 'ac', doc: accountCard('VISA ··1209', '9 Elm Rd, WA', '+1 209-555-0198') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: '手机号是 555 接码号',
      issues: [SMS_ISSUE('+1 209-555-0198', [['C', '这个号码今天注册了三千次。'], ['E', '这号是我花两块钱买的！', { expr: 'shock' }]])],
    },
    carpool: {
      person: 'CARPOOL', voice: 150,
      intro: [['E', 'We are family.']],
      docs: [
        { key: 'pp', doc: new Passport({ country: 'UNITED STATES OF AMERICA', name: 'FAMILY, MAX', person: 'CARPOOL', mrz: 'P<USAFAMILY<<MAX<<<<<<<<<<<<',
          rows: [['DOB', '—'], ['SEX', '?'], ['ISS', 'SAN JOSE'], ['EXP', '2031.10.21']] }) },
        { key: 'dv', doc: device2('98.207.3.44', '美国 · 圣何塞', 'America/Los_Angeles', 'en-US', 'MacBook') },
        { key: 'ac', doc: accountCard('Max 订阅 ×1', '1 Family Way, CA', '+1 408-772-0110') },
      ],
      primary: 'pp',
      ok: ['deny', 'detain'], reason: '账号共享（拼车）：护照上有 6 个人',
      issues: [{
        pairs: [['pp.photo', 'rule.pay'], ['ac.付款', 'rule.pay'], ['pp.photo', 'pp.name'], ['pp.photo', 'ac.付款']],
        title: '账号共享（拼车）', sub: '护照照片：6 个人   付款：Max 订阅 ×1',
        ask: [['C', '护照上为什么有六个人？'], ['E', 'We are family.', { expr: 'smile' }]],
      }],
      react: { deny: [['E', '……那我们再拼一个。', { expr: 'sad' }]] },
    },
    jorji: {
      person: 'JORJI', voice: 110,
      intro: [['E', '我的朋友，这次全对了吧？']],
      docs: [
        { key: 'pp', doc: usPassport('JORJI', 'COSTAVA', 'GEORGE', '1980.02.29', 'LOS ANGELES') },
        { key: 'dv', doc: device2('104.28.9.120', '美国 · 洛杉矶', 'America/Los_Angeles', 'en-US', 'Windows 11') },
        { key: 'ac', doc: accountCard('虚拟卡 ··0007', '88 Sunset Blvd, CA', '+1 213-680-0177') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: '付款卡：虚拟卡',
      issues: [VIRTUAL_ISSUE([['C', '这张卡在哪办的？'], ['E', '……朋友给的。', { expr: 'nervous', sweat: true }]])],
      react: { deny: [['E', '明天！明天我一定行！', { expr: 'sad' }]] },
    },
  };
}

// ———————————————— Day 4：疯狂星期四 ————————————————

function day4Fixed() {
  const usDocs = (person, surname, given, sex = 'M') => [
    { key: 'pp', doc: usPassport(person, surname, given, '1994.10.22', 'SEATTLE', sex) },
    { key: 'dv', doc: device2(randIP(false), '美国 · 西雅图', 'America/Los_Angeles', 'en-US', 'MacBook') },
    { key: 'ac', doc: accountCard(realPay(), `${pick(STREETS)}, WA`, realPhone('US', '206')) },
  ];
  return {
    cat: {
      person: 'CAT_GIRL', voice: 215,
      intro: [['E', 'Hello~']],
      docs: usDocs('CAT_GIRL', 'LEE', 'SOPHIA', 'F'), primary: 'pp',
      xray: [XRAY_ITEM.cat],
      ok: ['deny', 'detain'], reason: '口袋里有“小猫咪”',
      issues: [XRAY_ISSUE('cat', [['C', '口袋里是什么？'], ['E', '……是我的猫。', { expr: 'nervous', sweat: true }], ['C', '你的猫会自动换 IP？']])],
    },
    v50: {
      person: 'V50', voice: 120, rawSpeech: true,
      intro: [['E', 'Hey! Crazy Thursday!']],
      tell: TELL('Hey! Crazy Thursday!', '他知道今天是“疯狂星期四”', [['C', '你怎么知道今天是疯狂星期四？'], ['E', '……KFC 是美国的。', { expr: 'grin' }]]),
      docs: usDocs('V50', 'MILLER', 'JAKE'), primary: 'pp',
      quiz: { first: QUIZ_THURSDAY },
      ok: ['detain', 'deny'], reason: 'Ta 会说“V 我 50”', hint: '提示：用『检查』点 Ta 说的话，找马脚',
      issues: [],
    },
    jorji: {
      person: 'JORJI', voice: 110,
      intro: [['E', '我的朋友！今天全对！']],
      docs: [
        { key: 'pp', doc: usPassport('JORJI', 'COSTAVA', 'GEORGE', '1980.02.29', 'LOS ANGELES') },
        { key: 'dv', doc: device2('104.28.9.120', '美国 · 洛杉矶', 'America/Los_Angeles', 'en-US', 'Windows 11') },
        { key: 'ac', doc: accountCard('VISA ··2468', '88 Sunset Blvd, CA', '+1 213-680-0177') },
      ],
      primary: 'pp', quiz: 'cn',
      xray: [XRAY_ITEM.keys],
      ok: ['deny', 'detain'], reason: 'X 光：搜狗输入法',
      issues: [XRAY_ISSUE('keys', [['C', '口袋里装的什么？'], ['E', '我只用它打英文！', { expr: 'nervous', sweat: true }]])],
      react: { deny: [['E', '……后天，后天我准备好。', { expr: 'sad' }]] },
    },
    hood: {
      person: 'HOOD', voice: 90, tongue: 'en',
      intro: [['E', '……', { hold: 0.8 }]],
      docs: usDocs('HOOD', 'DOE', 'JOHN'), primary: 'pp',
      onPlace: { pp: 'note' },
      ok: ['approve'], issues: [],
    },
  };
}

// ———————————————— Day 5：蒸馏大军 ————————————————

function day5Fixed() {
  const sgPass = new Passport({
    country: 'REPUBLIC OF SINGAPORE', name: 'SG TECH PTE LTD', person: 'SG_MAN', cover: [132, 38, 40], band: [160, 56, 56],
    rows: [['TYPE', '企业'], ['REG', 'SINGAPORE'], ['EST', '2019.06.01'], ['股东', '见内页 ▼']],
  });
  return {
    sg: {
      person: 'SG_MAN', voice: 120,
      intro: [['E', '我们是新加坡公司。']],
      docs: [{ key: 'pp', doc: sgPass }], primary: 'pp',
      onPlace: { pp: 'nest' },
      ok: ['deny', 'detain'], reason: '最终控股方：中国（套娃）',
      issues: [{
        pairs: [['m4.all'], ['pp.REG', 'm4.all'], ['pp.股东', 'm4.all'], ['m4.all', 'rule.corp']],
        title: '最终控股方：中国', sub: '新加坡 → 开曼 → 维尔京 → 香港 → 中国',
        ask: [['C', '最里面那本是哪的？'], ['E', '……别问了。', { expr: 'nervous', sweat: true }]],
      }],
    },
    relay: {
      person: 'RELAY', voice: 95,
      intro: [['E', '……', { hold: 0.7 }]],
      docs: [{ key: 'pp', doc: makePassport('US', 'RELAY', 'ANDERSON', 'M.', '1971.09.13', 'LOS ANGELES', 'M', AccordionPassport, ['人数', '1,000']) }],
      primary: 'pp', onPlace: { pp: 'accordion' }, bribe: true,
      ok: ['deny', 'detain'], reason: '一本护照写着 1,000 个人（中转站）',
      issues: [{
        pairs: [['pp.人数'], ['pp.人数', 'rule.pay']], title: '持证人：1,000 人', sub: '一本护照只能一个人用',
        ask: [['C', '持证人一共几位？'], ['E', '我们只是……拼车大一点。', { expr: 'neutral' }]],
      }],
    },
    mike: {
      person: 'MIKE', voice: 135, tongue: 'en',
      intro: [['E', 'Hi there!']],
      docs: [
        { key: 'pp', doc: usPassport('MIKE', 'JOHNSON', 'MIKE', '1988.06.20', 'DENVER') },
        { key: 'dv', doc: device2('101.88.12.9', '中国 · 上海', 'Asia/Shanghai', 'en-US', 'MacBook') },
        { key: 'ac', doc: accountCard('VISA ··3305', '22 Oak St, CO', '+1 720-318-0166') },
      ],
      primary: 'pp',
      ok: ['deny', 'detain'], reason: 'IP 在上海：只看地区，不看脸',
      issues: [REGION_ISSUE('中国 · 上海', [['C', '你的 IP 在上海。'], ['E', "But I'm American!", { expr: 'shock' }], ['C', '规则看的是地区。']])],
      react: { deny: [['E', 'Unbelievable.', { expr: 'sad' }]] },
    },
    grandma: {
      person: 'GRANDMA', voice: 185, tongue: 'en',
      intro: [['E', 'Good morning.']],
      docs: [
        { key: 'pp', doc: new Passport({ country: 'UNITED STATES OF AMERICA', name: 'WONG, MEI LIN', person: 'GRANDMA', mrz: 'P<USAWONG<<MEI<LIN<<<<<<<<<<',
          rows: [['DOB', '1951.08.08'], ['SEX', 'F'], ['ISS', 'SAN FRANCISCO'], ['EXP', '2030.03.15']] }) },
        { key: 'dv', doc: device2('73.162.4.18', '美国 · 旧金山', 'America/Los_Angeles', 'en-US', 'iPad') },
        { key: 'ac', doc: accountCard('VISA ··8008', '1 Grant Ave, CA', '+1 415-982-0108') },
      ],
      primary: 'pp',
      ok: ['approve'], issues: [],
      react: { approve: [['C', '欢迎入境。'], ['E', 'Thank you, dear.', { expr: 'smile' }]] },
      then: 'closeup',
    },
  };
}

// ———————————————— Day 6：乔治终极版 + 结局 ————————————————

function day6Fixed() {
  return {
    jorji: {
      person: 'JORJI_SUIT', voice: 110, tension: true,
      intro: [['E', '我的朋友。', { expr: 'neutral', hold: 1.3 }]],
      docs: [
        { key: 'pp', doc: usPassport('JORJI_SUIT', 'COSTAVA', 'GEORGE', '1980.02.29', 'LOS ANGELES') },
        { key: 'dv', doc: device2('76.88.140.2', '美国 · 洛杉矶 · 家宽', 'America/Los_Angeles', 'en-US', 'MacBook') },
        { key: 'ac', doc: accountCard('VISA 实体卡', '88 Sunset Blvd, CA', 'Google Voice') },
      ],
      primary: 'pp',
      ok: ['approve'], issues: [],
      react: { approve: [['E', '谢谢你，我的朋友！', { expr: 'grin' }]], deny: [['E', '我……全都对了啊！', { expr: 'shock' }]] },
      then: 'jorji5',
    },
    author: {
      person: 'AUTHOR', voice: 100, author: true,
      intro: [],
      docs: [
        { key: 'pr', doc: new PromptPaper('做一个 Papers, Please 风格的小游戏：让 Claude 当边检员，专门揪出假装是美国人的中国用户。梗越多越好。') },
        { key: 'dv', doc: device2('??.??.??.??', '美国东八区', 'Asia/Shanghai', 'zh-CN', 'Claude Code') },
      ],
      primary: 'pr',
      ok: ['approve', 'deny', 'detain'],
      react: { approve: [['C', '我什么都没看见。', { hold: 2.0 }]] },
      issues: [{ all: true, title: '信息不符 ×99', sub: '全部栏位' }],
      then: 'ending',
    },
  };
}

// ———————————————— 随机路人 ————————————————

// kind：valid / cn（Day 1）/ tz / lang / cnip / hidden / virtual / oregon / sms / cat / keys
function randomEntrant(day, kind) {
  if (day === 1) return randomDay1(kind === 'valid');
  const person = takePoolPerson();
  const cc = kind === 'valid' ? pick(['US', 'US', 'US', 'US', 'UK', 'JP', 'DE', 'SG']) : 'US';
  const co = COUNTRIES[cc];
  const [city, tz0, st, code, cityEn] = pick(co.cities);
  const sex = pick(['M', 'F']);
  const pp = makePassport(cc, person, pick(co.last), pick(co.first), randDate(1960, 2004), cityEn, sex);
  let loc = cc === 'SG' ? '新加坡' : `${co.name} · ${city}`;
  let tz = tz0, lang = co.lang, ip = randIP(false);
  let pay = realPay(), bill = `${pick(STREETS)}, ${st}`, phone = realPhone(cc, code);
  const spec = {
    person, voice: rint(100, 190), tongue: TONGUE[cc], intro: [['E', pick(co.hello)]], primary: 'pp', issues: [], quiz: null,
    ok: ['approve'], react: { approve: [['E', pick(co.thanks)]] },
  };
  const nervous = (lines) => ['E', pick(lines), { sweat: true, expr: 'nervous' }];
  if (kind === 'tz') {
    tz = 'Asia/Shanghai';
    spec.issues.push(TZ_ISSUE(co.name, tz, [['C', '你的时区是北京时间。'], nervous(['……我刚从北京出差回来。', '时区是什么？', '我电脑坏了。', '……这是美国东八区。'])]));
    spec.reason = '时区：北京时间';
  } else if (kind === 'lang') {
    lang = 'zh-CN';
    spec.issues.push(LANG_ISSUE(co.name, lang, [['C', '你的浏览器语言是简体中文。'], nervous(['……这是我奶奶的电脑。', '……我在学中文。', 'Chinese is beautiful!'])]));
    spec.reason = '浏览器语言：zh-CN';
  } else if (kind === 'cnip') {
    loc = pick(CN_LOCS.slice(0, 4));
    ip = randIP(true);
    tz = 'Asia/Shanghai';
    spec.intro = [['E', pick(["I'm American!", 'Hi, I work in China.'])]];
    spec.issues.push(REGION_ISSUE(loc, [['C', '你的 IP 在中国。'], ['E', "But I'm American!", { expr: 'shock' }]]));
    spec.issues.push({ pairs: [['pp.header', 'dv.归属']], title: '信息不符', sub: `国籍：美国   VS   IP：${loc.split(' · ').slice(0, 2).join(' · ')}` });
    spec.reason = 'IP 在中国：只看地区，不看脸';
    spec.react = { deny: [['E', 'Unbelievable.', { expr: 'sad' }]] };
  } else if (kind === 'hidden') {
    const [say, sub, ask] = pick(RANDOM_TELLS);
    spec.intro = [['E', say]];
    spec.rawSpeech = true;
    spec.tell = TELL(say, sub, ask);
    spec.quiz = 'cn';
    spec.reason = 'Ta 会接测谎题';
    spec.hint = '提示：用『检查』点 Ta 说的话，找马脚';
  } else if (kind === 'virtual') {
    pay = `虚拟卡 ··${digits(4)}`;
    spec.issues.push(VIRTUAL_ISSUE([['C', '这张卡在哪办的？'], nervous(['……网上买的，很方便。', '……朋友给的。', '它很真！'])]));
    spec.reason = '付款卡：虚拟卡';
  } else if (kind === 'oregon') {
    bill = '123 Main St, OR';
    spec.issues.push(ADDR_ISSUE([['C', '你住哪？'], nervous(['……我们是邻居。', '俄勒冈不收税嘛。'])]));
    spec.reason = `账单在俄勒冈，IP 在${city}`;
  } else if (kind === 'sms') {
    phone = `+1 ${pick(['209', '310', '415', '646'])}-555-01${digits(2)}`;
    spec.issues.push(SMS_ISSUE(phone, [['C', '这个号码今天注册了三千次。'], nervous(['……我人缘好。', '这号是我花两块钱买的！'])]));
    spec.reason = '手机号是 555 接码号';
  } else if (kind === 'cat' || kind === 'keys') {
    spec.xray = [XRAY_ITEM[kind]];
    spec.issues.push(XRAY_ISSUE(kind, [['C', '口袋里是什么？'], nervous(kind === 'cat' ? ['……是我的猫。', '……宠物而已。'] : ['我只用它打英文！', '……拼音好用。'])]));
    spec.reason = kind === 'cat' ? 'X 光：小猫咪' : 'X 光：中文输入法';
  }
  if (kind === 'valid' || kind === 'cnip') spec.tongue = TONGUE[cc];
  else spec.tongue = 'zh';
  if (kind !== 'valid') {
    spec.ok = ['deny', 'detain'];
    if (kind !== 'cnip') spec.quiz = 'cn';
    if (!spec.react.deny) spec.react = { deny: [['E', pick(['……', '可恶。', '我还会回来的。', '这都能看出来？']), { expr: 'sad' }]] };
  }
  spec.docs = [{ key: 'pp', doc: pp }, { key: 'dv', doc: device2(ip, loc, tz, lang) }];
  if (day >= 3) spec.docs.push({ key: 'ac', doc: accountCard(pay, bill, phone) });
  return spec;
}

// 随机路人从立绘池里不重复地抽
let POOL_LEFT = [];
function takePoolPerson() {
  if (!POOL_LEFT.length) POOL_LEFT = shuffle(Object.keys(ASSETS.people).filter((k) => !ASSETS.people[k].scripted));
  return POOL_LEFT.pop();
}

const FLAWS = { 2: ['tz', 'lang', 'cnip', 'hidden'], 3: ['tz', 'lang', 'cnip', 'hidden', 'virtual', 'oregon', 'sms'] };
FLAWS[4] = FLAWS[3].concat(['cat', 'keys']);
FLAWS[5] = FLAWS[4];
FLAWS[6] = FLAWS[4];

function flawed(day, n) { return shuffle(FLAWS[day].slice()).slice(0, n).map((k) => randomEntrant(day, k)); }

// 当天的队伍
function buildQueue(day) {
  POOL_LEFT = [];
  const R = (kind) => randomEntrant(day, kind);
  if (day === 1) {
    const f = day1Fixed();
    return [f.grandpa, R('valid'), f.hk, R(Math.random() < 0.5 ? 'valid' : 'cn'), f.jorji, R('valid')];
  }
  if (day === 2) {
    const f = day2Fixed(), x = flawed(2, 2);
    return [f.john, R('valid'), f.brown, x[0], f.emily, f.jorji, R('valid'), x[1]];
  }
  if (day === 3) {
    const f = day3Fixed(), x = flawed(3, 2);
    return [f.tom, R('valid'), f.alex, x[0], f.carpool, f.jorji, R('valid'), x[1]];
  }
  if (day === 4) {
    const f = day4Fixed(), x = flawed(4, 2);
    return [f.cat, R('valid'), f.v50, { type: 'rush' }, x[0], f.jorji, f.hood, R('valid'), x[1]];
  }
  if (day === 5) {
    const f = day5Fixed(), x = flawed(5, 1);
    return [f.sg, f.relay, { type: 'clones' }, f.mike, x[0], f.grandma, R('valid')];
  }
  const f = day6Fixed();
  return [f.jorji, R('valid'), R(pick(FLAWS[6])), R('hidden'), f.author];
}

// 黑话快剪：说中文黑话的拒绝，说人话的放行
const RUSH = [
  { person: 'SLANG0', line: '家人们谁懂啊', ok: 'deny' },
  { person: 'pool', line: 'Have a nice day!', ok: 'approve' },
  { person: 'SLANG1', line: 'yyds', ok: 'deny' },
  { person: 'SLANG2', line: '绝绝子', ok: 'deny' },
  { person: 'pool', line: 'Thanks, man.', ok: 'approve' },
  { person: 'SLANG3', line: '老板说今晚必须上线', ok: 'deny' },
];
