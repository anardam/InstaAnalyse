interface RateLimitEntry {
  count: number;
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, timestamps: [now] });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS };
  }

  // Filter out timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
  entry.count = entry.timestamps.length;

  if (entry.count >= MAX_REQUESTS) {
    const oldestInWindow = entry.timestamps[0];
    const resetIn = WINDOW_MS - (now - oldestInWindow);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.timestamps.push(now);
  entry.count = entry.timestamps.length;
  store.set(ip, entry);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetIn: WINDOW_MS,
  };
}
