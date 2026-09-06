# 🎬 MovieVault — Cyberpunk Neo-Noir Media Vault

**MovieVault** is a modern, high-performance, self-hosted streaming and media management platform optimized for single-board computers (**Orange Pi Zero 3 / Raspberry Pi**) and home servers. It offers a sleek Cyberpunk / Neo-Noir user experience inspired by Netflix and DMM, with support for Movies, TV Series, and JAV.

---

## 🚀 Key Features

### 1. 🎞️ High-Performance Media Streaming
- **Universal Video Player**: Custom-built HTML5 + HLS.js player supporting direct `.m3u8` streams, raw MP4s, local file streams, and iframe/embed streaming (e.g. Playmogo, Turbovid, JAVHD) with automated `no-referrer` anti-blocking.
- **Smart Resume & Progress**: Remembers playback positions, tracks duration watched, and renders interactive progress indicators across the interface.
- **Ambient Cinema Glow**: Synchronized canvas-driven ambient backlight reflecting the active video frame.

### 2. 🌸 JAV Hub & Filmography
- **Actress Hub & Chronological Timeline**: Interactive timeline view with glowing milestones grouped by release year, studio filters (S1, Moodyz, Attackers, etc.), rating filters, and stream readiness indicators (Ready vs Metadata).
- **Franchise & Series Grouping**: Automatically groups and recommends releases belonging to the same collection/franchise.
- **Preview Stills Lightbox**: Full-screen scene gallery browser with keyboard navigation and thumbnail strips.
- **Auto Japanese/English Name Translation**: Translates and synchronizes Romanized, Kanji, and Kana actress names across profiles.

### 3. 🛡️ Privacy & Stealth Modes
- **Boss Key / Quick Panic Mode (`Esc` / `F2`)**: Instantly overlays a decoy spreadsheet / code dashboard to hide adult content.
- **Invisible Vault Gate**: Discrete PIN protection and 18+ age blur filters.

### 4. ⚡ Optimized for Orange Pi & Low-Power Hardware
- **In-Memory LRU/TTL Cache**: Zero-dependency memory cache serving hot API routes in sub-millisecond response times (~20ms).
- **Batch Query Optimizer**: Eliminates SQLite N+1 subquery bottlenecks, reducing DB queries by over 80%.
- **qBittorrent Webhook Integration**: One-click remote torrent dispatch directly to the local qBittorrent daemon.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/) + React 19 + TypeScript
- **Styling**: Tailwind CSS + Framer Motion (Cyberpunk Obsidian & Neon accents)
- **Database**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (Zero-configuration, ultra-fast embedded SQLite with WAL mode)
- **Streaming**: [HLS.js](https://github.com/video-dev/hls.js/) + Native Video & Iframe Embed Engine
- **Icons**: [Lucide React](https://lucide.dev/)
- **Process Management**: PM2 (Production Daemon)
- **Remote Access**: Tailscale (MagicDNS / VPN)

---

## 📂 Project Structure

```
movievault/
├── app/                      # Next.js App Router
│   ├── actress/[id]/         # Actress profile & chronological timeline
│   ├── api/                  # High-performance cached REST API routes
│   │   ├── actresses/        # Actress catalog and details
│   │   ├── media/            # Media catalog, sources, and franchise series
│   │   ├── search/           # Multi-field search & token indexing
│   │   └── admin/            # Torrent, scraping & database management
│   ├── library/              # Movies, Series, and JAV libraries
│   ├── player/[id]/          # Dedicated cinema player view
│   └── search/               # Search page
├── components/
│   ├── home/                 # Hero carousel, shelves, and media rows
│   ├── layout/               # Sidebar, topbar, bottom nav & shortcuts
│   ├── media/                # Media cards, JAV view, and modals
│   ├── player/               # Custom HLS/Embed VideoPlayer
│   └── stealth/              # BossKey and PIN gates
├── lib/
│   ├── server/               # Server-side cache, DB helpers, and batch mapper
│   ├── db.ts                 # SQLite connection & schema initialization
│   ├── storage.ts            # Local asset file storage
│   └── store.ts              # Zustand state stores
└── data/                     # (Git-ignored) Local SQLite DB & media images
```

---

## 💻 Getting Started (Development)

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/your-username/movievault.git
cd movievault
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```
*(Optional: set `DATA_DIR` if you want to store database and images on an external drive).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🍊 Deployment on Orange Pi (Production)

### 1. Mount External Storage (Optional, e.g. HDD at `/mnt/storage`)
Configure your `.env.local`:
```env
DATA_DIR=/mnt/storage/movievault/data
PORT=3000
```

### 2. Build for Production
```bash
npm run build
```

### 3. Run with PM2 (Background Daemon)
```bash
# Install PM2 globally if not installed
sudo npm install -g pm2

# Start the application
pm2 start npm --name "movievault" -- start

# Save state to auto-restart on boot
pm2 save
pm2 startup
```

### 4. Remote Access with Tailscale
Access your MovieVault securely from any phone, tablet, or PC on your Tailnet:
```
http://<orange-pi-tailscale-ip>:3000
# or
http://orangepizero3:3000
```

---

## 📄 License
Private / Personal Use Only.

