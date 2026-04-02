// Word lists for generating memorable anonymous nicknames.
// Names are generated at account creation and never stored in plaintext elsewhere.

const adjectives = [
  "silent", "swift", "hidden", "bright", "dark", "calm", "bold", "cool",
  "quiet", "sharp", "fuzzy", "lucky", "brave", "lazy", "wild", "odd",
  "neat", "slim", "tiny", "huge", "deep", "pale", "warm", "cold",
  "fast", "slow", "soft", "hard", "light", "heavy", "clear", "blunt",
  "dull", "free", "lost", "true", "fake", "real", "new", "old",
];

const nouns = [
  "fox", "owl", "cat", "bat", "rat", "elk", "eel", "ant", "bee", "fly",
  "jay", "ram", "yak", "gnu", "asp", "cod", "emu", "hen", "pig", "cow",
  "wolf", "bear", "deer", "frog", "hawk", "lion", "lynx", "mole", "newt",
  "puma", "seal", "slug", "swan", "toad", "wasp", "wren", "crab", "duck",
  "gull", "ibis", "kite", "lark", "moth", "pony", "quail", "robin",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/**
 * Returns a random human-readable nickname like "silent-fox-4821".
 * The numeric suffix adds entropy so collisions are rare without being
 * cryptographically meaningful.
 */
export function generateNickname(): string {
  const adj = pick(adjectives);
  const noun = pick(nouns);
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return `${adj}-${noun}-${suffix}`;
}
