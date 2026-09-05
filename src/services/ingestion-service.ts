import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SensorReading {
  id: string;
  deviceId: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  quality: number;
  metadata?: Record<string, unknown>;
}

export interface IngestionBatch {
  id: string;
  readings: SensorReading[];
  receivedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface IngestionConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  retryAttempts: number;
  deduplicationWindowMs: number;
  validationEnabled: boolean;
}

export interface IngestionStats {
  totalReceived: number;
  totalProcessed: number;
  totalFailed: number;
  totalDuplicates: number;
  avgProcessingTimeMs: number;
  lastFlushAt?: Date;
}

// ── Validation Schemas ──────────────────────────────────────────────────────

export const sensorReadingSchema = z.object({
  deviceId: z.string().min(1),
  metric: z.string().min(1).max(50),
  value: z.number(),
  unit: z.string().min(1).max(20),
  timestamp: z.string().datetime().optional(),
  quality: z.number().min(0).max(1).optional().default(1),
  metadata: z.record(z.unknown()).optional(),
});

// ── Service ─────────────────────────────────────────────────────────────────

export class IngestionService {
  private batches: Map<string, IngestionBatch> = new Map();
  private readings: SensorReading[] = [];
  private recentHashes: Map<string, number> = new Map();
  private stats: IngestionStats = {
    totalReceived: 0,
    totalProcessed: 0,
    totalFailed: 0,
    totalDuplicates: 0,
    avgProcessingTimeMs: 0,
  };
  private config: IngestionConfig;
  private processingTimes: number[] = [];

  constructor(config?: Partial<IngestionConfig>) {
    this.config = {
      maxBatchSize: config?.maxBatchSize ?? 1000,
      flushIntervalMs: config?.flushIntervalMs ?? 5000,
      retryAttempts: config?.retryAttempts ?? 3,
      deduplicationWindowMs: config?.deduplicationWindowMs ?? 60000,
      validationEnabled: config?.validationEnabled ?? true,
    };
  }

  ingest(rawData: unknown[]): { accepted: number; rejected: number; duplicates: number } {
    let accepted = 0;
    let rejected = 0;
    let duplicates = 0;

    const batch: IngestionBatch = {
      id: crypto.randomUUID(),
      readings: [],
      receivedAt: new Date(),
      status: 'pending',
    };

    for (const raw of rawData) {
      try {
        const validated = this.config.validationEnabled
          ? sensorReadingSchema.parse(raw)
          : raw as Omit<SensorReading, 'id' | 'timestamp'>;

        const reading: SensorReading = {
          id: crypto.randomUUID(),
          ...validated,
          timestamp: validated.timestamp
            ? new Date(validated.timestamp as string)
            : new Date(),
          quality: (validated as SensorReading).quality ?? 1,
        };

        const hash = this.computeHash(reading);
        if (this.isDuplicate(hash)) {
          duplicates++;
          this.stats.totalDuplicates++;
          continue;
        }

        batch.readings.push(reading);
        this.recentHashes.set(hash, Date.now());
        accepted++;
      } catch {
        rejected++;
        this.stats.totalFailed++;
      }
    }

    this.batches.set(batch.id, batch);
    this.stats.totalReceived += rawData.length;

    if (batch.readings.length > 0) {
      this.processBatch(batch);
    }

    return { accepted, rejected, duplicates };
  }

  private processBatch(batch: IngestionBatch): void {
    batch.status = 'processing';
    const start = Date.now();

    try {
      batch.readings.forEach(r => this.readings.push(r));
      batch.status = 'completed';
      batch.processedAt = new Date();

      const elapsed = Date.now() - start;
      this.processingTimes.push(elapsed);
      this.stats.totalProcessed += batch.readings.length;
      this.stats.avgProcessingTimeMs =
        this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      this.stats.lastFlushAt = new Date();
    } catch (err) {
      batch.status = 'failed';
      batch.error = err instanceof Error ? err.message : String(err);
    }
  }

  private computeHash(reading: SensorReading): string {
    return `${reading.deviceId}:${reading.metric}:${reading.value}:${reading.timestamp.getTime()}`;
  }

  private isDuplicate(hash: string): boolean {
    const now = Date.now();
    const lastSeen = this.recentHashes.get(hash);
    if (!lastSeen) return false;
    if (now - lastSeen > this.config.deduplicationWindowMs) {
      this.recentHashes.delete(hash);
      return false;
    }
    return true;
  }

  getReadings(filter?: { deviceId?: string; metric?: string; since?: Date }): SensorReading[] {
    let results = [...this.readings];
    if (filter?.deviceId) {
      results = results.filter(r => r.deviceId === filter.deviceId);
    }
    if (filter?.metric) {
      results = results.filter(r => r.metric === filter.metric);
    }
    if (filter?.since) {
      results = results.filter(r => r.timestamp >= filter.since!);
    }
    return results;
  }

  getBatch(id: string): IngestionBatch | undefined {
    return this.batches.get(id);
  }

  getStats(): IngestionStats {
    return { ...this.stats };
  }

  flush(): SensorReading[] {
    const flushed = [...this.readings];
    this.readings = [];
    return flushed;
  }

  cleanupDuplicates(): number {
    let cleaned = 0;
    const now = Date.now();
    this.recentHashes.forEach((timestamp, hash) => {
      if (now - timestamp > this.config.deduplicationWindowMs) {
        this.recentHashes.delete(hash);
        cleaned++;
      }
    });
    return cleaned;
  }

  clear(): void {
    this.batches.clear();
    this.readings = [];
    this.recentHashes.clear();
    this.stats = {
      totalReceived: 0,
      totalProcessed: 0,
      totalFailed: 0,
      totalDuplicates: 0,
      avgProcessingTimeMs: 0,
    };
    this.processingTimes = [];
  }
}
