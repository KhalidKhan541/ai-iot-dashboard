type CacheEntry<T> = {
  value: T;
  expiry: number | null;
  accessCount: number;
  lastAccessed: number;
};

export interface CacheOptions {
  ttl?: number;
  maxEntries?: number;
  maxSize?: number;
  strategy?: "lru" | "lfu" | "fifo";
}

export class MemoryCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl ?? 300_000,
      maxEntries: options.maxEntries ?? 1000,
      maxSize: options.maxSize ?? 50 * 1024 * 1024,
      strategy: options.strategy ?? "lru",
    };
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiry && Date.now() > entry.expiry) {
      this.delete(key);
      return undefined;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    if (this.store.has(key)) {
      this.delete(key);
    }

    if (this.store.size >= this.options.maxEntries) {
      this.evict();
    }

    const expiry = ttl !== undefined
      ? Date.now() + ttl
      : this.options.ttl > 0
        ? Date.now() + this.options.ttl
        : null;

    this.store.set(key, {
      value,
      expiry,
      accessCount: 0,
      lastAccessed: Date.now(),
    });

    if (expiry !== null) {
      const timer = setTimeout(() => this.delete(key), expiry - Date.now());
      this.timers.set(key, timer);
    }
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (entry.expiry && Date.now() > entry.expiry) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    return this.store.delete(key);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.store.clear();
  }

  getOrSet(key: string, factory: () => T | Promise<T>, ttl?: number): T | Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = factory();
    if (value instanceof Promise) {
      return value.then((v) => {
        this.set(key, v, ttl);
        return v;
      });
    }

    this.set(key, value, ttl);
    return value;
  }

  private evict(): void {
    if (this.store.size === 0) return;

    let targetKey: string | null = null;

    switch (this.options.strategy) {
      case "lru": {
        let oldest = Infinity;
        for (const [key, entry] of this.store) {
          if (entry.lastAccessed < oldest) {
            oldest = entry.lastAccessed;
            targetKey = key;
          }
        }
        break;
      }
      case "lfu": {
        let leastAccess = Infinity;
        for (const [key, entry] of this.store) {
          if (entry.accessCount < leastAccess) {
            leastAccess = entry.accessCount;
            targetKey = key;
          }
        }
        break;
      }
      case "fifo":
        targetKey = this.store.keys().next().value ?? null;
        break;
    }

    if (targetKey) {
      this.delete(targetKey);
    }
  }

  keys(): string[] {
    return Array.from(this.store.keys()).filter((key) => {
      const entry = this.store.get(key);
      if (entry?.expiry && Date.now() > entry.expiry) {
        this.delete(key);
        return false;
      }
      return true;
    });
  }

  size(): number {
    return this.keys().length;
  }

  stats(): {
    size: number;
    hits: number;
    misses: number;
  } {
    return {
      size: this.store.size,
      hits: 0,
      misses: 0,
    };
  }
}

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number;
  retryDelay?: number;
  maxRetries?: number;
}

export interface CacheAsideOptions {
  ttl?: number;
  keyPrefix?: string;
  refreshThreshold?: number;
}

export class RedisCache {
  private config: Required<RedisConfig>;
  private memoryFallback: MemoryCache;
  private connected = false;

  constructor(config: RedisConfig = {}) {
    this.config = {
      host: config.host ?? "localhost",
      port: config.port ?? 6379,
      password: config.password ?? "",
      db: config.db ?? 0,
      keyPrefix: config.keyPrefix ?? "iot:",
      defaultTTL: config.defaultTTL ?? 300,
      retryDelay: config.retryDelay ?? 1000,
      maxRetries: config.maxRetries ?? 3,
    };

    this.memoryFallback = new MemoryCache({
      ttl: this.config.defaultTTL * 1000,
    });
  }

  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  async connect(): Promise<void> {
    try {
      this.connected = true;
    } catch {
      this.connected = false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.connected) {
      return this.memoryFallback.get(key) as T | undefined ?? null;
    }

    try {
      return null;
    } catch {
      return this.memoryFallback.get(key) as T | undefined ?? null;
    }
  }

  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.connected) {
      this.memoryFallback.set(key, value, (ttl ?? this.config.defaultTTL) * 1000);
      return;
    }

    try {
      this.memoryFallback.set(key, value, (ttl ?? this.config.defaultTTL) * 1000);
    } catch {
      this.memoryFallback.set(key, value, (ttl ?? this.config.defaultTTL) * 1000);
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.connected) {
      return this.memoryFallback.delete(key);
    }

    try {
      this.memoryFallback.delete(key);
      return true;
    } catch {
      return this.memoryFallback.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      return this.memoryFallback.has(key);
    }

    try {
      return this.memoryFallback.has(key);
    } catch {
      return this.memoryFallback.has(key);
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return false;
    await this.set(key, value, ttl);
    return true;
  }

  async mget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    return results;
  }

  async mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current ?? 0) + amount;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  async keys(pattern: string = "*"): Promise<string[]> {
    if (!this.connected) {
      return this.memoryFallback.keys().filter((k) => {
        const regex = new RegExp(
          "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
        );
        return regex.test(k);
      });
    }

    try {
      return this.memoryFallback.keys();
    } catch {
      return [];
    }
  }

  async flushdb(): Promise<void> {
    this.memoryFallback.clear();
  }

  cacheAside<R>(
    key: string,
    fetcher: () => Promise<R>,
    options: CacheAsideOptions = {}
  ): Promise<R> {
    const { ttl = this.config.defaultTTL, refreshThreshold } = options;

    return new Promise(async (resolve, reject) => {
      try {
        const cached = await this.get<R>(key);
        if (cached !== null) {
          resolve(cached);

          if (refreshThreshold) {
            const entry = (this.memoryFallback as unknown as { store: Map<string, { expiry: number | null }> }).store.get(key);
            if (entry?.expiry) {
              const remaining = entry.expiry - Date.now();
              if (remaining < refreshThreshold * 1000) {
                fetcher()
                  .then((fresh) => this.set(key, fresh, ttl))
                  .catch(() => {});
              }
            }
          }
          return;
        }

        const freshData = await fetcher();
        await this.set(key, freshData, ttl);
        resolve(freshData);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
}

export function createCache<T = unknown>(options?: CacheOptions): MemoryCache<T> {
  return new MemoryCache<T>(options);
}

export function createRedisCache(config?: RedisConfig): RedisCache {
  return new RedisCache(config);
}

export const defaultCache = createCache({ ttl: 300_000, maxEntries: 500 });
export const defaultRedis = createRedisCache();

export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options?: { ttl?: number; cache?: RedisCache }
): Promise<T> {
  const cache = options?.cache ?? defaultRedis;
  return cache.cacheAside(key, fn, { ttl: options?.ttl });
}
