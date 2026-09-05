// =============================================================================
// DATA INGESTION SERVICE - MQTT, HTTP, WebSocket & Batch Processing
// =============================================================================
// Handles multi-protocol data ingestion from IoT devices with validation,
// transformation, routing, and batch processing capabilities.
// =============================================================================

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// -----------------------------------------------------------------------------
// Data Types
// -----------------------------------------------------------------------------

export enum IngestionProtocol {
  MQTT = 'mqtt',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  BATCH = 'batch',
}

export enum DataQuality {
  VALID = 'valid',
  SUSPICIOUS = 'suspicious',
  INVALID = 'invalid',
  MISSING = 'missing',
  DUPLICATE = 'duplicate',
  OUT_OF_RANGE = 'out_of_range',
  RATE_LIMITED = 'rate_limited',
}

export enum TransformationType {
  UNIT_CONVERSION = 'unit_conversion',
  ROUNDING = 'rounding',
  FILTERING = 'filtering',
  AGGREGATION = 'aggregation',
  MAPPING = 'mapping',
  VALIDATION = 'validation',
  ENRICHMENT = 'enrichment',
  DEDUPLICATION = 'deduplication',
}

export interface DeviceDataPoint {
  id: string;
  deviceId: string;
  capabilityId: string;
  timestamp: Date;
  value: number | string | boolean | Record<string, unknown>;
  unit: string;
  quality: DataQuality;
  source: IngestionProtocol;
  metadata: Record<string, unknown>;
  receivedAt: Date;
  processedAt?: Date;
  sequenceNumber?: number;
  batchId?: string;
}

export interface RawMqttMessage {
  topic: string;
  payload: Buffer | string;
  qos: 0 | 1 | 2;
  retain: boolean;
  clientId: string;
  timestamp: Date;
}

export interface RawHttpRequest {
  deviceId: string;
  headers: Record<string, string>;
  body: unknown;
  query: Record<string, string>;
  timestamp: Date;
}

export interface RawWebSocketMessage {
  deviceId: string;
  data: unknown;
  timestamp: Date;
}

// -----------------------------------------------------------------------------
// Validation Rules
// -----------------------------------------------------------------------------

export interface ValidationRule {
  type: 'range' | 'type' | 'regex' | 'custom' | 'rate_limit' | 'schema';
  field?: string;
  params: Record<string, unknown>;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DataSchema {
  id: string;
  name: string;
  version: string;
  fields: SchemaField[];
  required: string[];
  rules: ValidationRule[];
}

export interface SchemaField {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'object' | 'array';
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: (number | string | boolean)[];
  unit?: string;
}

// -----------------------------------------------------------------------------
// Transformation Pipeline
// -----------------------------------------------------------------------------

export interface TransformationStep {
  id: string;
  type: TransformationType;
  config: Record<string, unknown>;
  enabled: boolean;
  order: number;
}

export interface TransformationPipeline {
  id: string;
  name: string;
  steps: TransformationStep[];
  deviceFilter?: { deviceIds?: string[]; capabilityIds?: string[]; tags?: string[] };
}

// -----------------------------------------------------------------------------
// Rate Limiting
// -----------------------------------------------------------------------------

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// -----------------------------------------------------------------------------
// Ingestion Configuration
// -----------------------------------------------------------------------------

export interface IngestionConfig {
  maxPayloadSize: number;
  maxBatchSize: number;
  maxBatchInterval: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  deduplicationWindow: number;
  deduplicationMaxSize: number;
  validationTimeout: number;
  transformationTimeout: number;
  storageBufferSize: number;
  storageFlushInterval: number;
  deadLetterQueueMaxSize: number;
  enableCompression: boolean;
  enableMetrics: boolean;
}

const DEFAULT_INGESTION_CONFIG: IngestionConfig = {
  maxPayloadSize: 1024 * 1024, // 1MB
  maxBatchSize: 1000,
  maxBatchInterval: 5000, // 5 seconds
  rateLimitWindow: 60000, // 1 minute
  rateLimitMax: 1000,
  deduplicationWindow: 300000, // 5 minutes
  deduplicationMaxSize: 10000,
  validationTimeout: 5000,
  transformationTimeout: 5000,
  storageBufferSize: 500,
  storageFlushInterval: 2000,
  deadLetterQueueMaxSize: 10000,
  enableCompression: true,
  enableMetrics: true,
};

// -----------------------------------------------------------------------------
// Ingestion Metrics
// -----------------------------------------------------------------------------

export interface IngestionMetrics {
  totalIngested: number;
  totalValid: number;
  totalInvalid: number;
  totalDuplicates: number;
  totalRateLimited: number;
  byProtocol: Record<IngestionProtocol, { ingested: number; errors: number }>;
  byDevice: Map<string, { ingested: number; lastIngestion: Date }>;
  averageProcessingTime: number;
  maxProcessingTime: number;
  bufferSize: number;
  deadLetterSize: number;
  lastFlushTime: Date;
}

// -----------------------------------------------------------------------------
// Ingestion Service
// -----------------------------------------------------------------------------

export class IngestionService extends EventEmitter {
  private buffer: DeviceDataPoint[] = [];
  private deadLetterQueue: Array<{ data: unknown; error: string; timestamp: Date; protocol: IngestionProtocol }> = [];
  private seenHashes: Map<string, number> = new Map();
  private rateLimits: Map<string, RateLimitBucket> = new Map();
  private schemas: Map<string, DataSchema> = new Map();
  private pipelines: Map<string, TransformationPipeline> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private config: IngestionConfig;
  private metrics: IngestionMetrics;

  private storageCallback?: (data: DeviceDataPoint[]) => Promise<void>;

  constructor(config: Partial<IngestionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_INGESTION_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.startFlushTimer();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  setStorageCallback(callback: (data: DeviceDataPoint[]) => Promise<void>): void {
    this.storageCallback = callback;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushBuffer();
  }

  private initializeMetrics(): IngestionMetrics {
    return {
      totalIngested: 0,
      totalValid: 0,
      totalInvalid: 0,
      totalDuplicates: 0,
      totalRateLimited: 0,
      byProtocol: {
        [IngestionProtocol.MQTT]: { ingested: 0, errors: 0 },
        [IngestionProtocol.HTTP]: { ingested: 0, errors: 0 },
        [IngestionProtocol.WEBSOCKET]: { ingested: 0, errors: 0 },
        [IngestionProtocol.BATCH]: { ingested: 0, errors: 0 },
      },
      byDevice: new Map(),
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      bufferSize: 0,
      deadLetterSize: 0,
      lastFlushTime: new Date(),
    };
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.storageFlushInterval);
  }

  // -------------------------------------------------------------------------
  // MQTT Ingestion
  // -------------------------------------------------------------------------

  async ingestMqttMessage(message: RawMqttMessage): Promise<DeviceDataPoint | null> {
    const startTime = Date.now();

    try {
      // Rate limit check
      if (!this.checkRateLimit(message.clientId)) {
        this.metrics.totalRateLimited++;
        this.metrics.byProtocol[IngestionProtocol.MQTT].errors++;
        return null;
      }

      // Parse topic to extract deviceId and capabilityId
      const parsed = this.parseMqttTopic(message.topic);
      if (!parsed) {
        this.addToDeadLetterQueue(message, 'Invalid MQTT topic format', IngestionProtocol.MQTT);
        return null;
      }

      // Parse payload
      let payload: Record<string, unknown>;
      if (Buffer.isBuffer(message.payload)) {
        const payloadStr = message.payload.toString('utf-8');
        payload = JSON.parse(payloadStr);
      } else if (typeof message.payload === 'string') {
        payload = JSON.parse(message.payload);
      } else {
        payload = message.payload as Record<string, unknown>;
      }

      // Check payload size
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > this.config.maxPayloadSize) {
        this.addToDeadLetterQueue(message, `Payload too large: ${payloadSize} bytes`, IngestionProtocol.MQTT);
        return null;
      }

      // Deduplication check
      const hash = this.computeHash(parsed.deviceId, parsed.capabilityId, payload);
      if (this.isDuplicate(hash)) {
        this.metrics.totalDuplicates++;
        return null;
      }

      // Create data point
      const dataPoint = this.createDataPoint(
        parsed.deviceId,
        parsed.capabilityId,
        payload,
        IngestionProtocol.MQTT,
        { topic: message.topic, qos: message.qos, clientId: message.clientId }
      );

      // Validate
      const quality = this.validateDataPoint(dataPoint);
      dataPoint.quality = quality;

      if (quality === DataQuality.INVALID) {
        this.metrics.totalInvalid++;
        this.addToDeadLetterQueue(dataPoint, 'Validation failed', IngestionProtocol.MQTT);
        return null;
      }

      // Transform
      const transformed = await this.transformDataPoint(dataPoint);

      // Buffer
      this.buffer.push(transformed);
      this.metrics.totalIngested++;
      this.metrics.totalValid++;
      this.metrics.byProtocol[IngestionProtocol.MQTT].ingested++;

      // Update device metrics
      const deviceMetrics = this.metrics.byDevice.get(parsed.deviceId) || {
        ingested: 0,
        lastIngestion: new Date(),
      };
      deviceMetrics.ingested++;
      deviceMetrics.lastIngestion = new Date();
      this.metrics.byDevice.set(parsed.deviceId, deviceMetrics);

      // Check buffer flush
      if (this.buffer.length >= this.config.storageBufferSize) {
        await this.flushBuffer();
      }

      // Emit event
      this.emit('data:ingested', transformed);

      // Update processing time metrics
      const processingTime = Date.now() - startTime;
      this.updateProcessingTimeMetrics(processingTime);

      return transformed;
    } catch (error) {
      this.metrics.byProtocol[IngestionProtocol.MQTT].errors++;
      this.addToDeadLetterQueue(message, error instanceof Error ? error.message : 'Unknown error', IngestionProtocol.MQTT);
      return null;
    }
  }

  private parseMqttTopic(topic: string): { deviceId: string; capabilityId: string } | null {
    // Supported topic formats:
    //   devices/{deviceId}/data/{capabilityId}
    //   iot/{deviceId}/{capabilityId}
    //   telemetry/{deviceId}/{capabilityId}
    const patterns = [
      /^devices\/([^/]+)\/data\/([^/]+)$/,
      /^iot\/([^/]+)\/([^/]+)$/,
      /^telemetry\/([^/]+)\/([^/]+)$/,
    ];

    for (const pattern of patterns) {
      const match = topic.match(pattern);
      if (match) {
        return { deviceId: match[1], capabilityId: match[2] };
      }
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // HTTP Ingestion
  // -------------------------------------------------------------------------

  async ingestHttpRequest(request: RawHttpRequest): Promise<DeviceDataPoint | null> {
    const startTime = Date.now();

    try {
      // Rate limit check
      if (!this.checkRateLimit(request.deviceId)) {
        this.metrics.totalRateLimited++;
        this.metrics.byProtocol[IngestionProtocol.HTTP].errors++;
        return null;
      }

      // Check payload size
      const payloadSize = JSON.stringify(request.body).length;
      if (payloadSize > this.config.maxPayloadSize) {
        this.addToDeadLetterQueue(request, `Payload too large: ${payloadSize} bytes`, IngestionProtocol.HTTP);
        return null;
      }

      // Parse body
      const body = request.body as Record<string, unknown>;
      const deviceId = request.deviceId || body.deviceId as string;
      const capabilityId = body.capabilityId as string;

      if (!deviceId || !capabilityId) {
        this.addToDeadLetterQueue(request, 'Missing deviceId or capabilityId', IngestionProtocol.HTTP);
        return null;
      }

      // Deduplication check
      const hash = this.computeHash(deviceId, capabilityId, body);
      if (this.isDuplicate(hash)) {
        this.metrics.totalDuplicates++;
        return null;
      }

      // Create data point
      const dataPoint = this.createDataPoint(
        deviceId,
        capabilityId,
        body,
        IngestionProtocol.HTTP,
        { headers: request.headers, query: request.query }
      );

      // Validate
      const quality = this.validateDataPoint(dataPoint);
      dataPoint.quality = quality;

      if (quality === DataQuality.INVALID) {
        this.metrics.totalInvalid++;
        this.addToDeadLetterQueue(dataPoint, 'Validation failed', IngestionProtocol.HTTP);
        return null;
      }

      // Transform
      const transformed = await this.transformDataPoint(dataPoint);

      // Buffer
      this.buffer.push(transformed);
      this.metrics.totalIngested++;
      this.metrics.totalValid++;
      this.metrics.byProtocol[IngestionProtocol.HTTP].ingested++;

      // Update device metrics
      const deviceMetrics = this.metrics.byDevice.get(deviceId) || {
        ingested: 0,
        lastIngestion: new Date(),
      };
      deviceMetrics.ingested++;
      deviceMetrics.lastIngestion = new Date();
      this.metrics.byDevice.set(deviceId, deviceMetrics);

      // Check buffer flush
      if (this.buffer.length >= this.config.storageBufferSize) {
        await this.flushBuffer();
      }

      this.emit('data:ingested', transformed);

      const processingTime = Date.now() - startTime;
      this.updateProcessingTimeMetrics(processingTime);

      return transformed;
    } catch (error) {
      this.metrics.byProtocol[IngestionProtocol.HTTP].errors++;
      this.addToDeadLetterQueue(request, error instanceof Error ? error.message : 'Unknown error', IngestionProtocol.HTTP);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // WebSocket Ingestion
  // -------------------------------------------------------------------------

  async ingestWebSocketMessage(message: RawWebSocketMessage): Promise<DeviceDataPoint | null> {
    const startTime = Date.now();

    try {
      if (!this.checkRateLimit(message.deviceId)) {
        this.metrics.totalRateLimited++;
        this.metrics.byProtocol[IngestionProtocol.WEBSOCKET].errors++;
        return null;
      }

      const body = message.data as Record<string, unknown>;
      const capabilityId = body.capabilityId as string;

      if (!message.deviceId || !capabilityId) {
        this.addToDeadLetterQueue(message, 'Missing deviceId or capabilityId', IngestionProtocol.WEBSOCKET);
        return null;
      }

      const hash = this.computeHash(message.deviceId, capabilityId, body);
      if (this.isDuplicate(hash)) {
        this.metrics.totalDuplicates++;
        return null;
      }

      const dataPoint = this.createDataPoint(
        message.deviceId,
        capabilityId,
        body,
        IngestionProtocol.WEBSOCKET,
        {}
      );

      const quality = this.validateDataPoint(dataPoint);
      dataPoint.quality = quality;

      if (quality === DataQuality.INVALID) {
        this.metrics.totalInvalid++;
        this.addToDeadLetterQueue(dataPoint, 'Validation failed', IngestionProtocol.WEBSOCKET);
        return null;
      }

      const transformed = await this.transformDataPoint(dataPoint);

      this.buffer.push(transformed);
      this.metrics.totalIngested++;
      this.metrics.totalValid++;
      this.metrics.byProtocol[IngestionProtocol.WEBSOCKET].ingested++;

      const deviceMetrics = this.metrics.byDevice.get(message.deviceId) || {
        ingested: 0,
        lastIngestion: new Date(),
      };
      deviceMetrics.ingested++;
      deviceMetrics.lastIngestion = new Date();
      this.metrics.byDevice.set(message.deviceId, deviceMetrics);

      if (this.buffer.length >= this.config.storageBufferSize) {
        await this.flushBuffer();
      }

      this.emit('data:ingested', transformed);

      const processingTime = Date.now() - startTime;
      this.updateProcessingTimeMetrics(processingTime);

      return transformed;
    } catch (error) {
      this.metrics.byProtocol[IngestionProtocol.WEBSOCKET].errors++;
      this.addToDeadLetterQueue(message, error instanceof Error ? error.message : 'Unknown error', IngestionProtocol.WEBSOCKET);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Batch Ingestion
  // -------------------------------------------------------------------------

  async ingestBatch(
    items: Array<{
      deviceId: string;
      capabilityId: string;
      value: number | string | boolean | Record<string, unknown>;
      unit?: string;
      timestamp?: Date;
      metadata?: Record<string, unknown>;
    }>,
    protocol: IngestionProtocol = IngestionProtocol.BATCH
  ): Promise<{
    accepted: DeviceDataPoint[];
    rejected: Array<{ item: typeof items[0]; reason: string }>;
    duplicates: number;
  }> {
    const accepted: DeviceDataPoint[] = [];
    const rejected: Array<{ item: typeof items[0]; reason: string }> = [];
    let duplicates = 0;

    const batchId = uuidv4();

    for (const item of items) {
      try {
        if (!this.checkRateLimit(item.deviceId)) {
          this.metrics.totalRateLimited++;
          rejected.push({ item, reason: 'Rate limited' });
          continue;
        }

        const hash = this.computeHash(item.deviceId, item.capabilityId, { value: item.value });
        if (this.isDuplicate(hash)) {
          duplicates++;
          continue;
        }

        const dataPoint: DeviceDataPoint = {
          id: uuidv4(),
          deviceId: item.deviceId,
          capabilityId: item.capabilityId,
          timestamp: item.timestamp || new Date(),
          value: item.value,
          unit: item.unit || '',
          quality: DataQuality.VALID,
          source: protocol,
          metadata: item.metadata || {},
          receivedAt: new Date(),
          batchId,
          sequenceNumber: accepted.length,
        };

        const quality = this.validateDataPoint(dataPoint);
        dataPoint.quality = quality;

        if (quality === DataQuality.INVALID) {
          this.metrics.totalInvalid++;
          rejected.push({ item, reason: 'Validation failed' });
          continue;
        }

        const transformed = await this.transformDataPoint(dataPoint);
        this.buffer.push(transformed);
        accepted.push(transformed);

        const deviceMetrics = this.metrics.byDevice.get(item.deviceId) || {
          ingested: 0,
          lastIngestion: new Date(),
        };
        deviceMetrics.ingested++;
        deviceMetrics.lastIngestion = new Date();
        this.metrics.byDevice.set(item.deviceId, deviceMetrics);
      } catch (error) {
        rejected.push({
          item,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.metrics.totalIngested += accepted.length;
    this.metrics.totalValid += accepted.length;
    this.metrics.byProtocol[protocol].ingested += accepted.length;
    this.metrics.totalDuplicates += duplicates;

    if (this.buffer.length >= this.config.storageBufferSize) {
      await this.flushBuffer();
    }

    this.emit('batch:ingested', { batchId, accepted: accepted.length, rejected: rejected.length, duplicates });

    return { accepted, rejected, duplicates };
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  private validateDataPoint(dataPoint: DeviceDataPoint): DataQuality {
    // Check if value is present
    if (dataPoint.value === undefined || dataPoint.value === null) {
      return DataQuality.MISSING;
    }

    // Check for schema validation
    const schema = this.schemas.get(`${dataPoint.deviceId}:${dataPoint.capabilityId}`);
    if (schema) {
      const result = this.validateAgainstSchema(dataPoint, schema);
      if (result === DataQuality.INVALID) return DataQuality.INVALID;
    }

    // Type-based validation
    if (typeof dataPoint.value === 'number') {
      if (isNaN(dataPoint.value) || !isFinite(dataPoint.value)) {
        return DataQuality.INVALID;
      }
    }

    // Timestamp validation
    const now = Date.now();
    const dataTime = dataPoint.timestamp.getTime();
    if (dataTime > now + 300000) { // 5 minutes in future
      return DataQuality.SUSPICIOUS;
    }
    if (now - dataTime > 86400000) { // 24 hours old
      return DataQuality.SUSPICIOUS;
    }

    // Run custom validation rules
    const rules = this.getValidationRules(dataPoint.deviceId, dataPoint.capabilityId);
    for (const rule of rules) {
      const result = this.applyValidationRule(dataPoint, rule);
      if (result === DataQuality.INVALID) return DataQuality.INVALID;
      if (result === DataQuality.SUSPICIOUS) return DataQuality.SUSPICIOUS;
    }

    return DataQuality.VALID;
  }

  private validateAgainstSchema(dataPoint: DeviceDataPoint, schema: DataSchema): DataQuality {
    const value = dataPoint.value as Record<string, unknown>;

    for (const field of schema.fields) {
      if (schema.required.includes(field.name) && !(field.name in value)) {
        return DataQuality.INVALID;
      }

      const fieldValue = value[field.name];
      if (fieldValue === undefined) continue;

      // Type check
      if (field.type === 'number' && typeof fieldValue !== 'number') {
        return DataQuality.INVALID;
      }
      if (field.type === 'string' && typeof fieldValue !== 'string') {
        return DataQuality.INVALID;
      }
      if (field.type === 'boolean' && typeof fieldValue !== 'boolean') {
        return DataQuality.INVALID;
      }

      // Range check
      if (field.type === 'number' && typeof fieldValue === 'number') {
        if (field.min !== undefined && fieldValue < field.min) return DataQuality.OUT_OF_RANGE;
        if (field.max !== undefined && fieldValue > field.max) return DataQuality.OUT_OF_RANGE;
      }

      // Enum check
      if (field.enum && !field.enum.includes(fieldValue as any)) {
        return DataQuality.INVALID;
      }
    }

    return DataQuality.VALID;
  }

  private getValidationRules(deviceId: string, capabilityId: string): ValidationRule[] {
    // In production, these would come from the database
    return [];
  }

  private applyValidationRule(dataPoint: DeviceDataPoint, rule: ValidationRule): DataQuality {
    switch (rule.type) {
      case 'range': {
        const min = rule.params.min as number;
        const max = rule.params.max as number;
        if (typeof dataPoint.value === 'number') {
          if (dataPoint.value < min || dataPoint.value > max) {
            return rule.severity === 'error' ? DataQuality.INVALID : DataQuality.OUT_OF_RANGE;
          }
        }
        break;
      }
      case 'rate_limit': {
        const maxRate = rule.params.maxRate as number;
        const windowMs = rule.params.windowMs as number;
        const key = `${dataPoint.deviceId}:${dataPoint.capabilityId}`;
        // Simplified rate limiting
        break;
      }
    }
    return DataQuality.VALID;
  }

  // -------------------------------------------------------------------------
  // Transformation Pipeline
  // -------------------------------------------------------------------------

  registerSchema(schema: DataSchema): void {
    this.schemas.set(`${schema.id}`, schema);
  }

  registerPipeline(pipeline: TransformationPipeline): void {
    this.pipelines.set(pipeline.id, pipeline);
  }

  private async transformDataPoint(dataPoint: DeviceDataPoint): Promise<DeviceDataPoint> {
    const startTime = Date.now();

    // Find applicable pipeline
    const pipeline = this.findApplicablePipeline(dataPoint);
    if (!pipeline) {
      dataPoint.processedAt = new Date();
      return dataPoint;
    }

    let transformed = { ...dataPoint };

    for (const step of pipeline.steps.sort((a, b) => a.order - b.order)) {
      if (!step.enabled) continue;

      try {
        transformed = await this.applyTransformationStep(transformed, step);
      } catch (error) {
        console.error(`Transformation step ${step.id} failed:`, error);
        this.emit('transformation:error', { dataPoint: transformed, step, error });
      }
    }

    transformed.processedAt = new Date();
    return transformed;
  }

  private findApplicablePipeline(dataPoint: DeviceDataPoint): TransformationPipeline | undefined {
    for (const pipeline of this.pipelines.values()) {
      if (pipeline.deviceFilter) {
        const filter = pipeline.deviceFilter;
        if (filter.deviceIds && !filter.deviceIds.includes(dataPoint.deviceId)) continue;
        if (filter.capabilityIds && !filter.capabilityIds.includes(dataPoint.capabilityId)) continue;
        // Tags would require device lookup
        return pipeline;
      }
      return pipeline; // Default pipeline
    }
    return undefined;
  }

  private async applyTransformationStep(
    dataPoint: DeviceDataPoint,
    step: TransformationStep
  ): Promise<DeviceDataPoint> {
    switch (step.type) {
      case TransformationType.UNIT_CONVERSION: {
        const fromUnit = step.config.fromUnit as string;
        const toUnit = step.config.toUnit as string;
        const factor = step.config.factor as number;

        if (typeof dataPoint.value === 'number' && dataPoint.unit === fromUnit) {
          return {
            ...dataPoint,
            value: dataPoint.value * factor,
            unit: toUnit,
            metadata: { ...dataPoint.metadata, originalValue: dataPoint.value, originalUnit: fromUnit },
          };
        }
        break;
      }

      case TransformationType.ROUNDING: {
        const decimalPlaces = (step.config.decimalPlaces as number) || 2;
        if (typeof dataPoint.value === 'number') {
          return {
            ...dataPoint,
            value: Math.round(dataPoint.value * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces),
          };
        }
        break;
      }

      case TransformationType.FILTERING: {
        const minValue = step.config.minValue as number;
        const maxValue = step.config.maxValue as number;
        if (typeof dataPoint.value === 'number') {
          if (minValue !== undefined && dataPoint.value < minValue) {
            return { ...dataPoint, quality: DataQuality.OUT_OF_RANGE };
          }
          if (maxValue !== undefined && dataPoint.value > maxValue) {
            return { ...dataPoint, quality: DataQuality.OUT_OF_RANGE };
          }
        }
        break;
      }

      case TransformationType.MAPPING: {
        const mapping = step.config.mapping as Record<string, string>;
        if (typeof dataPoint.value === 'string' && mapping[dataPoint.value]) {
          return { ...dataPoint, value: mapping[dataPoint.value] };
        }
        break;
      }

      case TransformationType.ENRICHMENT: {
        const enrichments = step.config.enrichments as Record<string, unknown>;
        return {
          ...dataPoint,
          metadata: { ...dataPoint.metadata, ...enrichments },
        };
      }

      case TransformationType.DEDUPLICATION: {
        // Handled at ingestion level
        break;
      }
    }

    return dataPoint;
  }

  // -------------------------------------------------------------------------
  // Hashing & Deduplication
  // -------------------------------------------------------------------------

  private computeHash(deviceId: string, capabilityId: string, payload: unknown): string {
    const data = `${deviceId}:${capabilityId}:${JSON.stringify(payload)}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private isDuplicate(hash: string): boolean {
    const now = Date.now();
    const lastSeen = this.seenHashes.get(hash);

    if (lastSeen && now - lastSeen < this.config.deduplicationWindow) {
      return true;
    }

    this.seenHashes.set(hash, now);

    // Cleanup old hashes periodically
    if (this.seenHashes.size > this.config.deduplicationMaxSize) {
      const cutoff = now - this.config.deduplicationWindow;
      for (const [h, timestamp] of this.seenHashes) {
        if (timestamp < cutoff) {
          this.seenHashes.delete(h);
        }
      }
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // Rate Limiting
  // -------------------------------------------------------------------------

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const bucket = this.rateLimits.get(key);

    if (!bucket || now > bucket.resetAt) {
      this.rateLimits.set(key, { count: 1, resetAt: now + this.config.rateLimitWindow });
      return true;
    }

    if (bucket.count >= this.config.rateLimitMax) {
      return false;
    }

    bucket.count++;
    return true;
  }

  // -------------------------------------------------------------------------
  // Data Point Creation
  // -------------------------------------------------------------------------

  private createDataPoint(
    deviceId: string,
    capabilityId: string,
    payload: Record<string, unknown>,
    source: IngestionProtocol,
    extraMetadata: Record<string, unknown>
  ): DeviceDataPoint {
    const value = payload.value !== undefined ? payload.value : payload;
    const timestamp = payload.timestamp
      ? new Date(payload.timestamp as string | number)
      : new Date();

    return {
      id: uuidv4(),
      deviceId,
      capabilityId,
      timestamp,
      value: value as number | string | boolean | Record<string, unknown>,
      unit: (payload.unit as string) || '',
      quality: DataQuality.VALID,
      source,
      metadata: {
        ...extraMetadata,
        ingestedAt: new Date().toISOString(),
      },
      receivedAt: new Date(),
      sequenceNumber: payload.sequenceNumber as number | undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Buffer Management
  // -------------------------------------------------------------------------

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const dataToFlush = [...this.buffer];
    this.buffer = [];

    this.metrics.bufferSize = this.buffer.length;
    this.metrics.lastFlushTime = new Date();

    if (this.storageCallback) {
      try {
        await this.storageCallback(dataToFlush);
        this.emit('buffer:flushed', { count: dataToFlush.length });
      } catch (error) {
        console.error('Failed to flush buffer to storage:', error);
        // Re-add to buffer on failure
        this.buffer = [...dataToFlush, ...this.buffer];
        this.emit('buffer:flush_error', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Dead Letter Queue
  // -------------------------------------------------------------------------

  private addToDeadLetterQueue(data: unknown, error: string, protocol: IngestionProtocol): void {
    this.deadLetterQueue.push({
      data,
      error,
      timestamp: new Date(),
      protocol,
    });

    this.metrics.deadLetterSize = this.deadLetterQueue.length;

    // Trim if too large
    if (this.deadLetterQueue.length > this.config.deadLetterQueueMaxSize) {
      this.deadLetterQueue = this.deadLetterQueue.slice(-this.config.deadLetterQueueMaxSize);
    }

    this.emit('dead_letter', { error, protocol });
  }

  getDeadLetterQueue(limit: number = 100): typeof this.deadLetterQueue {
    return this.deadLetterQueue.slice(-limit);
  }

  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
    this.metrics.deadLetterSize = 0;
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  private updateProcessingTimeMetrics(processingTime: number): void {
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalIngested - 1) + processingTime) /
      this.metrics.totalIngested;

    if (processingTime > this.metrics.maxProcessingTime) {
      this.metrics.maxProcessingTime = processingTime;
    }
  }

  getMetrics(): IngestionMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------

  getBufferSize(): number {
    return this.buffer.length;
  }

  getPendingData(): DeviceDataPoint[] {
    return [...this.buffer];
  }

  async forceFlush(): Promise<void> {
    await this.flushBuffer();
  }
}

// Singleton instance
let ingestionInstance: IngestionService | null = null;

export function getIngestionService(): IngestionService {
  if (!ingestionInstance) {
    ingestionInstance = new IngestionService();
  }
  return ingestionInstance;
}

export default IngestionService;
