<p align="center">
  <img src=".github/assets/icon.png" width="128" height="128" alt="YT Music icon" />
</p>

<h1 align="center">YT Music</h1>

<p align="center">
  <strong>A native YouTube Music client for macOS.</strong><br>
  Built with Tauri v2 + Rust. No Electron. No bloat.
</p>

<p align="center">
  <a href="https://github.com/codeatlasdev/yt-music-client/releases"><img src="https://img.shields.io/github/v/release/codeatlasdev/yt-music-client?style=flat-square&color=blue" alt="Release"></a>
  <a href="https://github.com/codeatlasdev/yt-music-client/blob/main/LICENSE"><img src="https://img.shields.io/github/license/codeatlasdev/yt-music-client?style=flat-square" alt="License"></a>
  <a href="https://github.com/codeatlasdev/yt-music-client/actions"><img src="https://img.shields.io/github/actions/workflow/status/codeatlasdev/yt-music-client/build.yml?style=flat-square" alt="Build"></a>
  <img src="https://img.shields.io/badge/platform-macOS%2013%2B-black?style=flat-square&logo=apple" alt="macOS 13+">
</p>

<p align="center">
  <img src=".github/assets/screenshot.png" width="720" alt="YT Music screenshot" />
</p>

---

## Why

YouTube Music deserves a proper desktop app — not a browser tab eating 300MB of RAM.

YT Music wraps the official web player in a native macOS window using the system WebKit engine (the same one Safari and Apple Music use). The result: **~30MB RAM**, instant startup, and native OS integration.

## Features

| Feature | Description |
|---------|-------------|
| **Native performance** | System WebKit — no bundled Chromium, no Electron overhead |
| **Ad blocking** | Blocks ad requests at the network level + removes ad DOM elements |
| **Now Playing** | Integrates with macOS media controls (Control Center, AirPods, Touch Bar) |
| **Titlebar overlay** | Frameless window with native traffic lights — feels like a first-party app |
| **Tiny footprint** | ~8MB app bundle, ~30MB RAM at runtime |
| **Privacy** | No telemetry, no analytics, no tracking beyond what YouTube Music itself does |

## Performance

| Metric | YT Music (this) | Electron-based alternatives |
|--------|-----------------|----------------------------|
| App bundle | ~8 MB | 150+ MB |
| RAM (idle) | ~30 MB | 200–400 MB |
| Startup | < 1s | 3–5s |
| CPU (idle) | ~0% | 1–3% |

## Install

### Download

Grab the latest `.dmg` from [Releases](https://github.com/codeatlasdev/yt-music-client/releases).

### Build from source

Requires [Rust](https://rustup.rs) and [Bun](https://bun.sh).

```bash
git clone https://github.com/codeatlasdev/yt-music-client.git
cd yt-music-client
bun install
bun run build
```

The built app will be in `src-tauri/target/release/bundle/`.

### Development

```bash
bun run dev
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  macOS Window (native, titlebar overlay)     │
├─────────────────────────────────────────────┤
│  WKWebView                                   │
│  ┌─────────────────────────────────────────┐ │
│  │  music.youtube.com                      │ │
│  │  + injected CSS (titlebar padding)      │ │
│  │  + injected JS (ad removal, media info) │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  Rust Backend (Tauri)                        │
│  ├── Ad blocking (URL interception)          │
│  ├── Media controls (souvlaki → Now Playing) │
│  └── User agent spoof (Chrome UA)            │
└─────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: [Tauri v2](https://v2.tauri.app) — Rust backend + system WebView
- **Language**: Rust (backend), JavaScript (injected scripts)
- **Media**: [souvlaki](https://github.com/Sinono3/souvlaki) — cross-platform media controls
- **Build**: [Bun](https://bun.sh) + Cargo
- **Target**: macOS 13+ (Ventura and later)

## Roadmap

- [x] Core playback (YouTube Music web)
- [x] Ad blocking (network + DOM)
- [x] macOS Now Playing integration
- [x] Native titlebar overlay
- [ ] Keyboard media keys (play/pause/next/prev)
- [ ] Picture-in-Picture mini player
- [ ] Discord Rich Presence
- [ ] Global search shortcut
- [ ] Custom themes
- [ ] Linux & Windows support

## Contributing

PRs welcome. Keep it lean — this project values performance over features.

```bash
# Fork, clone, then:
bun install
bun run dev
# Make changes, test, submit PR
```

## License

[MIT](LICENSE)

---

<p align="center">
  Made by <a href="https://github.com/codeatlasdev">codeatlas</a>
</p>
