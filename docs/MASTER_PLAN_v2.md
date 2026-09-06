# 🎬 Cyberpunk Neo-Noir Media Vault — Master Project Plan v2

Build-ready architecture & development template for a media streaming platform (**Movies, Series, Japan AV**) on **Next.js + Firebase**.

This v2 merges the original plan's five sections with a gap-analysis pass (compliance & security, data model & search, ops/pipeline, testing & observability) and organizes everything into three implementation phases:

- **Phase 0 — Foundation:** blockers designed first (compliance, security, architecture)
- **Phase 1 — Launch readiness:** product surface, pipeline, quality, CI/CD
- **Phase 2 — Growth:** notifications, personalization, monetization

> **Language:** English. A Thai version can be generated on request.
> **Owner exclusions:** no mock/seed data; no 18+ media in Firebase Storage; DRM out of scope (see §14).

---

## Table of Contents

1. Theme & Design Language
2. System Architecture & Tech Stack
3. Database Schema (Cloud Firestore)
4. Security Model
5. UX/UI, Interactions & Video Player Architecture
6. Admin Backend, Control Panel & Settings
7. Data Aggregation & Caching Pipeline
8. Compliance & Legal
9. Testing, CI/CD & Quality
10. Observability & Operations
11. Phased Roadmap
12. Environment Variables
13. Suggested Build Order (AI Instruction Sequence)
14. Explicit Out-of-Scope Decisions

---

## 1. Theme & Design Language

**Concept:** Cyberpunk Neo-Noir Glassmorphism.

**Core Color Palette**
- **Background:** `#0a0b0e` (Deep Obsidian Black — makes posters pop, OLED-friendly)
- **Surface / Containers:** Glassmorphism (`bg-white/5`–`bg-white/10`, `backdrop-blur-md`, `border border-white/10`)
- **Accent — Main / Series / Movies:** Electric Cyan `#00f2fe`
- **Accent — JAV (18+):** Hot Magenta / Neon Pink `#ff007f`
- **Typography:** Pure white `#ffffff` for headings; Slate Gray `#94a3b8` for details/tags

**Typography (additions)**
- Headings: `Orbitron` or `Space Grotesk` (cyberpunk feel) via `next/font`
- Body: `Inter` via `next/font` (self-hosted, no layout shift)

**Layout Adaptability**
- **Desktop:** Floating Glass Sidebar (left) + auto Hero Banner + responsive Grid
- **Mobile:** Floating Bottom Navigation Bar; secondary menu in a Drawer; horizontal carousel swipe

**Accessibility (additions)**
- Respect `prefers-reduced-motion` (Framer Motion variants gated off)
- Visible focus rings, proper `aria-label`s on icon buttons, semantic HTML
- Contrast: slate gray text stays above 4.5:1 on `#0a0b0e`

---

## 2. System Architecture & Tech Stack

**Frontend**
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Motion:** Framer Motion (micro-interactions, 3D hover, spring popups)
- **Icons:** Lucide React
- **Data fetching (new):** TanStack Query — cursor-based infinite scroll, stale-time caching, optimistic mutations (favorites toggle with rollback), request dedup
- **Client state (new):** Zustand — player state (source index, playback rate), UI state (modals, toasts)

**Backend & Cloud Ecosystem**
- **Hosting:** Firebase Hosting (or Firebase App Hosting)
- **Authentication:** Firebase Auth (Email/Password + Google Sign-In)
- **Database:** Cloud Firestore — app state + caching layer
- **Server code (new):** Next.js route handlers as a BFF + Cloud Functions (2nd gen, region `asia-southeast1`)
- **Feature flags (new):** Firebase Remote Config
- **Abuse protection (new):** Firebase App Check

**Data Aggregation (API Layer)**
- **Movies & Series:** TMDB API (country/language/genre classification)
- **Japan AV (18+):** JAV API or JAV Scraper Engine (code, actresses, studio, gallery)
- **All external API keys live server-side only** (route handlers / Secret Manager) — never in `NEXT_PUBLIC_*`

**Search (new — Firestore cannot do full-text search)**
- **Primary:** Algolia / Typesense / Meilisearch with a sync job (§7.4)
- **Budget fallback:** normalized `searchTokens` array on `media` docs + client-side prefix filtering
- Normalization: JAV codes (`ssis-543` → `SSIS-543`), romanized Japanese names, Thai + English + Japanese title variants

**Compliance & Storage Rules**
- **Never** store 18+ images/videos in Firebase Storage (account-suspension risk)
- Hotlink from source CDNs or proxy through a private image proxy / Cloudflare Tunnel

---

## 3. Database Schema (Cloud Firestore)

> Fields marked **+** are v2 additions. All types are TypeScript.

### `users` (+ upgraded)

```typescript
{
  uid: string;
  email: string;
  role: "admin" | "user";        // informational only — authorization comes from custom claims (§4)
  createdAt: Timestamp;
  // + premium
  premium?: boolean;             // premium tier subscriber
  premiumSince?: Timestamp;
  // + parental controls
  ageVerifiedAt?: Timestamp;     // 18+ gate confirmation
  pinHash?: string;              // hashed parental PIN (JAV lock) — hash only, never plaintext
  settings?: {
    language: "th" | "en";
    privateMode: boolean;        // don't record watch history
    blurredJav: boolean;         // default true — blur 18+ thumbnails
  };
}
```

### `media` (+ upgraded)

```typescript
{
  id: string;                    // e.g. "ssis-543" or "tmdb-12345"
  type: "movie" | "series" | "jav";
  code?: string;                 // JAV code e.g. "SSIS-543"
  title: string;
  // + alternate titles
  altTitles?: { th?: string; ja?: string; en?: string };
  country: string;               // "JP" | "KR" | "US" | "TH"
  posterUrl: string;
  backdropUrl?: string;          // + hero/spotlight backdrop
  previewImages: string[];       // hover slideshow — cap at ~12 (1 MiB doc limit)
  actors: string[];              // display names; full profiles live in `actresses`
  tags: string[];
  // + classification
  genres?: string[];
  year?: number;
  studio?: string;               // studio id → `studios`
  tmdbId?: string;
  trailerUrl?: string;           // YouTube embed
  rating?: number;               // aggregated (TMDB + user ratings)
  // + engagement
  views: number;                 // increment counter
  sources: {
    label: string;               // "Server 1", "Backup"
    url: string;                 // .m3u8 or embed URL
    // + health tracking
    healthy?: boolean;
    lastCheckedAt?: Timestamp;
  }[];
  // + search & lifecycle
  searchTokens: string[];        // normalized: code, romanized names, th/en/ja titles
  status: "draft" | "published" | "flagged";  // + moderation lifecycle
  cacheTTL: Timestamp;           // cache-control metadata for the pipeline
  updatedAt: Timestamp;
}
```

### `media/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}` (+ new — required for series)

```typescript
{
  id: string;                    // e.g. "s01e03"
  title: string;
  overview?: string;
  thumbnailUrl: string;
  duration: number;              // seconds
  airedAt?: Timestamp;
  sources: { label: string; url: string; healthy?: boolean; lastCheckedAt?: Timestamp }[];
  updatedAt: Timestamp;
}
```

### `actresses/{id}` (+ new — powers the Actress Profile Hub)

```typescript
{
  id: string;                    // romanized name slug e.g. "yua-mikami"
  name: string;
  aliases: string[];             // romanized variants, kanji
  country: string;
  photoUrl: string;
  studio?: string;
  bio?: string;
  mediaCount: number;            // + cached counter (denormalized)
  updatedAt: Timestamp;
}
```

### `studios/{id}` (+ new)

```typescript
{
  id: string;                    // e.g. "s1", "moodyz"
  name: string;
  country: string;
  logoUrl?: string;
  mediaCount: number;            // cached counter
  updatedAt: Timestamp;
}
```

### `favorites`

```typescript
{
  uid: string;
  mediaId: string;
  addedAt: Timestamp;
}
```

### `watch_history` (+ upgraded)

```typescript
{
  uid: string;
  mediaId: string;
  episodeId?: string;            // + per-episode resume for series
  lastWatchedTime: number;       // seconds
  duration: number;              // seconds
  finished: boolean;             // + true when ≥95% watched — excluded from Continue Watching
  updatedAt: Timestamp;
}
```

### `featured`

```typescript
{
  featuredMovieIds: string[];
  featuredJavCodes: string[];
  bannerAnnouncements?: string;
  // + enabled flags (Remote Config friendly)
  enabled: boolean;
  updatedAt: Timestamp;
}
```

### Admin collections (+ new)

```typescript
// moderation_queue/{id} — scraped items await approval before publish
{
  mediaId: string;
  source: "scraper" | "manual";
  reason?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
}

// audit_log/{id} — every admin action
{
  adminUid: string;
  action: string;                // e.g. "media.update", "media.publish", "user.promote"
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  createdAt: Timestamp;
}

// reports/{id} — broken links & content issues from users
{
  mediaId: string;
  serverLabel?: string;          // which source failed
  sourceUrl?: string;
  reporterUid?: string;
  reason: "broken_link" | "wrong_info" | "inappropriate" | "dmca";
  status: "open" | "resolved";
  createdAt: Timestamp;
}
```

### Composite indexes (plan upfront — Firebase console + rules)

- `media`: `(type ASC, views DESC)`, `(type ASC, rating DESC)`, `(type ASC, year DESC)`, `(type ASC, country ASC, views DESC)`, `(status ASC, updatedAt DESC)`
- `favorites`: `(uid ASC, addedAt DESC)`
- `watch_history`: `(uid ASC, updatedAt DESC)`
- `moderation_queue`: `(status ASC, createdAt ASC)`
- `reports`: `(status ASC, createdAt DESC)`

### Capacity & hygiene rules

- Cap `previewImages` at ~12 per doc (Firestore 1 MiB limit headroom)
- Compact `watch_history` to ~500 docs/user (scheduled function deletes oldest `finished` rows)
- `views` / `mediaCount` updates via `increment()` transactions; never client-side overwrites of counters

---

## 4. Security Model

**Authentication & Authorization**
- Firebase Auth: Email/Password + Google
- **Admin via Firebase custom claims** (`customClaims.role === "admin"`), set by a Cloud Function on user creation/promotion — *not* the Firestore `role` field (client-writable, spoofable). The `users.role` field is informational only.
- Premium flag: server-verified (Stripe webhook or admin action), not client-writable

**Firebase App Check**
- Enforced on Firestore + Cloud Functions; blocks scrapers/abusers from burning reads

**Firestore Security Rules (outline)**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin()  { return signedIn() && request.auth.token.admin == true; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }

    // Public catalog — readable signed-in; only admins write.
    match /media/{id} {
      allow read:  if signedIn() && resource.data.status == 'published';
      allow write: if isAdmin();
    }
    match /seasons/{season}/episodes/{episode} {
      allow read:  if signedIn();
      allow write: if isAdmin();
    }
    match /actresses/{id} { allow read: if signedIn(); allow write: if isAdmin(); }
    match /studios/{id}   { allow read: if signedIn(); allow write: if isAdmin(); }
    match /featured/{id}  { allow read: if signedIn(); allow write: if isAdmin(); }

    // User data — owner-only writes; admin reads all.
    match /users/{uid} {
      allow read:   if isOwner(uid) || isAdmin();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) && request.resource.data.diff(resource.data)
                      .affectedKeys().hasOnly(['settings','pinHash','ageVerifiedAt']);
      allow delete: if isAdmin();
    }
    match /favorites/{id}      { allow read, write: if isOwner(resource.data.uid); }
    match /watch_history/{id}  { allow read, write: if isOwner(resource.data.uid); }

    // Admin-only operational collections.
    match /moderation_queue/{id} { allow read, write: if isAdmin(); }
    match /audit_log/{id}        { allow read, write: if isAdmin(); }
    match /reports/{id} {
      allow create: if signedIn();
      allow read, update: if isAdmin();
    }
  }
}
```

- **Validation:** sources URLs must be `https://` and end in `.m3u8` or be a known embed pattern — enforced on admin write + in the API layer
- **Keys:** TMDB/JAV/Stripe keys in Secret Manager; only public Firebase config in `NEXT_PUBLIC_*`
- **Headers:** CSP, `X-Frame-Options`, `Referrer-Policy` in `next.config.js` + `firebase.json`; embed sources sandboxed with `sandbox="allow-scripts allow-same-origin"` and no autoplay until user gesture

---

## 5. UX/UI, Interactions & Video Player Architecture

### 5.1 Interactive Media Cards (original)

- **Dynamic Hover Effect:** card scales to 1.05 and floats (Framer Motion)
- **Neon Glow Borders:** cyan glow for movies/series, neon-pink glow for JAV
- **Badge Identifier:** reflective badge showing the JAV code (top-right) on JAV cards
- **Hover Preview Loop:** on hover, poster cross-fades into a looping slideshow of `previewImages` (fade-in, capped ~12)

### 5.2 Quick Preview Modal (original)

- Click a card → glassmorphism popup instantly (no page navigation)
- Shows: synopsis, tags, cast list, gallery strip, **Favorite** button, **Play** button
- Closable via `Esc`, backdrop click, and close button; share deep-link button (+ new)

### 5.3 Debounced Search Engine (original + additions)

- 400 ms debounce to reduce API load
- Search by: title, JAV code (`SSIS`, `MIDV`…), actress name
- + Recent searches, suggested queries, filter chips (genre / year / country), matching-code highlight
- + Empty/error states and loading skeletons (no layout shift)

### 5.4 Actress / Actor Profile Hub (original + additions)

- Click an actress name → filter all her work into a grid with **infinite scroll**
- + Studio pages (all titles from a `studios` entry)
- + "More from this actress/studio" rail on media detail

### 5.5 Home Page Composition (+ new)

- Hero carousel (from `featured`, managed in admin)
- **Continue Watching rail** (from `watch_history`, excludes `finished`, respects private mode)
- **Trending carousel** (by `views`)
- Genre/studio rows
- **"Up Next" countdown** (Netflix-style) when an episode ends
- Empty states for first-time users (no mock/seed data — real content only)

### 5.6 Desktop Shortcuts & Power User UX (original + additions)

- `/` → focus search bar
- `Esc` → close popups/modals
- + `J` / `K` / `L` → seek −10s / play-pause / +10s
- + Arrow keys → grid navigation

### 5.7 Web App Manifest & Performance (original + additions)

- PWA: Service Worker + Web Manifest ("Add to Home Screen")
- `next/image` + `blurDataURL` placeholders to eliminate CLS
- + 18+ assets **excluded** from the service worker cache (§8)
- + Dynamic import of hls.js and the player; route-level code splitting; AVIF/WebP via image CDN
- + Bundle analyzer + Lighthouse CI budgets (§9)

### 5.8 18+ Gating UX (+ new)

- JAV thumbs blurred (`blurredJav` default) until age gate confirmed
- Age gate: self-asserted 18+ confirmation on first visit (writes `ageVerifiedAt`)
- Parental PIN lock (`pinHash`) gates the entire JAV section
- JAV routes send `noindex` robots headers (§8)

---

## 6. Video Player Architecture

### 6.1 HLS Integration (original)

- HLS.js drives streaming for `.m3u8` sources
- **Safari/iOS edge case (+ new):** Safari plays `.m3u8` natively — detect and skip attaching hls.js (double-attach causes glitches)

### 6.2 Multi-Source Failover (original + additions)

- `sources: []` supports multiple servers; automatic switch to the next on failure
- + Playback-failure toast showing remaining-server count
- + In-player **"Report broken link"** button → pre-fills media id + server label into `reports` (admin queue)
- + Quality selector (1080p/720p) when master playlists expose renditions
- + Subtitles: `.vtt` track support in player config

### 6.3 Resume Playback System (original + additions)

- Save `currentTime` to localStorage (instant) and `watch_history` in Firestore (server-side)
- + Throttled Firestore writes (~every 5 s, batched; skip in private mode)
- + Auto-pause on tab hidden
- + At ≥95% watched → mark `finished: true`, clear the resume point, exclude from Continue Watching
- + Per-episode resume via `episodeId`

### 6.4 Player Feature Roadmap (P2)

- Playback speed control, Picture-in-Picture, fullscreen
- Cast / AirPlay
- Next-episode autoplay countdown
- (DRM — Widevine/FairPlay — explicitly out of scope, §14)

---

## 7. Admin Backend, Control Panel & Settings

### 7.1 Access Control & Route Guard (original, upgraded)

- All management UI under `/settings`
- Access via **custom claims** (`role === "admin"`) checked in route guards + API layer + rules — regular users see only personal profile settings

### 7.2 Hero Banner & Spotlight Manager (original)

- Configure featured media: TMDB ID or JAV code + on/off toggle
- Writes `featured` doc (+ `enabled` flag)

### 7.3 Multi-Source Stream Linker (original + validation)

- Search/edit any media in the system
- Add/edit/delete `sources[]` — HLS direct (`.m3u8`) or embed URL, with server labels ("Server หลัก", "สำรอง 1")
- + Validate on save: https-only, `.m3u8`/embed allowlist, optional HEAD check
- + Episode-level source editing for series

### 7.4 Hybrid Cache Control (original + pipeline)

- Panel showing Firestore cache status (`cacheTTL` per doc)
- "Manual Sync / Invalidate Cache" button — triggers the same scheduled scrape job (§7.2) on demand
- + Per-source or per-media cache invalidation

### 7.5 User & Subscription Inspector (original + additions)

- Member list with roles/premium status
- Stats: most-rewatched titles, most-favorited titles
- + Premium management (grant/revoke), account moderation (disable, GDPR delete)

### 7.6 Moderation Queue (+ new)

- Auto-scraped items land as `draft` → admin approves/rejects before publish
- Merge duplicate scraped titles (same code/tmdbId → keep canonical, attach sources)

### 7.7 Audit Log (+ new)

- Every admin action appended to `audit_log` (who, what, when, before/after)

### 7.8 Reports Queue (+ new)

- Broken-link and content reports from users (in-player button, card menu) → triage, resolve, notify

### 7.9 Bulk Tools (+ new)

- CSV/JSON import & export of media/sources
- Duplicate detection & merge helper
- Bulk re-scrape by studio/actress

---

## 8. Data Aggregation & Caching Pipeline

### 8.1 BFF Route Handlers (Next.js API)

| Route | Purpose |
|---|---|
| `GET /api/media` | published catalog, cursor pagination, filters |
| `GET /api/media/[id]` | single media + seasons/episodes |
| `GET /api/search?q=` | search provider (Algolia/Typesense or searchTokens) |
| `GET /api/actresses/[id]/media` | actress-filtered grid |
| `POST /api/admin/media` | upsert + validate (admin only) |
| `POST /api/admin/sync` | trigger scrape job (admin only) |
| `GET /api/admin/health` | source health dashboard (admin only) |
| `POST /api/reports` | broken-link / content report |
| image proxy | optional signed proxy for hotlinked images |

- All external keys server-side; retry with backoff + jitter; per-IP rate limits on `/api/search`

### 8.2 Caching Layers

1. In-memory (route handler) — hot items, short TTL
2. Firestore as durable cache with `cacheTTL` — client reads mostly hit Firestore, scrapers refresh it
3. `next/image` CDN cache for posters/backdrops

### 8.3 Scheduled Scrape Pipeline

```
Cloud Scheduler (daily)
   → Pub/Sub
   → Cloud Functions (2nd gen, asia-southeast1)
   → TMDB / JAV scraper (incremental, upsert by code/tmdbId)
   → Firestore (status = "draft") + search index sync
   → moderation queue
```

- Admin "Manual Sync" triggers the same job via Callable Function
- Scraper etiquette: incremental pages, backoff/jitter, never hammer sources
- JAV + TMDB upsert by stable key (`code`, `tmdbId`) to avoid duplicates

### 8.4 Search Indexing

- Post-scrape job syncs `searchTokens` + title/actress/studio fields to Algolia/Typesense (or relies on Firestore prefix fallback)
- Normalization: `ssis-543` → `SSIS-543`; romanized Japanese; th/en/ja variants

### 8.5 Source Health Checks (+ new)

- Scheduled job HEAD-requests each `.m3u8`/embed URL
- Marks `healthy: false` + `lastCheckedAt`; admin dashboard shows dead servers; player skips unhealthy sources first

### 8.6 Cost Guardrails

- Client reads via App Check + rules (no unauthenticated reads)
- TanStack Query stale-time caching to cut refetches
- Watch-history compaction (§3); `views` increments batched server-side
- Read/quota budget alerts (§10)

---

## 9. Compliance & Legal

- **Age gate + parental PIN** for 18+ (blurred thumbs, PIN lock, optional country blocking)
- **18+ never cached in the service worker** (device compliance) — cache only posters/shell
- **SEO split:** `noindex` on all JAV routes + robots.txt exclusion; `sitemap.xml` + Open Graph only for non-adult content (Google aggressively de-indexes adult pages)
- **Thailand PDPA consent banner** (analytics/cookies consent, minimal)
- **Pages:** Terms of Service, Privacy Policy, 18+ disclaimer, DMCA takedown contact
- **Report button** on every media card + in-player broken-link report
- **Data rights:** export-my-data, account deletion (Cloud Function trigger cleans `users`, `favorites`, `watch_history`, `reports`), clear-history, private mode (`settings.privateMode` stops history writes)
- **No 18+ media in Firebase Storage** — hotlink or private image proxy only
- **DRM:** out of scope, documented as a decision (§14)

---

## 10. Testing, CI/CD & Quality

**Unit (Vitest)**
- Debounce hook, JAV-code normalization, resume/finished logic, source validation

**Security Rules (`@firebase/rules-unit-testing`)**
- Media read gating by `status`, owner-only favorites/history writes, admin-only writes to operational collections

**E2E (Playwright)**
- Auth (sign-in/up), search flow, preview modal, player + failover, admin panel flows

**CI/CD (GitHub Actions)**
- On PR: lint → typecheck → unit/rules tests → build → Lighthouse CI budgets
- Preview channels: every PR gets a Firebase Hosting preview URL
- On main: deploy to staging; promote to prod on tag/release
- Environments: **dev / staging / prod** as separate Firestore projects (testing never pollutes prod)

**Performance budgets**
- LCP < 2.5 s, CLS < 0.1, bundle-size budgets via `@next/bundle-analyzer`; hls.js + player lazy-loaded

---

## 11. Observability & Operations

- **Sentry** (client + Functions) — crash reporting, error boundaries
- **Firebase Analytics** funnels: `search → card_click → preview_open → playback_started → playback_completed`
- **Custom events:** `playback_failed`, `source_switched`, `favorite_added/removed`, `watch_continued`, `jav_age_gate_confirmed`, `auth_signin`
- **Firebase Performance Monitoring** — route + image performance
- **Structured logging** in Functions (request id, function name, latency)
- **Alerts:** Firestore read/quota budgets, Function error rates, source-health degradation
- **Backups:** scheduled Firestore exports (daily) to Cloud Storage
- **Feature flags (Remote Config):** `jav_section_enabled`, `hero_carousel_enabled`, `search_provider`, `new_ui_enabled`
- **Functions region:** `asia-southeast1` (Thailand latency)

---

## 12. Phased Roadmap

### Phase 0 — Foundation (design first; blockers)

- [ ] Age gate + parental PIN + country blocking; 18+ blurred thumbs; 18+ excluded from service worker cache
- [ ] Firestore Security Rules as the authz layer + rules unit tests
- [ ] Admin via custom claims (Cloud Function on user create/promote); App Check enabled
- [ ] BFF route handlers — all external keys server-side; caching + retry/backoff + rate limits
- [ ] Search strategy decision + normalization utilities (`searchTokens`, code/romanized-name normalizer)
- [ ] Series model: `seasons`/`episodes` subcollection + `episodeId` in `watch_history`
- [ ] Schema upgrades: `actresses`, `studios`, new media fields, moderation/audit/report collections
- [ ] Composite indexes + doc-size caps (previewImages ≤ 12) + watch-history compaction plan
- [ ] Source validation on write (https/.m3u8/embed allowlist)

### Phase 1 — Launch readiness

- [ ] Client data layer: TanStack Query (infinite scroll, optimistic favorites) + Zustand
- [ ] Catalog UI: grid, interactive cards, preview modal, hero, Continue Watching + Trending rails
- [ ] Search UI (debounced, suggestions, filters) wired to provider
- [ ] Player: HLS.js + Safari detection, multi-source failover + toast, resume (throttled, finished detection), report-broken-link
- [ ] Auth + profile + settings (language, private mode, PIN management, history clear/export)
- [ ] Admin panel: hero manager, stream linker + validation, cache control, moderation queue, audit log, reports, user inspector, bulk tools
- [ ] Scheduled pipeline: Scheduler → Pub/Sub → Functions scrape + search index sync + source health checks
- [ ] Legal pages + PDPA consent + report button + `noindex` on JAV routes
- [ ] Tests: Vitest + rules tests + Playwright e2e; CI/CD with preview channels; dev/staging/prod isolation
- [ ] Sentry + Analytics funnels + custom events; Lighthouse budgets

### Phase 2 — Growth

- [ ] Follow actresses/studios + FCM new-release notifications
- [ ] Personalization: "more from this actress/studio", "because you watched"
- [ ] Player extras: speed, PiP, VTT subtitles, Cast/AirPlay, next-episode autoplay
- [ ] Premium tier (Stripe/PayPal) gating higher-bitrate sources + admin premium management
- [ ] Remote Config feature flags rollout
- [ ] Cost alerts + scheduled Firestore backups live

---

## 13. Environment Variables

| Name | Scope | Secret? |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | client | no |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | client | no |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | client | no |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | client | no |
| `FIREBASE_SERVICE_ACCOUNT` | server (Secret Manager) | yes |
| `TMDB_API_KEY` | server (Secret Manager) | yes |
| `JAV_SOURCE_API_KEY` / `JAV_SCRAPER_CONFIG` | server (Secret Manager) | yes |
| `ALGOLIA_APP_ID` / `ALGOLIA_API_KEY` / `ALGOLIA_SEARCH_KEY` | server + client | mixed |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | server (Secret Manager) | yes |
| `SENTRY_DSN` | client + server | no |

---

## 14. Explicit Out-of-Scope Decisions

- **Mock data / seed scripts** — excluded per owner; dev/staging use real scraped data or Firestore exports
- **18+ media in Firebase Storage** — never; hotlink or private image proxy only
- **DRM (Widevine/FairPlay/PlayReady)** — open HLS links can be ripped; if licensed content ever requires DRM, the architecture changes (licensing server, key servers, player SDKs) — revisit as a separate project
- **Comments / social features** — not planned (moderation burden, 18+ risk)
- **Multiple profiles per account** — single profile per user; revisit only if user research demands it
- **Offline downloads of 18+ content** — excluded for compliance; non-adult PWA shell caching only
- **Native mobile apps** — PWA covers mobile; no App Store/Play Store builds (Play Store bans explicit content)

---

## 15. Suggested Build Order (AI Instruction Sequence)

Use this sequence to instruct an AI to build the project step by step. Each step has an exit criterion.

1. **Scaffold:** Next.js (App Router) + TypeScript + Tailwind; theme tokens (§1); fonts; base layout (sidebar / bottom nav)
2. **Firebase project:** create dev/staging/prod projects; Firebase config via env vars (§13); enable Auth, Firestore, App Check
3. **Security rules skeleton** (§4) + `@firebase/rules-unit-testing` suite
4. **Custom claims Function:** on user create/promote set `admin` claim; premium flag server-verified
5. **Schemas + indexes:** collections per §3; composite indexes; doc-size caps
6. **BFF route handlers** (§8.1) with caching, retry/backoff, rate limits; keys into Secret Manager
7. **Catalog UI:** grid + interactive cards (§5.1) + hero + preview modal (§5.2)
8. **Search:** normalization utils → provider (or searchTokens fallback) → debounced search UI (§5.3)
9. **Actress/studio hubs** (§5.4) with infinite scroll
10. **Player** (§6): HLS.js, Safari detection, failover + toast, resume + finished detection, report button
11. **Auth/profile/settings** + favorites + watch history + private mode + age gate/PIN
12. **Admin panel** (§7): guard, hero manager, stream linker, cache control, moderation, audit log, reports, user inspector, bulk tools
13. **Pipeline** (§8.3): Scheduler → Pub/Sub → Functions scrape + search sync + source health checks
14. **Legal & compliance pages** (§9) + `noindex` JAV routes + PDPA banner
15. **Tests + CI/CD** (§10) + Sentry/Analytics events (§11) + Lighthouse budgets
16. **Phase 2 features** (§12) as capacity allows

---

*End of Master Project Plan v2. Thai version available on request.*