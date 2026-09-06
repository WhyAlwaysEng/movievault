// ⚠️ ──────────────────────────────────────────────────────────────────────────
// ⚠️  DEVELOPMENT ONLY — DO NOT RUN IN PRODUCTION
// ⚠️  This script seeds FAKE mock data with Unsplash placeholder images and
// ⚠️  test HLS streams. Use only for local UI development.
// ⚠️  To remove seeded data, run: node scripts/cleanup-mock-data.mjs
// ⚠️ ──────────────────────────────────────────────────────────────────────────

import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/db/movievault.db");
const db = new Database(dbPath);

console.log("Seeding sample media into:", dbPath);

// Ensure columns exist in SQLite
const mediaCols = new Set(
  db.prepare("PRAGMA table_info(media)").all().map((c) => c.name),
);
if (!mediaCols.has("director")) db.exec("ALTER TABLE media ADD COLUMN director TEXT;");
if (!mediaCols.has("runtime")) db.exec("ALTER TABLE media ADD COLUMN runtime INTEGER;");
if (!mediaCols.has("release_date")) db.exec("ALTER TABLE media ADD COLUMN release_date TEXT;");
if (!mediaCols.has("tagline")) db.exec("ALTER TABLE media ADD COLUMN tagline TEXT;");
if (!mediaCols.has("network")) db.exec("ALTER TABLE media ADD COLUMN network TEXT;");
if (!mediaCols.has("extra_meta")) db.exec("ALTER TABLE media ADD COLUMN extra_meta TEXT NOT NULL DEFAULT '{}';");

const now = Date.now();

// 1. Seed Actresses
const actresses = [
  {
    id: "yua-mikami",
    name: "Yua Mikami",
    aliases: JSON.stringify(["三上悠亜", "Momona Kito"]),
    country: "Japan",
    studio: "S1 NO.1 STYLE",
    bio: "Former idol turned premier Japanese AV icon with massive international following.",
    photo_path: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    media_count: 2,
  },
  {
    id: "eimi-fukada",
    name: "Eimi Fukada",
    aliases: JSON.stringify(["深田えいみ"]),
    country: "Japan",
    studio: "MOODYZ",
    bio: "Social media queen and top-tier actress known for extensive and diverse filmography.",
    photo_path: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    media_count: 2,
  },
  {
    id: "karen-kaede",
    name: "Karen Kaede",
    aliases: JSON.stringify(["楓カレン"]),
    country: "Japan",
    studio: "IDEA POCKET",
    bio: "Popular exclusive actress under the Idea Pocket label known for captivating performances.",
    photo_path: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80",
    media_count: 1,
  },
];

const insertActress = db.prepare(`
  INSERT INTO actresses (id, name, aliases, country, studio, bio, photo_path, media_count, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    aliases = excluded.aliases,
    bio = excluded.bio,
    photo_path = excluded.photo_path,
    media_count = excluded.media_count,
    updated_at = excluded.updated_at
`);

for (const a of actresses) {
  insertActress.run(a.id, a.name, a.aliases, a.country, a.studio, a.bio, a.photo_path, a.media_count, now, now);
}

// 2. Sample Media Items
const mediaItems = [
  // ── Movies ──
  {
    id: "m-blade-runner-2049",
    type: "movie",
    code: null,
    title: "Blade Runner 2049",
    title_th: "Blade Runner 2049",
    title_ja: "ブレードランナー 2049",
    title_en: "Blade Runner 2049",
    overview: "Thirty years after the events of the first film, a new blade runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what's left of society into chaos.",
    tagline: "There's still a page left.",
    director: "Denis Villeneuve",
    runtime: 164,
    release_date: "2017-10-06",
    country: "United States",
    year: 2017,
    studio: "Warner Bros. Pictures / Alcon Entertainment",
    rating: 8.5,
    votes: 4890,
    views: 14200,
    trailer_url: "https://www.youtube.com/watch?v=gCcx85zbxz4",
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    tags: ["Sci-Fi", "Neo-Noir", "Action", "Cyberpunk", "Dystopia"],
    actors: [],
    extra_meta: {
      budget: 150000000,
      revenue: 259300000,
      castDetails: [
        { name: "Ryan Gosling", character: "Officer K", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80" },
        { name: "Harrison Ford", character: "Rick Deckard", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80" },
        { name: "Ana de Armas", character: "Joi", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" },
        { name: "Sylvia Hoeks", character: "Luv", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80" },
      ],
      crewDetails: [
        { name: "Denis Villeneuve", role: "Director" },
        { name: "Hampton Fancher", role: "Screenplay" },
        { name: "Roger Deakins", role: "Director of Photography" },
        { name: "Hans Zimmer", role: "Original Score" },
      ],
      productionCompanies: [
        { name: "Alcon Entertainment" },
        { name: "Columbia Pictures" },
        { name: "Scott Free Productions" },
      ],
    },
    preview_images: [
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    ],
    sources: [
      { label: "Main Server (4K HLS)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
      { label: "Backup Server 1 (Tears of Steel)", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8", kind: "hls" },
      { label: "Direct MP4 (Big Buck Bunny)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", kind: "other" },
    ],
  },
  {
    id: "m-inception",
    type: "movie",
    code: null,
    title: "Inception",
    title_th: "Inception",
    title_ja: "インセプション",
    title_en: "Inception",
    overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
    tagline: "Your mind is the scene of the crime.",
    director: "Christopher Nolan",
    runtime: 148,
    release_date: "2010-07-16",
    country: "United States",
    year: 2010,
    studio: "Warner Bros. / Legendary Pictures / Syncopy",
    rating: 8.8,
    votes: 9340,
    views: 22100,
    trailer_url: "https://www.youtube.com/watch?v=YoHD9XEInc0",
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    tags: ["Sci-Fi", "Psychological", "Action", "Thriller"],
    actors: [],
    extra_meta: {
      budget: 160000000,
      revenue: 836800000,
      castDetails: [
        { name: "Leonardo DiCaprio", character: "Dom Cobb", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80" },
        { name: "Joseph Gordon-Levitt", character: "Arthur", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80" },
        { name: "Elliot Page", character: "Ariadne", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" },
        { name: "Tom Hardy", character: "Eames", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80" },
      ],
      crewDetails: [
        { name: "Christopher Nolan", role: "Director & Writer" },
        { name: "Hans Zimmer", role: "Original Score" },
      ],
      productionCompanies: [
        { name: "Syncopy" },
        { name: "Legendary Pictures" },
        { name: "Warner Bros." },
      ],
    },
    preview_images: [
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
    ],
    sources: [
      { label: "Main Server 4K", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
      { label: "Server 2 (MP4)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", kind: "other" },
    ],
  },
  {
    id: "m-john-wick-4",
    type: "movie",
    code: null,
    title: "John Wick: Chapter 4",
    title_th: "John Wick: Chapter 4",
    title_ja: "ジョン・ウィック: チャプター4",
    title_en: "John Wick: Chapter 4",
    overview: "John Wick uncovers a path to defeating The High Table. But before he can earn his freedom, Wick must face off against a new enemy with powerful alliances across the globe and forces that turn old friends into foes.",
    tagline: "No way back, one way out.",
    director: "Chad Stahelski",
    runtime: 169,
    release_date: "2023-03-24",
    country: "United States",
    year: 2023,
    studio: "Lionsgate / Thunder Road Pictures / 87Eleven",
    rating: 8.2,
    votes: 4120,
    views: 19800,
    trailer_url: "https://www.youtube.com/watch?v=qEVUtrk8_B4",
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&auto=format&fit=crop&q=80",
    tags: ["Action", "Assassin", "Thriller", "Martial Arts"],
    actors: [],
    extra_meta: {
      budget: 100000000,
      revenue: 440100000,
      castDetails: [
        { name: "Keanu Reeves", character: "John Wick", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80" },
        { name: "Donnie Yen", character: "Caine", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80" },
        { name: "Bill Skarsgård", character: "Marquis", avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80" },
      ],
      crewDetails: [
        { name: "Chad Stahelski", role: "Director" },
        { name: "Shay Hatten", role: "Writer" },
      ],
      productionCompanies: [
        { name: "Lionsgate" },
        { name: "Thunder Road Pictures" },
        { name: "87Eleven" },
      ],
    },
    preview_images: [
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&auto=format&fit=crop&q=80",
    ],
    sources: [
      { label: "Main Server 4K HDR", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
    ],
  },
  {
    id: "m-interstellar",
    type: "movie",
    code: null,
    title: "Interstellar",
    title_th: "Interstellar",
    title_ja: "インターステラー",
    title_en: "Interstellar",
    overview: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    director: "Christopher Nolan",
    runtime: 169,
    release_date: "2014-11-07",
    country: "United States",
    year: 2014,
    studio: "Paramount Pictures / Warner Bros. / Legendary",
    rating: 8.7,
    votes: 8900,
    views: 25400,
    trailer_url: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80",
    tags: ["Sci-Fi", "Space", "Time Travel", "Drama"],
    actors: [],
    extra_meta: {
      budget: 165000000,
      revenue: 773800000,
      castDetails: [
        { name: "Matthew McConaughey", character: "Joseph Cooper", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80" },
        { name: "Anne Hathaway", character: "Dr. Amelia Brand", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" },
        { name: "Jessica Chastain", character: "Murphy Cooper", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80" },
      ],
      crewDetails: [
        { name: "Christopher Nolan", role: "Director & Writer" },
        { name: "Jonathan Nolan", role: "Writer" },
        { name: "Hans Zimmer", role: "Composer" },
      ],
      productionCompanies: [
        { name: "Paramount Pictures" },
        { name: "Warner Bros." },
        { name: "Syncopy" },
      ],
    },
    preview_images: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop&q=80",
    ],
    sources: [
      { label: "Main Server IMAX HLS", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
      { label: "Backup Server", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8", kind: "hls" },
    ],
  },

  // ── Series ──
  {
    id: "m-cyberpunk-edgerunners",
    type: "series",
    code: null,
    title: "Cyberpunk: Edgerunners",
    title_th: "Cyberpunk: Edgerunners",
    title_ja: "サイバーパンク エッジランナーズ",
    title_en: "Cyberpunk: Edgerunners",
    overview: "A street kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an edgerunner: a mercenary outlaw.",
    network: "Netflix",
    runtime: 25,
    country: "Japan / Poland",
    year: 2022,
    studio: "Studio Trigger / CD PROJEKT RED",
    rating: 8.9,
    votes: 6120,
    views: 18500,
    trailer_url: "https://www.youtube.com/watch?v=JtqIas3bYhg",
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80",
    tags: ["Anime", "Cyberpunk", "Action", "Top Series"],
    actors: [],
    extra_meta: {
      schedule: "Full Season on Netflix",
      seriesStatus: "Ended (1 Season, 10 Episodes)",
      castDetails: [
        { name: "KENN", character: "David Martinez", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80" },
        { name: "Aoi Yuuki", character: "Lucy", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" },
        { name: "Hiroki Touchi", character: "Maine", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80" },
      ],
      crewDetails: [
        { name: "Hiroyuki Imaishi", role: "Director" },
        { name: "Rafal Jaki", role: "Creator & Showrunner" },
      ],
    },
    seasons: [
      {
        season_number: 1,
        episodes: [
          { number: 1, title: "Let You Down", overview: "David attends the prestigious Arasaka Academy while living in squalor with his overworked mother Gloria.", duration: 1500, thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80" },
          { number: 2, title: "Like a Boy", overview: "With his chrome-infused body, David confronts the school bully. Later, he encounters an enigmatic netrunner named Lucy.", duration: 1560, thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80" },
          { number: 3, title: "Smooth Criminal", overview: "David is recruited by Maine's edgerunner crew and given a baptism by cyberware in Night City's underworld.", duration: 1620, thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80" },
          { number: 4, title: "Lucky You", overview: "Eager to learn the ropes of mercenary work, David asks Maine to put him on training and mission duties.", duration: 1480, thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80" },
        ],
      },
    ],
    sources: [
      { label: "Primary Stream Full HD (HLS)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
      { label: "Backup Stream (Unified HLS)", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8", kind: "hls" },
    ],
  },
  {
    id: "m-altered-carbon",
    type: "series",
    code: null,
    title: "Altered Carbon",
    title_th: "Altered Carbon",
    title_ja: "オルタード・カーボン",
    title_en: "Altered Carbon",
    overview: "In a futuristic world where human consciousness is digitized into stacks and transferred between bodies, former envoy Takeshi Kovacs is revived to solve the murder of a wealthy titan.",
    network: "Netflix",
    runtime: 55,
    country: "United States",
    year: 2018,
    studio: "Skydance Television / Netflix",
    rating: 8.0,
    votes: 3800,
    views: 11200,
    trailer_url: "https://www.youtube.com/watch?v=M8PsZki6NGU",
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80",
    tags: ["Series", "Cyberpunk", "Investigation", "Sci-Fi"],
    actors: [],
    extra_meta: {
      schedule: "Completed Series (2 Seasons)",
      seriesStatus: "Ended",
      castDetails: [
        { name: "Joel Kinnaman", character: "Takeshi Kovacs (S1)", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80" },
        { name: "Anthony Mackie", character: "Takeshi Kovacs (S2)", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80" },
        { name: "Martha Higareda", character: "Kristin Ortega", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" },
      ],
      crewDetails: [
        { name: "Laeta Kalogridis", role: "Creator & Showrunner" },
      ],
    },
    seasons: [
      {
        season_number: 1,
        episodes: [
          { number: 1, title: "Out of the Past", overview: "Awakening in a new body 250 years after his death, Takeshi Kovacs learns he was spun up to help solve the murder of Laurence Bancroft.", duration: 3400, thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80" },
          { number: 2, title: "Fallen Angel", overview: "Kovacs tracks down the man who sent Bancroft a death threat. Lieutenant Ortega tracks Kovacs' every movement.", duration: 3300, thumbnail: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80" },
        ],
      },
    ],
    sources: [
      { label: "Episode 1 (HLS)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
    ],
  },

  // ── JAV 18+ Items ──
  {
    id: "ssis-001",
    type: "jav",
    code: "SSIS-001",
    title: "SSIS-001 First Premium Showcase - Yua Mikami",
    title_th: "First Premium Showcase - Yua Mikami",
    title_ja: "奇跡の美少女 三上悠亜 プレミアムファースト",
    title_en: "Miracle Debut - Yua Mikami",
    overview: "Masterpiece debut showcase featuring iconic idol Yua Mikami, presented with crystal-clear 4K Ultra HD mastering.",
    director: "Usshi",
    runtime: 120,
    release_date: "2021-08-19",
    country: "Japan",
    year: 2021,
    studio: "S1 NO.1 STYLE",
    rating: 9.4,
    votes: 3200,
    views: 31000,
    trailer_url: null,
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1600&auto=format&fit=crop&q=80",
    tags: ["18+", "JAV", "Idol", "Premium", "4K Ultra HD"],
    actors: ["yua-mikami"],
    extra_meta: {
      label: "S1 NO.1 STYLE",
      seriesName: "Miracle Debut Showcase",
      actressDetails: [
        { name: "Yua Mikami", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80", actressId: "yua-mikami" },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
      ],
    },
    preview_images: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    ],
    sources: [
      { label: "Server 1 (Fast HLS)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
      { label: "Server 2 (Direct MP4)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", kind: "other" },
    ],
  },
  {
    id: "mide-888",
    type: "jav",
    code: "MIDE-888",
    title: "MIDE-888 Special Secret Date - Eimi Fukada",
    title_th: "Special Secret Date - Eimi Fukada",
    title_ja: "秘密のプライベートデート 深田えいみ",
    title_en: "Secret Private Date - Eimi Fukada",
    overview: "An exclusive private date in a luxury hotel located in central Tokyo with the charismatic and gorgeous Eimi Fukada.",
    director: "Hideto Aki",
    runtime: 130,
    release_date: "2022-04-12",
    country: "Japan",
    year: 2022,
    studio: "MOODYZ",
    rating: 9.1,
    votes: 2750,
    views: 28400,
    trailer_url: null,
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&auto=format&fit=crop&q=80",
    tags: ["18+", "JAV", "Beauty", "Secret Date", "MOODYZ"],
    actors: ["eimi-fukada"],
    extra_meta: {
      label: "MOODYZ",
      seriesName: "Secret Private Date",
      actressDetails: [
        { name: "Eimi Fukada", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80", actressId: "eimi-fukada" },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
      ],
    },
    preview_images: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    ],
    sources: [
      { label: "Main Server (HLS 4K)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
    ],
  },
  {
    id: "prem-102",
    type: "jav",
    code: "PREM-102",
    title: "PREM-102 Sweet Romance - Karen Kaede",
    title_th: "Sweet Romance - Karen Kaede",
    title_ja: "スウィートロマンス 楓カレン",
    title_en: "Sweet Romance - Karen Kaede",
    overview: "Experience the genuine warmth and elegance of Karen Kaede in this emotionally captivating and artistic production.",
    director: "Zack Arai",
    runtime: 125,
    release_date: "2023-01-20",
    country: "Japan",
    year: 2023,
    studio: "IDEA POCKET",
    rating: 8.9,
    votes: 1980,
    views: 17300,
    trailer_url: null,
    status: "published",
    poster_path: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    backdrop_path: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    tags: ["18+", "JAV", "Romance", "Idea Pocket"],
    actors: ["karen-kaede"],
    extra_meta: {
      label: "IDEA POCKET",
      seriesName: "Sweet Romance Series",
      actressDetails: [
        { name: "Karen Kaede", avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80", actressId: "karen-kaede" },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
      ],
    },
    preview_images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    ],
    sources: [
      { label: "Direct Stream (HLS)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", kind: "hls" },
    ],
  },
];

const insertMedia = db.prepare(`
  INSERT INTO media (
    id, type, code, title, title_th, title_ja, title_en,
    overview, country, year, studio, rating, votes, views,
    trailer_url, director, runtime, release_date, tagline, network, extra_meta,
    status, poster_path, backdrop_path,
    search_tokens, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    title_th = excluded.title_th,
    overview = excluded.overview,
    director = excluded.director,
    runtime = excluded.runtime,
    release_date = excluded.release_date,
    tagline = excluded.tagline,
    network = excluded.network,
    extra_meta = excluded.extra_meta,
    poster_path = excluded.poster_path,
    backdrop_path = excluded.backdrop_path,
    rating = excluded.rating,
    views = excluded.views,
    status = excluded.status,
    updated_at = excluded.updated_at
`);

const insertSource = db.prepare(`
  INSERT INTO media_sources (media_id, label, url, kind, healthy, sort)
  VALUES (?, ?, ?, ?, 1, ?)
`);

const insertTag = db.prepare(`
  INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)
`);

const insertActor = db.prepare(`
  INSERT OR IGNORE INTO media_actors (media_id, actress_id) VALUES (?, ?)
`);

const insertImage = db.prepare(`
  INSERT INTO media_images (media_id, kind, path, sort) VALUES (?, ?, ?, ?)
`);

const insSeason = db.prepare(
  "INSERT OR IGNORE INTO seasons (media_id, season_number) VALUES (?, ?)",
);
const getSeason = db.prepare(
  "SELECT id FROM seasons WHERE media_id = ? AND season_number = ?",
);
const insEpisode = db.prepare(`
  INSERT OR IGNORE INTO episodes (
    season_id, episode_number, title, overview, thumbnail_path, duration, sources
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const clearOld = db.transaction(() => {
  for (const m of mediaItems) {
    db.prepare("DELETE FROM media_sources WHERE media_id = ?").run(m.id);
    db.prepare("DELETE FROM media_tags WHERE media_id = ?").run(m.id);
    db.prepare("DELETE FROM media_actors WHERE media_id = ?").run(m.id);
    db.prepare("DELETE FROM media_images WHERE media_id = ?").run(m.id);
    db.prepare("DELETE FROM seasons WHERE media_id = ?").run(m.id);
  }
});
clearOld();

for (const m of mediaItems) {
  const searchTokens = [m.title, m.title_th, m.title_en, m.code, ...(m.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  insertMedia.run(
    m.id,
    m.type,
    m.code,
    m.title,
    m.title_th,
    m.title_ja,
    m.title_en,
    m.overview,
    m.country,
    m.year,
    m.studio,
    m.rating,
    m.votes,
    m.views,
    m.trailer_url,
    m.director || null,
    m.runtime || null,
    m.release_date || null,
    m.tagline || null,
    m.network || null,
    JSON.stringify(m.extra_meta || {}),
    m.status,
    m.poster_path,
    m.backdrop_path,
    searchTokens,
    now,
    now,
  );

  // Sources
  if (m.sources) {
    m.sources.forEach((s, idx) => {
      insertSource.run(m.id, s.label, s.url, s.kind, idx);
    });
  }

  // Tags
  if (m.tags) {
    for (const t of m.tags) {
      insertTag.run(m.id, t);
    }
  }

  // Actors
  if (m.actors) {
    for (const aId of m.actors) {
      insertActor.run(m.id, aId);
    }
  }

  // Preview images
  if (m.preview_images && m.preview_images.length > 0) {
    m.preview_images.forEach((img, idx) => {
      insertImage.run(m.id, "preview", img, idx);
    });
  } else {
    if (m.poster_path) insertImage.run(m.id, "preview", m.poster_path, 0);
    if (m.backdrop_path) insertImage.run(m.id, "preview", m.backdrop_path, 1);
  }

  // Structured Seasons & Episodes for Series
  if (m.seasons) {
    for (const s of m.seasons) {
      insSeason.run(m.id, s.season_number);
      const sRow = getSeason.get(m.id, s.season_number);
      if (sRow && s.episodes) {
        for (const ep of s.episodes) {
          const defaultSources = JSON.stringify([
            {
              label: "Main Server (HLS)",
              url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
              kind: "hls",
              healthy: true,
            },
          ]);
          insEpisode.run(
            sRow.id,
            ep.number,
            ep.title,
            ep.overview,
            ep.thumbnail,
            ep.duration,
            defaultSources,
          );
        }
      }
    }
  }
}

console.log(`Successfully seeded ${mediaItems.length} media items with rich metadata and ${actresses.length} actresses!`);

