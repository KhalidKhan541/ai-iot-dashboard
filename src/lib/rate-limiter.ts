export interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  onRateLimit?: (identifier: string, retryAfter: number) => void;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
  legacyKeys?: boolean;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  queue: Array<{
    resolve: (value: boolean) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>;
}

interface SlidingWindowEntry {
  timestamps: number[];
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private config: Required<RateLimiterConfig>;

  constructor(config: RateLimiterConfig) {
    this.config = {
      keyGenerator: (id: string) => id,
      onRateLimit: () => {},
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: "Too many requests",
      headers: true,
      legacyKeys: false,
      ...config,
    };
  }

  private getBucket(key: string): TokenBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: this.config.maxRequests,
        lastRefill: Date.now(),
        queue: [],
      });
    }

    const bucket = this.buckets.get(key)!;
    this.refillTokens(bucket);
    return bucket;
  }

  private refillTokens(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const refillRate = this.config.maxRequests / this.config.windowMs;
    const tokensToAdd = Math.floor(elapsed * refillRate);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  async acquire(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
    total: number;
  }> {
    const key = this.config.keyGenerator(identifier);
    const bucket = this.getBucket(key);

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

    if (bucket.tokens > 0) {
      bucket.tokens--;
      bucket.timestamps.push(now);

      return {
        allowed: true,
        remaining: bucket.tokens,
        retryAfter: 0,
        total: this.config.maxRequests,
      };
    }

    const oldestTimestamp = bucket.timestamps[0];
    const retryAfter = oldestTimestamp
      ? oldestTimestamp + this.config.windowMs - now
      : this.config.windowMs;

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(retryAfter / 1000),
      total: this.config.maxRequests,
    };
  }

  async consume(identifier: string): Promise<boolean> {
    const result = await this.acquire(identifier);

    if (!result.allowed) {
      this.config.onRateLimit(identifier, result.retryAfter);
      return false;
    }

    return true;
  }

  async wait(identifier: string, maxWaitMs: number = 30000): Promise<boolean> {
    const result = await this.acquire(identifier);
    if (result.allowed) return true;

    if (result.retryAfter * 1000 > maxWaitMs) return false;

    return new Promise((resolve) => {
      setTimeout(async () => {
        const retryResult = await this.acquire(identifier);
        resolve(retryResult.allowed);
      }, result.retryAfter * 1000);
    });
  }

  getRemaining(identifier: string): number {
    const key = this.config.keyGenerator(identifier);
    const bucket = this.buckets.get(key);
    if (!bucket) return this.config.maxRequests;

    this.refillTokens(bucket);
    return bucket.tokens;
  }

  reset(identifier: string): void {
    const key = this.config.keyGenerator(identifier);
    this.buckets.delete(key);
  }

  resetAll(): void {
    this.buckets.clear();
  }

  getStats(): {
    totalBuckets: number;
    totalRequests: number;
  } {
    let totalRequests = 0;
    for (const bucket of this.buckets.values()) {
      totalRequests += bucket.timestamps.length;
    }
    return {
      totalBuckets: this.buckets.size,
      totalRequests,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      const lastTimestamp = bucket.timestamps[bucket.timestamps.length - 1];
      if (lastTimestamp && now - lastTimestamp > this.config.windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }

  startCleanup(intervalMs: number = 60000): ReturnType<typeof setInterval> {
    return setInterval(() => this.cleanup(), intervalMs);
  }
}

export class SlidingWindowRateLimiter {
  private windows = new Map<string, SlidingWindowEntry>();
  private config: Required<RateLimiterConfig>;

  constructor(config: RateLimiterConfig) {
    this.config = {
      keyGenerator: (id: string) => id,
      onRateLimit: () => {},
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: "Too many requests",
      headers: true,
      legacyKeys: false,
      ...config,
    };
  }

  private getWindow(key: string): SlidingWindowEntry {
    if (!this.windows.has(key)) {
      this.windows.set(key, { timestamps: [] });
    }
    return this.windows.get(key)!;
  }

  async consume(identifier: string): Promise<boolean> {
    const key = this.config.keyGenerator(identifier);
    const window = this.getWindow(key);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    window.timestamps = window.timestamps.filter((t) => t > windowStart);

    if (window.timestamps.length >= this.config.maxRequests) {
      this.config.onRateLimit(identifier, this.config.windowMs / 1000);
      return false;
    }

    window.timestamps.push(now);
    return true;
  }

  async check(identifier: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    retryAfter: number;
  }> {
    const key = this.config.keyGenerator(identifier);
    const window = this.getWindow(key);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    window.timestamps = window.timestamps.filter((t) => t > windowStart);

    const current = window.timestamps.length;
    const allowed = current < this.config.maxRequests;
    const retryAfter = allowed
      ? 0
      : Math.ceil((window.timestamps[0] + this.config.windowMs - now) / 1000);

    return {
      allowed,
      current,
      limit: this.config.maxRequests,
      retryAfter,
    };
  }

  reset(identifier: string): void {
    const key = this.config.keyGenerator(identifier);
    this.windows.delete(key);
  }

  resetAll(): void {
    this.windows.clear();
  }
}

export function createRateLimiter(
  config: RateLimiterConfig,
  type: "token-bucket" | "sliding-window" = "token-bucket"
): TokenBucketRateLimiter | SlidingWindowRateLimiter {
  if (type === "sliding-window") {
    return new SlidingWindowRateLimiter(config);
  }
  return new TokenBucketRateLimiter(config);
}

export const apiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
  message: "Too many API requests",
});

export const authRateLimiter = createRateLimiter({
  windowMs: 900_000,
  maxRequests: 5,
  message: "Too many authentication attempts",
});

export const deviceRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 1000,
  message: "Too many device updates",
});

export function rateLimitMiddleware(
  limiter: TokenBucketRateLimiter | SlidingWindowRateLimiter
) {
  return async (identifier: string): Promise<{
    success: boolean;
    headers: Record<string, string>;
  }> => {
    const result = await limiter.consume(identifier);

    return {
      success: result,
      headers: {
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": result ? "99" : "0",
        "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 60),
      },
    };
  };
}
