// Shared app constants (§5 UX of the plan)

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/library/movies", label: "Movies" },
  { href: "/library/series", label: "Series" },
  { href: "/favorites", label: "Favorites" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
] as const;

// localStorage keys
export const RESUME_KEY = "mv:resume"; // playback resume positions
export const AGE_KEY = "mv:age.verified"; // 18+ gate confirmation
export const PIN_HASH_KEY = "mv:pin.hash"; // parental PIN (SHA-256, per plan §3)
export const SEARCH_HISTORY_KEY = "mv:search.history"; // recent searches
export const FAVORITES_KEY = "mv:favorites"; // local fallback when Firebase is off

// Public test HLS stream used to demo the player when no real sources exist yet.
// Clearly labeled in the UI — replace via the admin stream linker once the backend is live.
export const PUBLIC_TEST_STREAM = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";