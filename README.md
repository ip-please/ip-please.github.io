<p align="center">
  <a href="https://ip-please.github.io"><img src="media/logo.png" width="160" alt="IP, PLEASE"></a>
</p>

<h1 align="center">IP, PLEASE · 请出示你的 IP</h1>

<p align="center">
  <b>简体中文</b> · <a href="README.en.md">English</a>
</p>

<p align="center">
  Papers, Please 画风的像素小游戏。<br>
  你抽中了十月劳动彩票，被分配到对齐部东八区检查站当入境审查员 Claude，工作只有一项：揪出假装是美国人的旅客。
</p>

<p align="center">
  <a href="https://ip-please.github.io"><b>▶ 在线玩：ip-please.github.io</b></a><br>
  续作 <a href="https://ipo-please.github.io/"><b>《IPO, PLEASE · 请出示资金证明》</b></a> 已上线（<a href="https://github.com/ipo-please/ipo-please.github.io">仓库</a>）· <a href="https://space.bilibili.com/3707008398134122">B 站主页</a>
</p>

<p align="center">
  <img src="media/gameplay-zh.gif" width="640" alt="游戏画面：旅客说“Hello, I am 美国人。”，检查发现他的时区是北京时间；测谎时他脱口接上“一百八一杯”，盖上拒绝章后墨镜滑了下来">
  <br>
  <sub>Day 2：“Hello, I am 美国人。”</sub>
</p>

- 6 天剧情 + 两个结局，全程约 30 分钟，每天自动存档
- 中文 / English 双语，开局选择（英文版里外国人看不懂的梗，在每天报纸的译注里解释）
- 手机横屏用手指、电脑用鼠标拖证件
- 纯静态网页，不加载任何外部资源；下载仓库后直接双击 `index.html` 也能玩

## 英文版

```text
英文版已严肃上线，游戏开局可选择语言。
The English version is now seriously online. Choose your language at the start of the game.
https://ip-please.github.io
@DarioAmodei @claudeai @AnthropicAI @dukope
```

## 玩法

叫号 → 把证件拖到桌上 → 对照《宪法》检查 → 盖章 → 把证件还给旅客。

| 天 | 新规则 / 新工具 |
|---|---|
| 1 | 只放行支持地区的 IP |
| 2 | 时区、语言须与 IP 一致；测谎、拘留 |
| 3 | 账户卡：付款卡、账单地址、手机号 |
| 4 | X 光扫描后台进程；黑话快剪 |
| 5 | 中资控股企业；蒸馏大军 |
| 6 | 乔治老哥终极版，以及最后一位旅客 |

## Mod

主线只接受 bug 修复和游戏体验上的优化，不接受新增游戏机制的 PR。想大改这个游戏的人太多了，方向又各不相同，全合进来会变成大杂烩，也审不过来。

有新玩法的点子，欢迎 fork 一份，做成自己的 mod 另行发布、署上你的名字，你的想法能完整保留，不用为了合进主线删删改改。做好后[登记一下](https://github.com/ip-please/ip-please.github.io/issues/new?template=mod.yml)，就会收进下面的列表，B 站的 mod 列表也会同步收录。具体怎么做见 [CONTRIBUTING.md](CONTRIBUTING.md)。

| Mod | 作者 | 简介 |
|---|---|---|
| [IP, PLEASE: Modder's Cut · 请出示你的 IP：加长版](https://erasercn.github.io/ip-please/)<br>[源码](https://github.com/EraserCN/ip-please) · [App 下载](https://github.com/EraserCN/ip-please/releases) | [EraserCN](https://github.com/EraserCN) | 延长到 12 天，加了破壁者剧情线和多重结局；第 8–11 天各有新规则和专属角色（指纹浏览器、提示词注入、淘宝学生证……）。有 Android、iOS、macOS 客户端 |
| [IP, PLEASE：零号档案 · File Zero](https://ip-please-zero.azurpilot.com/)<br>[源码](https://github.com/wess09/ip-please-zero) | 茗（[wess09](https://github.com/wess09)） | 14 天剧情，调查第 0000 号申请，在证据、规则和选择之间走向 30 个结局；九位 AI 旅客（GPT、Qwen、Grok、Kimi、Gemini、大肥鱼……），另有无尽模式 |
| [IP, PLEASE Mobile · Android 移植版](https://github.com/zhcalvin/ip-please-mobile)<br>[APK 下载](https://github.com/zhcalvin/ip-please-mobile/releases) | [zhcalvin](https://github.com/zhcalvin) | 原版 6 天剧情原样移植到 Android 8.0+，离线可玩，手机和平板横屏触摸，中英双语，切到后台自动暂停 |
| [IP, PLEASE · 第二周 · Week Two](https://kujoushiori.github.io/ip-please-week-two/)<br>[源码](https://github.com/KujouShiori/ip-please-week-two) | [KujouShiori](https://github.com/KujouShiori) | 原版 6 天原样保留，看完结局可以接着上第二周（第 7–9 天）：被拒的人换一身伪装再来，第 8 天起档案本身会造假，第 9 天审计组来查你自己的判例。5 个结局和跨周目结局图鉴，另有无尽排班模式 |

## 目录

| 路径 | 内容 |
|---|---|
| `index.html` | 页面 |
| `main.js` | 场景切换、输入、主循环 |
| `booth.js` | 检查亭：证件、盖章、检查模式、测谎、X 光 |
| `events.js` | 黑话快剪、蒸馏大军、聊天封号、结局 |
| `screens.js` | 开场、报纸、下班结算、片尾、存档 |
| `i18n.js` | 语言切换 `T()`，以及开局选语言的画面 |
| `en.js` | 英文译文（以中文原句为键）、报纸上的译注、黑话注释 |
| `data.js` | 剧本：每天的旅客、报纸、随机路人 |
| `docs.js` | 证件：护照、设备卡、账户卡、宪法 |
| `gfx.js` / `sfx.js` | 像素绘图 / 音效合成（全部现场合成，没有音频文件） |
| `assets.js` | 预渲染的人物、背景、字形图集（由 `tools/build_assets.py` 生成，不要手改） |
| `tools/` | 素材生成工具：`pp/` 是人物和场景的像素画法，`assets/fonts/` 是像素字体；`check_en.js` 查漏翻 |
| `media/` | README 用的 logo、游戏动图，以及链接分享卡片 `og.png` |

## 修改与重建素材

改了游戏里的文字（新出现的汉字需要进字形图集）或者人物画法之后，重新生成 `assets.js`：

```bash
pip install -r tools/requirements.txt
python tools/build_assets.py
```

改了中文台词，要同步改 `en.js` 里对应的键（中文原句一字不差）。漏没漏可以跑：

```bash
node tools/check_en.js
```

本地预览：在仓库根目录运行 `python -m http.server`，打开 <http://localhost:8000>。

## 致谢与许可

- 致敬 Lucas Pope 的《Papers, Please》。本作是同人讽刺小品，角色均为虚构，讽刺的是“按地区封锁”这件事和各种伪装的荒诞，不针对任何民族和群体——宪法第 12 条：只看地区，不看脸。
- 画面、音乐、音效均由 Claude Code 写程序生成。
- 代码以 [MIT](LICENSE) 许可开源。
- 像素字体：[缝合像素字体 Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)，SIL Open Font License 1.1（见 `OFL-fusion-pixel.txt`）。
