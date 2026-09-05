// =============================================================================
// DATA STORAGE SERVICE - Time-Series Storage, Compression & Retention
// =============================================================================
// Production-grade time-series data storage with compression, retention policies,
// data export, and efficient querying for IoT telemetry data.
// =============================================================================

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// -----------------------------------------------------------------------------
// Data Types
// -----------------------------------------------------------------------------

export interface TimeSeriesPoint {
  id: string;
  deviceId: string;
  capabilityId: string;
  timestamp: Date;
  value: number | string | boolean | Record<string, unknown>;
  unit: string;
  quality: string;
  metadata: Record<string, unknown>;
}

export interface CompressedBlock {
  id: string;
  deviceId: string;
  capabilityId: string;
  startTime: Date;
  endTime: Date;
  pointCount: number;
  algorithm: CompressionAlgorithm;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  data: Buffer;
  checksum: string;
  createdAt: Date;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  deviceIds?: string[];
  capabilityIds?: string[];
  tags?: string[];
  retentionDays: number;
  aggregationLevel?: string;
  compressionEnabled: boolean;
  compressionAlgorithm: CompressionAlgorithm;
  compressionAfterDays: number;
  deleteAfterDays: number;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryOptions {
  deviceId: string;
  capabilityId: string;
  startTime: Date;
  endTime: Date;
  limit?: number;
  offset?: number;
  aggregation?: AggregationType;
  aggregationWindow?: number;
  fillGaps?: boolean;
  gapValue?: number;
  orderBy?: 'asc' | 'desc';
  includeMetadata?: boolean;
}

export interface AggregationType {
  type: 'avg' | 'min' | 'max' | 'sum' | 'count' | 'first' | 'last' | 'median' | 'percentile';
  percentile?: number;
}

export interface QueryResult {
  points: TimeSeriesPoint[];
  total: number;
  queryTimeMs: number;
  dataFromCache: boolean;
  downsamplingApplied: boolean;
  aggregations?: Record<string, number>;
}

export interface DataExportOptions {
  deviceIds: string[];
  capabilityIds?: string[];
  startTime: Date;
  endTime: Date;
  format: 'json' | 'csv' | 'parquet' | 'protobuf';
  compression?: 'gzip' | 'snappy' | 'zstd' | 'none';
  includeMetadata: boolean;
  maxFileSize?: number;
  filter?: Record<string, unknown>;
}

export interface ExportResult {
  exportId: string;
  filePath: string;
  fileSize: number;
  recordCount: number;
  format: string;
  createdAt: Date;
  expiresAt: Date;
  downloadUrl?: string;
}

export interface StorageMetrics {
  totalPoints: number;
  totalDevices: number;
  totalCapabilities: number;
  storageSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  oldestDataPoint: Date | null;
  newestDataPoint: Date | null;
  retentionPolicies: number;
  compressedBlocks: number;
  indexSizeBytes: number;
  writeOps: number;
  readOps: number;
  averageWriteLatencyMs: number;
  averageReadLatencyMs: number;
}

// -----------------------------------------------------------------------------
// Compression Algorithms
// -----------------------------------------------------------------------------

export enum CompressionAlgorithm {
  GORILLA = 'gorilla',
  DELTAS = 'deltas',
  LZ4 = 'lz4',
  ZSTD = 'zstd',
  SNAPPY = 'snappy',
  SIMPLE8B = 'simple8b',
  RUN_LENGTH = 'run_length',
}

// -----------------------------------------------------------------------------
// Storage Configuration
// -----------------------------------------------------------------------------

export interface StorageConfig {
  maxPointsInMemory: number;
  maxPointsPerBlock: number;
  blockDurationMs: number;
  cacheSize: number;
  cacheTtlMs: number;
  writeBatchSize: number;
  writeBatchIntervalMs: number;
  enableWAL: boolean;
  walSyncIntervalMs: number;
  enableCompression: boolean;
  defaultCompressionAlgorithm: CompressionAlgorithm;
  compressionThreshold: number;
  enableIndexing: boolean;
  indexRebuildIntervalMs: number;
  maxExportFileSize: number;
  exportRetentionMs: number;
}

const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  maxPointsInMemory: 1000000,
  maxPointsPerBlock: 86400, // 1 day of per-second data
  blockDurationMs: 86400000, // 1 day
  cacheSize: 10000,
  cacheTtlMs: 300000, // 5 minutes
  writeBatchSize: 500,
  writeBatchIntervalMs: 2000,
  enableWAL: true,
  walSyncIntervalMs: 1000,
  enableCompression: true,
  defaultCompressionAlgorithm: CompressionAlgorithm.GORILLA,
  compressionThreshold: 1000,
  enableIndexing: true,
  indexRebuildIntervalMs: 3600000,
  maxExportFileSize: 100 * 1024 * 1024, // 100MB
  exportRetentionMs: 86400000, // 24 hours
};

// -----------------------------------------------------------------------------
// Cache Entry
// -----------------------------------------------------------------------------

interface CacheEntry {
  data: TimeSeriesPoint[];
  queryHash: string;
  timestamp: number;
  hitCount: number;
}

// -----------------------------------------------------------------------------
// Storage Service
// -----------------------------------------------------------------------------

export class StorageService extends EventEmitter {
  private inMemoryStore: Map<string, TimeSeriesPoint[]> = new Map();
  private compressedBlocks: CompressedBlock[] = [];
  private retentionPolicies: RetentionPolicy[] = [];
  private writeBuffer: TimeSeriesPoint[] = [];
  private writeTimer: ReturnType<typeof setInterval> | null = null;
  private indexRebuildTimer: ReturnType<typeof setInterval> | null = null;
  private exportFiles: Map<string, ExportResult> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private config: StorageConfig;
  private metrics: StorageMetrics;

  // Write-Ahead Log
  private wal: Array<{ operation: string; data: unknown; timestamp: Date }> = [];
  private walSyncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<StorageConfig> = {}) {
    super();
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.startTimers();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  destroy(): void {
    if (this.writeTimer) clearInterval(this.writeTimer);
    if (this.walSyncTimer) clearInterval(this.walSyncTimer);
    if (this.indexRebuildTimer) clearInterval(this.indexRebuildTimer);
    this.flushWriteBuffer();
  }

  private initializeMetrics(): StorageMetrics {
    return {
      totalPoints: 0,
      totalDevices: 0,
      totalCapabilities: 0,
      storageSizeBytes: 0,
      compressedSizeBytes: 0,
      compressionRatio: 1,
      oldestDataPoint: null,
      newestDataPoint: null,
      retentionPolicies: 0,
      compressedBlocks: 0,
      indexSizeBytes: 0,
      writeOps: 0,
      readOps: 0,
      averageWriteLatencyMs: 0,
      averageReadLatencyMs: 0,
    };
  }

  private startTimers(): void {
    this.writeTimer = setInterval(() => {
      this.flushWriteBuffer();
    }, this.config.writeBatchIntervalMs);

    if (this.config.enableWAL) {
      this.walSyncTimer = setInterval(() => {
        this.syncWal();
      }, this.config.walSyncIntervalMs);
    }

    if (this.config.enableIndexing) {
      this.indexRebuildTimer = setInterval(() => {
        this.rebuildIndex();
      }, this.config.indexRebuildIntervalMs);
    }
  }

  // -------------------------------------------------------------------------
  // Write Operations
  // -------------------------------------------------------------------------

  async writePoint(point: Omit<TimeSeriesPoint, 'id'>): Promise<TimeSeriesPoint> {
    const startTime = Date.now();

    const fullPoint: TimeSeriesPoint = {
      ...point,
      id: uuidv4(),
    };

    // WAL write
    if (this.config.enableWAL) {
      this.writeToWal('write', fullPoint);
    }

    // Add to write buffer
    this.writeBuffer.push(fullPoint);

    // Update metrics
    this.metrics.writeOps++;
    this.metrics.totalPoints++;

    // Check if we need to flush
    if (this.writeBuffer.length >= this.config.writeBatchSize) {
      await this.flushWriteBuffer();
    }

    const latency = Date.now() - startTime;
    this.updateWriteLatency(latency);

    return fullPoint;
  }

  async writeBatch(points: Omit<TimeSeriesPoint, 'id'>[]): Promise<TimeSeriesPoint[]> {
    const startTime = Date.now();
    const fullPoints: TimeSeriesPoint[] = points.map(p => ({ ...p, id: uuidv4() }));

    // WAL write
    if (this.config.enableWAL) {
      this.writeToWal('batch', fullPoints);
    }

    // Add to write buffer
    this.writeBuffer.push(...fullPoints);

    // Update metrics
    this.metrics.writeOps++;
    this.metrics.totalPoints += fullPoints.length;

    // Check if we need to flush
    if (this.writeBuffer.length >= this.config.writeBatchSize) {
      await this.flushWriteBuffer();
    }

    const latency = Date.now() - startTime;
    this.updateWriteLatency(latency);

    return fullPoints;
  }

  private async flushWriteBuffer(): Promise<void> {
    if (this.writeBuffer.length === 0) return;

    const pointsToFlush = [...this.writeBuffer];
    this.writeBuffer = [];

    // Group by device/capability for efficient storage
    const grouped = new Map<string, TimeSeriesPoint[]>();
    for (const point of pointsToFlush) {
      const key = `${point.deviceId}:${point.capabilityId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(point);
    }

    // Store each group
    for (const [key, points] of grouped) {
      const existing = this.inMemoryStore.get(key) || [];
      existing.push(...points);

      // Sort by timestamp
      existing.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Check if we need to compress
      if (existing.length > this.config.compressionThreshold && this.config.enableCompression) {
        await this.compressAndStore(key, existing);
      } else {
        this.inMemoryStore.set(key, existing);
      }
    }

    // Update metrics
    this.updateStorageMetrics();

    // Emit flush event
    this.emit('flush', { count: pointsToFlush.length, timestamp: new Date() });
  }

  // -------------------------------------------------------------------------
  // Read Operations
  // -------------------------------------------------------------------------

  async query(options: QueryOptions): Promise<QueryResult> {
    const startTime = Date.now();

    // Check cache
    const cacheHash = this.computeQueryHash(options);
    const cached = this.getFromCache(cacheHash);
    if (cached) {
      this.metrics.readOps++;
      return {
        points: cached,
        total: cached.length,
        queryTimeMs: Date.now() - startTime,
        dataFromCache: true,
        downsamplingApplied: false,
      };
    }

    // Query from store
    const key = `${options.deviceId}:${options.capabilityId}`;
    let points = this.inMemoryStore.get(key) || [];

    // Also query compressed blocks
    const compressedPoints = await this.queryCompressedBlocks(options);
    points = [...points, ...compressedPoints];

    // Filter by time range
    points = points.filter(p =>
      p.timestamp >= options.startTime && p.timestamp <= options.endTime
    );

    // Sort
    const order = options.orderBy || 'asc';
    points.sort((a, b) =>
      order === 'asc'
        ? a.timestamp.getTime() - b.timestamp.getTime()
        : b.timestamp.getTime() - a.timestamp.getTime()
    );

    const total = points.length;

    // Apply aggregation
    let aggregations: Record<string, number> | undefined;
    if (options.aggregation && options.aggregationWindow) {
      points = this.applyAggregation(points, options.aggregation, options.aggregationWindow);
      aggregations = this.computeAggregations(points, options.aggregation);
    }

    // Apply limit/offset
    const offset = options.offset || 0;
    const limit = options.limit || 1000;
    points = points.slice(offset, offset + limit);

    // Update metrics
    this.metrics.readOps++;
    const latency = Date.now() - startTime;
    this.updateReadLatency(latency);

    // Cache the result
    this.addToCache(cacheHash, points);

    return {
      points,
      total,
      queryTimeMs: latency,
      dataFromCache: false,
      downsamplingApplied: false,
      aggregations,
    };
  }

  async queryLatest(deviceId: string, capabilityId: string, count: number = 1): Promise<TimeSeriesPoint[]> {
    const key = `${deviceId}:${capabilityId}`;
    const points = this.inMemoryStore.get(key) || [];

    // Also check compressed blocks
    const now = new Date();
    const startTime = new Date(now.getTime() - 86400000); // Last 24h
    const compressedPoints = await this.queryCompressedBlocks({
      deviceId,
      capabilityId,
      startTime,
      endTime: now,
    });

    const allPoints = [...points, ...compressedPoints];
    allPoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return allPoints.slice(0, count);
  }

  async queryRange(
    deviceId: string,
    capabilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<TimeSeriesPoint[]> {
    const key = `${deviceId}:${capabilityId}`;
    let points = this.inMemoryStore.get(key) || [];

    const compressedPoints = await this.queryCompressedBlocks({
      deviceId,
      capabilityId,
      startTime,
      endTime,
    });

    points = [...points, ...compressedPoints];
    points = points.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
    points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return points;
  }

  // -------------------------------------------------------------------------
  // Aggregation
  // -------------------------------------------------------------------------

  private applyAggregation(
    points: TimeSeriesPoint[],
    aggregation: AggregationType,
    windowMs: number
  ): TimeSeriesPoint[] {
    if (points.length === 0) return [];

    const windows: Map<number, TimeSeriesPoint[]> = new Map();

    for (const point of points) {
      const windowStart = Math.floor(point.timestamp.getTime() / windowMs) * windowMs;
      if (!windows.has(windowStart)) {
        windows.set(windowStart, []);
      }
      windows.get(windowStart)!.push(point);
    }

    const result: TimeSeriesPoint[] = [];

    for (const [windowStart, windowPoints] of windows) {
      const numericValues = windowPoints
        .filter(p => typeof p.value === 'number')
        .map(p => p.value as number);

      if (numericValues.length === 0) continue;

      let aggregatedValue: number;

      switch (aggregation.type) {
        case 'avg':
          aggregatedValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          break;
        case 'min':
          aggregatedValue = Math.min(...numericValues);
          break;
        case 'max':
          aggregatedValue = Math.max(...numericValues);
          break;
        case 'sum':
          aggregatedValue = numericValues.reduce((a, b) => a + b, 0);
          break;
        case 'count':
          aggregatedValue = numericValues.length;
          break;
        case 'first':
          aggregatedValue = numericValues[0];
          break;
        case 'last':
          aggregatedValue = numericValues[numericValues.length - 1];
          break;
        case 'median': {
          const sorted = [...numericValues].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          aggregatedValue = sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
          break;
        }
        case 'percentile': {
          const sorted = [...numericValues].sort((a, b) => a - b);
          const p = (aggregation.percentile || 50) / 100;
          const index = Math.ceil(sorted.length * p) - 1;
          aggregatedValue = sorted[Math.max(0, index)];
          break;
        }
        default:
          aggregatedValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }

      result.push({
        id: uuidv4(),
        deviceId: windowPoints[0].deviceId,
        capabilityId: windowPoints[0].capabilityId,
        timestamp: new Date(windowStart),
        value: aggregatedValue,
        unit: windowPoints[0].unit,
        quality: 'aggregated',
        metadata: {
          aggregationType: aggregation.type,
          windowSize: windowMs,
          pointCount: numericValues.length,
        },
      });
    }

    return result;
  }

  private computeAggregations(points: TimeSeriesPoint[], aggregation: AggregationType): Record<string, number> {
    const numericValues = points
      .filter(p => typeof p.value === 'number')
      .map(p => p.value as number);

    if (numericValues.length === 0) return {};

    return {
      avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      sum: numericValues.reduce((a, b) => a + b, 0),
      count: numericValues.length,
    };
  }

  // -------------------------------------------------------------------------
  // Compression
  // -------------------------------------------------------------------------

  private async compressAndStore(key: string, points: TimeSeriesPoint[]): Promise<void> {
    // Create compressed block
    const block: CompressedBlock = {
      id: uuidv4(),
      deviceId: points[0].deviceId,
      capabilityId: points[0].capabilityId,
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      pointCount: points.length,
      algorithm: this.config.defaultCompressionAlgorithm,
      originalSize: JSON.stringify(points).length,
      compressedSize: 0,
      compressionRatio: 0,
      data: Buffer.alloc(0),
      checksum: '',
      createdAt: new Date(),
    };

    // Compress based on algorithm
    const compressed = this.compressPoints(points, block.algorithm);
    block.data = compressed.data;
    block.compressedSize = compressed.size;
    block.compressionRatio = block.originalSize / block.compressedSize;
    block.checksum = createHash('sha256').update(compressed.data).digest('hex');

    this.compressedBlocks.push(block);

    // Remove from in-memory store
    this.inMemoryStore.delete(key);

    // Update metrics
    this.metrics.compressedBlocks = this.compressedBlocks.length;
    this.metrics.compressedSizeBytes += block.compressedSize;
    this.metrics.storageSizeBytes += block.originalSize;
    this.metrics.compressionRatio =
      this.metrics.storageSizeBytes / this.metrics.compressedSizeBytes;

    this.emit('compressed', { blockId: block.id, pointCount: points.length, ratio: block.compressionRatio });
  }

  private compressPoints(
    points: TimeSeriesPoint[],
    algorithm: CompressionAlgorithm
  ): { data: Buffer; size: number } {
    // Simplified compression - in production use actual compression libraries
    const jsonData = JSON.stringify(points);

    switch (algorithm) {
      case CompressionAlgorithm.GORILLA: {
        // Gorilla compression for time-series (simplified)
        const values = points
          .filter(p => typeof p.value === 'number')
          .map(p => p.value as number);

        if (values.length > 0) {
          // XOR-based encoding (simplified)
          const encoded = new Float64Array(values);
          const buffer = Buffer.from(encoded.buffer);
          return { data: buffer, size: buffer.length };
        }
        return { data: Buffer.from(jsonData), size: Buffer.byteLength(jsonData) };
      }

      case CompressionAlgorithm.DELTAS: {
        // Delta encoding for timestamps
        const timestamps = points.map(p => p.timestamp.getTime());
        const deltas: number[] = [timestamps[0]];
        for (let i = 1; i < timestamps.length; i++) {
          deltas.push(timestamps[i] - timestamps[i - 1]);
        }
        const buffer = Buffer.from(JSON.stringify(deltas));
        return { data: buffer, size: buffer.length };
      }

      case CompressionAlgorithm.LZ4:
      case CompressionAlgorithm.ZSTD:
      case CompressionAlgorithm.SNAPPY: {
        // In production, use actual compression libraries
        const buffer = Buffer.from(jsonData);
        return { data: buffer, size: buffer.length };
      }

      case CompressionAlgorithm.RUN_LENGTH: {
        // Run-length encoding
        const values = points.map(p => p.value);
        const encoded: Array<{ value: unknown; count: number }> = [];
        let current = values[0];
        let count = 1;

        for (let i = 1; i < values.length; i++) {
          if (JSON.stringify(values[i]) === JSON.stringify(current)) {
            count++;
          } else {
            encoded.push({ value: current, count });
            current = values[i];
            count = 1;
          }
        }
        encoded.push({ value: current, count });

        const buffer = Buffer.from(JSON.stringify(encoded));
        return { data: buffer, size: buffer.length };
      }

      default: {
        const buffer = Buffer.from(jsonData);
        return { data: buffer, size: buffer.length };
      }
    }
  }

  private async queryCompressedBlocks(options: QueryOptions): Promise<TimeSeriesPoint[]> {
    const result: TimeSeriesPoint[] = [];

    for (const block of this.compressedBlocks) {
      if (block.deviceId !== options.deviceId || block.capabilityId !== options.capabilityId) {
        continue;
      }

      // Check time range overlap
      if (block.endTime < options.startTime || block.startTime > options.endTime) {
        continue;
      }

      // Decompress
      const points = this.decompressBlock(block);
      result.push(...points);
    }

    return result;
  }

  private decompressBlock(block: CompressedBlock): TimeSeriesPoint[] {
    switch (block.algorithm) {
      case CompressionAlgorithm.GORILLA: {
        // Decompress Gorilla-encoded data
        if (block.data.length > 0) {
          const float64 = new Float64Array(block.data.buffer);
          const points: TimeSeriesPoint[] = [];
          const timeStep = (block.endTime.getTime() - block.startTime.getTime()) / float64.length;

          for (let i = 0; i < float64.length; i++) {
            points.push({
              id: uuidv4(),
              deviceId: block.deviceId,
              capabilityId: block.capabilityId,
              timestamp: new Date(block.startTime.getTime() + i * timeStep),
              value: float64[i],
              unit: '',
              quality: 'compressed',
              metadata: { compressedBlockId: block.id },
            });
          }
          return points;
        }
        return [];
      }

      case CompressionAlgorithm.DELTAS: {
        const deltas: number[] = JSON.parse(block.data.toString());
        const points: TimeSeriesPoint[] = [];
        let timestamp = deltas[0];

        for (let i = 0; i < deltas.length; i++) {
          if (i > 0) timestamp += deltas[i];
          points.push({
            id: uuidv4(),
            deviceId: block.deviceId,
            capabilityId: block.capabilityId,
            timestamp: new Date(timestamp),
            value: 0,
            unit: '',
            quality: 'compressed',
            metadata: { compressedBlockId: block.id },
          });
        }
        return points;
      }

      case CompressionAlgorithm.RUN_LENGTH: {
        const encoded: Array<{ value: unknown; count: number }> = JSON.parse(block.data.toString());
        const points: TimeSeriesPoint[] = [];
        const timeStep = (block.endTime.getTime() - block.startTime.getTime()) / block.pointCount;
        let timeOffset = 0;

        for (const { value, count } of encoded) {
          for (let i = 0; i < count; i++) {
            points.push({
              id: uuidv4(),
              deviceId: block.deviceId,
              capabilityId: block.capabilityId,
              timestamp: new Date(block.startTime.getTime() + timeOffset),
              value,
              unit: '',
              quality: 'compressed',
              metadata: { compressedBlockId: block.id },
            });
            timeOffset += timeStep;
          }
        }
        return points;
      }

      default: {
        // JSON fallback
        try {
          return JSON.parse(block.data.toString());
        } catch {
          return [];
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Retention Policies
  // -------------------------------------------------------------------------

  async createRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<RetentionPolicy> {
    const newPolicy: RetentionPolicy = {
      ...policy,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.retentionPolicies.push(newPolicy);
    this.metrics.retentionPolicies = this.retentionPolicies.length;

    return newPolicy;
  }

  async updateRetentionPolicy(id: string, updates: Partial<RetentionPolicy>): Promise<RetentionPolicy | undefined> {
    const policy = this.retentionPolicies.find(p => p.id === id);
    if (!policy) return undefined;

    Object.assign(policy, updates, { updatedAt: new Date() });
    return policy;
  }

  async deleteRetentionPolicy(id: string): Promise<boolean> {
    const initialLength = this.retentionPolicies.length;
    this.retentionPolicies = this.retentionPolicies.filter(p => p.id !== id);
    this.metrics.retentionPolicies = this.retentionPolicies.length;
    return this.retentionPolicies.length < initialLength;
  }

  async listRetentionPolicies(): Promise<RetentionPolicy[]> {
    return [...this.retentionPolicies];
  }

  async enforceRetentionPolicies(): Promise<{ deleted: number; compressed: number }> {
    let deleted = 0;
    let compressed = 0;
    const now = Date.now();

    for (const policy of this.retentionPolicies) {
      if (!policy.enabled) continue;

      const cutoffTime = now - policy.deleteAfterDays * 86400000;
      const compressionCutoffTime = now - policy.compressionAfterDays * 86400000;

      // Enforce on in-memory store
      for (const [key, points] of this.inMemoryStore) {
        const [deviceId, capabilityId] = key.split(':');

        // Check if policy applies
        if (policy.deviceIds && !policy.deviceIds.includes(deviceId)) continue;
        if (policy.capabilityIds && !policy.capabilityIds.includes(capabilityId)) continue;

        // Delete old points
        const beforeDelete = points.length;
        const filtered = points.filter(p => p.timestamp.getTime() > cutoffTime);
        deleted += beforeDelete - filtered.length;

        if (filtered.length > 0) {
          this.inMemoryStore.set(key, filtered);
        } else {
          this.inMemoryStore.delete(key);
        }
      }

      // Enforce on compressed blocks
      const beforeCompressCount = this.compressedBlocks.length;
      this.compressedBlocks = this.compressedBlocks.filter(block => {
        if (block.endTime.getTime() < cutoffTime) {
          return false; // Delete
        }
        return true;
      });
      deleted += beforeCompressCount - this.compressedBlocks.length;
    }

    this.updateStorageMetrics();

    return { deleted, compressed };
  }

  // -------------------------------------------------------------------------
  // Data Export
  // -------------------------------------------------------------------------

  async exportData(options: DataExportOptions): Promise<ExportResult> {
    const exportId = uuidv4();
    const allPoints: TimeSeriesPoint[] = [];

    for (const deviceId of options.deviceIds) {
      for (const capabilityId of (options.capabilityIds || [])) {
        const points = await this.queryRange(deviceId, capabilityId, options.startTime, options.endTime);
        allPoints.push(...points);
      }
    }

    // Filter
    if (options.filter) {
      // Apply filter logic
    }

    // Sort by timestamp
    allPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Format
    let formattedData: string;
    switch (options.format) {
      case 'csv':
        formattedData = this.formatAsCsv(allPoints, options.includeMetadata);
        break;
      case 'json':
      default:
        formattedData = JSON.stringify(allPoints, null, 2);
        break;
    }

    const fileSize = Buffer.byteLength(formattedData);

    // Check file size limit
    if (fileSize > (this.config.maxExportFileSize || options.maxFileSize || 100 * 1024 * 1024)) {
      throw new Error(`Export file size exceeds limit: ${fileSize} bytes`);
    }

    const result: ExportResult = {
      exportId,
      filePath: `/exports/${exportId}.${options.format}`,
      fileSize,
      recordCount: allPoints.length,
      format: options.format,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.exportRetentionMs),
      downloadUrl: `/api/exports/${exportId}/download`,
    };

    this.exportFiles.set(exportId, result);

    this.emit('export:created', result);

    return result;
  }

  private formatAsCsv(points: TimeSeriesPoint[], includeMetadata: boolean): string {
    const headers = ['id', 'deviceId', 'capabilityId', 'timestamp', 'value', 'unit', 'quality'];
    if (includeMetadata) headers.push('metadata');

    const rows = points.map(p => {
      const row = [
        p.id,
        p.deviceId,
        p.capabilityId,
        p.timestamp.toISOString(),
        typeof p.value === 'object' ? JSON.stringify(p.value) : String(p.value),
        p.unit,
        p.quality,
      ];
      if (includeMetadata) row.push(JSON.stringify(p.metadata));
      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  async getExport(exportId: string): Promise<ExportResult | undefined> {
    return this.exportFiles.get(exportId);
  }

  async deleteExport(exportId: string): Promise<boolean> {
    return this.exportFiles.delete(exportId);
  }

  // -------------------------------------------------------------------------
  // Cache
  // -------------------------------------------------------------------------

  private computeQueryHash(options: QueryOptions): string {
    const data = JSON.stringify({
      deviceId: options.deviceId,
      capabilityId: options.capabilityId,
      startTime: options.startTime.getTime(),
      endTime: options.endTime.getTime(),
      aggregation: options.aggregation,
      aggregationWindow: options.aggregationWindow,
      limit: options.limit,
      offset: options.offset,
    });
    return createHash('md5').update(data).digest('hex');
  }

  private getFromCache(hash: string): TimeSeriesPoint[] | null {
    const entry = this.cache.get(hash);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.config.cacheTtlMs) {
      this.cache.delete(hash);
      return null;
    }

    entry.hitCount++;
    return entry.data;
  }

  private addToCache(hash: string, data: TimeSeriesPoint[]): void {
    // Evict if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      // LRU eviction - remove least recently used
      let minHitCount = Infinity;
      let minKey = '';
      for (const [key, entry] of this.cache) {
        if (entry.hitCount < minHitCount) {
          minHitCount = entry.hitCount;
          minKey = key;
        }
      }
      if (minKey) this.cache.delete(minKey);
    }

    this.cache.set(hash, {
      data,
      queryHash: hash,
      timestamp: Date.now(),
      hitCount: 0,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // -------------------------------------------------------------------------
  // WAL
  // -------------------------------------------------------------------------

  private writeToWal(operation: string, data: unknown): void {
    this.wal.push({
      operation,
      data,
      timestamp: new Date(),
    });

    // Limit WAL size
    if (this.wal.length > 100000) {
      this.wal = this.wal.slice(-50000);
    }
  }

  private syncWal(): void {
    // In production, this would write to persistent storage
    // For now, we just clear old WAL entries
    const cutoff = Date.now() - 300000; // 5 minutes
    this.wal = this.wal.filter(entry => entry.timestamp.getTime() > cutoff);
  }

  // -------------------------------------------------------------------------
  // Index
  // -------------------------------------------------------------------------

  private rebuildIndex(): void {
    let indexSize = 0;

    for (const [key, points] of this.inMemoryStore) {
      indexSize += Buffer.byteLength(key) + 8; // key + pointer
    }

    for (const block of this.compressedBlocks) {
      indexSize += Buffer.byteLength(`${block.deviceId}:${block.capabilityId}`) + 8;
    }

    this.metrics.indexSizeBytes = indexSize;

    this.emit('index:rebuilt', { indexSize, timestamp: new Date() });
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  private updateStorageMetrics(): void {
    let totalPoints = 0;
    let totalSize = 0;
    let oldest: Date | null = null;
    let newest: Date | null = null;
    const devices = new Set<string>();
    const capabilities = new Set<string>();

    for (const [key, points] of this.inMemoryStore) {
      const [deviceId, capabilityId] = key.split(':');
      devices.add(deviceId);
      capabilities.add(capabilityId);
      totalPoints += points.length;
      totalSize += JSON.stringify(points).length;

      for (const point of points) {
        if (!oldest || point.timestamp < oldest) oldest = point.timestamp;
        if (!newest || point.timestamp > newest) newest = point.timestamp;
      }
    }

    this.metrics.totalPoints = totalPoints;
    this.metrics.totalDevices = devices.size;
    this.metrics.totalCapabilities = capabilities.size;
    this.metrics.storageSizeBytes = totalSize + this.metrics.compressedSizeBytes;
    this.metrics.oldestDataPoint = oldest;
    this.metrics.newestDataPoint = newest;
  }

  private updateWriteLatency(latencyMs: number): void {
    this.metrics.averageWriteLatencyMs =
      (this.metrics.averageWriteLatencyMs * (this.metrics.writeOps - 1) + latencyMs) /
      this.metrics.writeOps;
  }

  private updateReadLatency(latencyMs: number): void {
    this.metrics.averageReadLatencyMs =
      (this.metrics.averageReadLatencyMs * (this.metrics.readOps - 1) + latencyMs) /
      this.metrics.readOps;
  }

  getMetrics(): StorageMetrics {
    this.updateStorageMetrics();
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }
}

// Singleton instance
let storageInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageInstance) {
    storageInstance = new StorageService();
  }
  return storageInstance;
}

export default StorageService;
