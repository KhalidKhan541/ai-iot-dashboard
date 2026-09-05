import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type StorageTier = 'hot' | 'warm' | 'cold' | 'archive';

export interface StoredReading {
  id: string;
  deviceId: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  tier: StorageTier;
  compressed: boolean;
  checksum: string;
}

export interface StorageConfig {
  hotRetentionDays: number;
  warmRetentionDays: number;
  coldRetentionDays: number;
  compressionThreshold: number;
  maxStorageSizeBytes: number;
  autoTieringEnabled: boolean;
}

export interface StorageStats {
  totalReadings: number;
  totalSizeBytes: number;
  byTier: Record<StorageTier, number>;
  compressionRatio: number;
  oldestReading?: Date;
  newestReading?: Date;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class StorageService {
  private storage: Map<string, StoredReading> = new Map();
  private config: StorageConfig;
  private tierStats: Record<StorageTier, number> = {
    hot: 0,
    warm: 0,
    cold: 0,
    archive: 0,
  };

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      hotRetentionDays: config?.hotRetentionDays ?? 7,
      warmRetentionDays: config?.warmRetentionDays ?? 30,
      coldRetentionDays: config?.coldRetentionDays ?? 90,
      compressionThreshold: config?.compressionThreshold ?? 1000,
      maxStorageSizeBytes: config?.maxStorageSizeBytes ?? 10 * 1024 * 1024 * 1024,
      autoTieringEnabled: config?.autoTieringEnabled ?? true,
    };
  }

  store(readings: Omit<StoredReading, 'id' | 'tier' | 'compressed' | 'checksum'>[]): string[] {
    const ids: string[] = [];
    for (const reading of readings) {
      const id = crypto.randomUUID();
      const checksum = this.computeChecksum(reading);
      const tier = this.determineTier(reading.timestamp);
      const shouldCompress = this.shouldCompress(tier);

      const stored: StoredReading = {
        ...reading,
        id,
        tier,
        compressed: shouldCompress,
        checksum,
      };

      this.storage.set(id, stored);
      this.tierStats[tier]++;
      ids.push(id);
    }
    return ids;
  }

  retrieve(id: string): StoredReading | undefined {
    return this.storage.get(id);
  }

  query(filter: {
    deviceId?: string;
    metric?: string;
    timeRange?: TimeRange;
    tier?: StorageTier[];
    limit?: number;
  }): StoredReading[] {
    let results = Array.from(this.storage.values());

    if (filter.deviceId) {
      results = results.filter(r => r.deviceId === filter.deviceId);
    }
    if (filter.metric) {
      results = results.filter(r => r.metric === filter.metric);
    }
    if (filter.timeRange) {
      results = results.filter(
        r => r.timestamp >= filter.timeRange!.start && r.timestamp <= filter.timeRange!.end
      );
    }
    if (filter.tier?.length) {
      results = results.filter(r => filter.tier!.includes(r.tier));
    }

    results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  private determineTier(timestamp: Date): StorageTier {
    if (!this.config.autoTieringEnabled) return 'hot';
    const ageMs = Date.now() - timestamp.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    if (ageMs <= this.config.hotRetentionDays * dayMs) return 'hot';
    if (ageMs <= this.config.warmRetentionDays * dayMs) return 'warm';
    if (ageMs <= this.config.coldRetentionDays * dayMs) return 'cold';
    return 'archive';
  }

  private shouldCompress(tier: StorageTier): boolean {
    return tier !== 'hot';
  }

  private computeChecksum(reading: Omit<StoredReading, 'id' | 'tier' | 'compressed' | 'checksum'>): string {
    const data = `${reading.deviceId}:${reading.metric}:${reading.value}:${reading.timestamp.getTime()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  promoteTier(id: string, targetTier: StorageTier): StoredReading | undefined {
    const reading = this.storage.get(id);
    if (!reading) return undefined;
    const oldTier = reading.tier;
    reading.tier = targetTier;
    reading.compressed = targetTier !== 'hot';
    this.tierStats[oldTier]--;
    this.tierStats[targetTier]++;
    return reading;
  }

  delete(id: string): boolean {
    const reading = this.storage.get(id);
    if (!reading) return false;
    this.tierStats[reading.tier]--;
    return this.storage.delete(id);
  }

  deleteByTimeRange(range: TimeRange): number {
    let deleted = 0;
    this.storage.forEach((reading, id) => {
      if (reading.timestamp >= range.start && reading.timestamp <= range.end) {
        this.tierStats[reading.tier]--;
        this.storage.delete(id);
        deleted++;
      }
    });
    return deleted;
  }

  getStats(): StorageStats {
    const all = Array.from(this.storage.values());
    let totalSize = 0;
    all.forEach(r => {
      totalSize += r.compressed ? r.value.toString().length / 2 : r.value.toString().length;
    });

    const timestamps = all.map(r => r.timestamp.getTime());
    const compressionCount = all.filter(r => r.compressed).length;

    return {
      totalReadings: all.length,
      totalSizeBytes: totalSize,
      byTier: { ...this.tierStats },
      compressionRatio: all.length > 0 ? compressionCount / all.length : 0,
      oldestReading: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestReading: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined,
    };
  }

  getAvailableStorage(): number {
    return this.config.maxStorageSizeBytes - this.getStats().totalSizeBytes;
  }

  needsTiering(): boolean {
    return this.tierStats.hot > this.config.compressionThreshold;
  }

  clear(): void {
    this.storage.clear();
    this.tierStats = { hot: 0, warm: 0, cold: 0, archive: 0 };
  }

  count(): number {
    return this.storage.size;
  }
}
