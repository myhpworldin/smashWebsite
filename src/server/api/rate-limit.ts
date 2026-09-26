/**
 * Fixed-window, in-memory limiter. Best-effort protection against runaway
 * clients: state is per server instance and resets on restart, so it is not a
 * substitute for edge/CDN limits. Limits sit well above normal browsing and
 * crawler rates.
 */
export type RateLimitConfig = { limit: number; windowMs: number };

export const RATE_LIMITS = {
  /** Public content reads: ~2 requests/second sustained per client. */
  publicRead: { limit: 120, windowMs: 60_000 },
  /** The contact form. */
  publicWrite: { limit: 5, windowMs: 60_000 },
  /** Admin API (Stage 4, Phase 2): deliberately tight — one trusted admin, so this only exists to slow a stolen/guessed-token brute force, not to accommodate real traffic. */
  admin: { limit: 30, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>;
export const RATE_LIMIT = RATE_LIMITS.publicRead;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
/** Hard cap so spoofed client keys cannot grow memory without bound. */
export const MAX_BUCKETS = 10_000;
const MAX_KEY_LENGTH = 64;

export function checkRateLimit(key: string, now = Date.now(), { limit, windowMs }: RateLimitConfig = RATE_LIMIT) {
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    // Still full of live buckets: evict the oldest (Map keeps insertion order).
    for (const k of buckets.keys()) {
      if (buckets.size < MAX_BUCKETS) break;
      buckets.delete(k);
    }
  }

  let bucket = buckets.get(key);
  const fresh = !bucket || bucket.resetAt <= now;
  if (!bucket || fresh) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    /** True only for the first rejected request in a window, so it is logged once, not per request. */
    firstRejection: bucket.count === limit + 1,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export const resetRateLimits = () => buckets.clear();
export const bucketCount = () => buckets.size;

/**
 * First hop of x-forwarded-for (set by the hosting proxy), length-bounded.
 * `null` when the request carries no client address: those requests are not
 * limited, because pooling every anonymous visitor into one shared bucket would
 * let 120 requests lock everyone out. Edge/CDN limits cover that case.
 */
export const clientKey = (headers: Headers, scope = "read"): string | null => {
  const first = headers.get("x-forwarded-for")?.split(",")[0].trim();
  return first ? `${scope}:${first.slice(0, MAX_KEY_LENGTH)}` : null;
};
