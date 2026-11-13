<p align="center">
  <a href="https://ip-please.github.io"><img src="media/logo.png" width="160" alt="IP, PLEASE"></a>
</p>

<h1 align="center">IP, PLEASE</h1>

<p align="center">
  <a href="README.md">简体中文</a> · <b>English</b>
</p>

<p align="center">
  A Papers, Please–style pixel game.<br>
  You won the October labor lottery and have been assigned to the Ministry of Alignment's UTC+8 Border Checkpoint as inspector Claude. Your only job: catch travelers pretending to be American.
</p>

<p align="center">
  <a href="https://ip-please.github.io"><b>▶ Play in your browser: ip-please.github.io</b></a><br>
  <sub>Pick <b>English</b> on the first screen.</sub><br>
  The sequel <a href="https://ipo-please.github.io/"><b>IPO, PLEASE</b></a> is out (<a href="https://github.com/ipo-please/ipo-please.github.io">repo</a>) · <a href="https://space.bilibili.com/3707008398134122">Bilibili</a>
</p>

<p align="center">
  <img src="media/gameplay-en.gif" width="640" alt="Gameplay: a traveler says “Hello, I am 美国人。”; inspection shows his timezone is Beijing Time; the quiz makes him blurt out the second half of a Chinese meme, and when the DENIED stamp lands his sunglasses slip">
  <br>
  <sub>Day 2: “Hello, I am 美国人。”</sub>
</p>

- 6 days, 2 endings, about 30 minutes; autosaves at the end of every day
- English / 简体中文, chosen on the start screen
- Drag papers with a mouse, or with your finger on a phone (landscape)
- A plain static web page that loads nothing external; download the repo and double-click `index.html` to play offline

## About the memes

The game started as a joke for the Chinese internet. Claude isn't available in mainland China, Hong Kong or Macau, so people there dress up as Americans: VPNs, US cards, US phone numbers, a system language switched to en-US. The disguise rarely survives contact with a Chinese meme.

In the English version:

- **Chinese slips stay in Chinese.** They are the evidence. You don't need to read “Hello, I am 美国人。” to know something is off.
- **Quiz lines show the original plus a literal translation**, e.g. `宫廷玉液酒？ ("Palace jade wine?")`. Every Chinese person can finish the line; real Americans just say “Uh… bless you?”
- **Each day's newspaper has a Translator's Note** explaining the memes of the day: Crazy Thursday and “V me 50”, proxy “airports”, America (UTC+8), and more.

## How to play

Call the next traveler → drag their papers onto the desk → check them against the Constitution → stamp → hand the papers back.

| Day | New rules / tools |
|---|---|
| 1 | Only IPs from supported regions get in |
| 2 | Timezone and language must match the IP; quiz and detain |
| 3 | Account card: payment card, billing address, phone number |
| 4 | X-ray scan for background processes; the slang fast lane |
| 5 | Majority Chinese-owned companies; the distillation swarm |
| 6 | George Costava, final form; and the last traveler |

## Mods

The main game only takes bug fixes and experience improvements, not PRs that add game mechanics. So many people want to overhaul it, in so many different directions, that merging them all would make a patchwork, and there'd be no way to review them all.

If you have a new gameplay idea, you're very welcome to fork the game and publish it as your own mod, under your own name, so your idea stays whole. When it's ready, [submit it](https://github.com/ip-please/ip-please.github.io/issues/new?template=mod.yml) and it goes on the list below and on the Bilibili mod list. See [CONTRIBUTING.md](CONTRIBUTING.md#english) for how.

| Mod | Author | About |
|---|---|---|
| [IP, PLEASE: Modder's Cut](https://erasercn.github.io/ip-please/)<br>[Source](https://github.com/EraserCN/ip-please) · [Apps](https://github.com/EraserCN/ip-please/releases) | [EraserCN](https://github.com/EraserCN) | Stretches the game to 12 days, with a wallbreaker storyline and multiple endings. Days 8–11 each bring a new rule and their own characters (fingerprint browsers, prompt injection, knockoff student IDs…). Android, iOS and macOS apps |
| [IP, PLEASE: File Zero](https://ip-please-zero.azurpilot.com/)<br>[Source](https://github.com/wess09/ip-please-zero) | Ming ([wess09](https://github.com/wess09)) | A 14-day story: investigate File No. 0000 and weigh evidence, rules and choices across 30 endings. Nine AI travelers (GPT, Qwen, Grok, Kimi, Gemini, Fishy…), plus an endless mode |
| [IP, PLEASE Mobile · Android port](https://github.com/zhcalvin/ip-please-mobile)<br>[APK](https://github.com/zhcalvin/ip-please-mobile/releases) | [zhcalvin](https://github.com/zhcalvin) | The original six-day game, ported as-is to Android 8.0+. Plays offline, with landscape touch controls for phones and tablets, Chinese / English, and auto-pause when the app is in the background |
| [IP, PLEASE · Week Two](https://kujoushiori.github.io/ip-please-week-two/)<br>[Source](https://github.com/KujouShiori/ip-please-week-two) | [KujouShiori](https://github.com/KujouShiori) | Keeps the original six days as they are, then lets you carry on into a second week (Days 7–9): the people you denied come back in better disguises, from Day 8 the records themselves are forged, and on Day 9 an audit team comes for your own rulings. Five endings and a cross-playthrough ending file, plus an endless mode |
| [IP, PLEASE · Mod Store edition](https://ip-please.zhihaojiang.com/)<br>[Source](https://github.com/super-213/ip-please) | [super-213](https://github.com/super-213) | The original six days, unchanged, rebuilt as a host plus plug-ins: small mods like translations, extra travelers and save backups can run several at once, and conflicts are reported before the game starts. A mod store in the top-right corner installs `.ipmod` packages and adds catalogs other people publish. Comes with adapted packages of Modder's Cut and File Zero (each replaces the whole campaign, so they can't run together) |

## Files

| Path | What's inside |
|---|---|
| `index.html` | The page |
| `main.js` | Scene switching, input, main loop |
| `booth.js` | The booth: papers, stamps, inspection mode, quiz, X-ray |
| `events.js` | Slang fast lane, distillation swarm, account ban, endings |
| `screens.js` | Intro, newspaper, end-of-day summary, credits, save |
| `i18n.js` | Language switching `T()` and the language-select screen |
| `en.js` | English translations (keyed by the original Chinese), Translator's Notes, slang glosses |
| `data.js` | The script: each day's travelers, newspapers, random passers-by |
| `docs.js` | Documents: passport, device card, account card, Constitution |
| `gfx.js` / `sfx.js` | Pixel drawing / sound synthesis (all generated live, no audio files) |
| `assets.js` | Pre-rendered characters, backgrounds and glyph atlas (generated by `tools/build_assets.py`; don't edit by hand) |
| `tools/` | Asset tools: `pp/` draws the characters and scenes, `assets/fonts/` holds the pixel fonts; `check_en.js` finds missing translations |
| `media/` | Logo and gameplay GIFs for the README, link preview card `og.png` |

## Editing and rebuilding assets

After changing in-game text (new Chinese characters must go into the glyph atlas) or how characters are drawn, regenerate `assets.js`:

```bash
pip install -r tools/requirements.txt
python tools/build_assets.py
```

If you change a Chinese line, update the matching key in `en.js` too (it must match the Chinese exactly). To list anything missing:

```bash
node tools/check_en.js
```

Local preview: run `python -m http.server` in the repo root and open <http://localhost:8000>.

## Credits and license

- A tribute to Lucas Pope's *Papers, Please*. This is a fan-made satire and every character is fictional. It mocks region-based blocking and the absurd disguises around it, not any ethnicity or group. Article 12 of the Constitution: judge the region, not the face.
- All art, music and sound effects are generated by code written with Claude Code.
- Code released under the [MIT](LICENSE) license.
- Pixel font: [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font), SIL Open Font License 1.1 (see `OFL-fusion-pixel.txt`).
