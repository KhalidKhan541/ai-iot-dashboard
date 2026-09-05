// =============================================================================
// DEVICE & DATA ENGINE - Barrel Exports
// =============================================================================
// Central export point for all device management, data processing, streaming,
// alerting, and anomaly detection modules.
// =============================================================================

// -----------------------------------------------------------------------------
// Device Registry - Types, Capabilities, Protocols & Templates
// -----------------------------------------------------------------------------

export {
  // Enums
  DeviceCategory,
  DeviceStatus,
  Protocol,
  DataFormat,
  FrequencyUnit,
  CapabilityType,

  // Types
  CapabilityDefinition,
  DeviceCapability,
  ProtocolConfig,
  ProtocolCapabilities,
  DeviceTypeDefinition,
  DeviceTemplate,
  DeviceProvisioningInfo,
  DeviceFirmware,
  DeviceHealth,
  DeviceLocation,
  Device,
  DeviceGroup,

  // Registry
  DeviceRegistry,
  getDeviceRegistry,
} from './device-registry';

// -----------------------------------------------------------------------------
// Device Service - Management, Provisioning, Groups & Health
// -----------------------------------------------------------------------------

export {
  // Enums
  DeviceEvent,

  // Types
  DeviceEventPayload,
  DeviceServiceConfig,
  DeviceServiceError,
  ERROR_CODES,
  RegisterDeviceInput,
  UpdateDeviceInput,
  DeviceFilter,
  DeviceGroupInput,

  // Service
  DeviceService,
  getDeviceService,
} from './device-service';

// =============================================================================
// DATA ENGINE EXPORTS
// =============================================================================

// -----------------------------------------------------------------------------
// Data Ingestion - MQTT, HTTP, WebSocket & Batch Processing
// -----------------------------------------------------------------------------

export {
  // Enums
  IngestionProtocol,
  DataQuality,
  TransformationType,

  // Types
  DeviceDataPoint,
  RawMqttMessage,
  RawHttpRequest,
  RawWebSocketMessage,
  ValidationRule,
  DataSchema,
  SchemaField,
  TransformationStep,
  TransformationPipeline,
  RateLimitBucket,
  IngestionConfig,
  IngestionMetrics,

  // Service
  IngestionService,
  getIngestionService,
} from './ingestion-service';

// -----------------------------------------------------------------------------
// Data Storage - Time-Series, Compression, Retention & Export
// -----------------------------------------------------------------------------

export {
  // Types
  TimeSeriesPoint,
  CompressedBlock,
  RetentionPolicy,
  QueryOptions,
  AggregationType,
  QueryResult,
  DataExportOptions,
  ExportResult,
  StorageMetrics,
  StorageConfig,

  // Enums
  CompressionAlgorithm,

  // Service
  StorageService,
  getStorageService,
} from './storage-service';

// -----------------------------------------------------------------------------
// Data Aggregation - Real-Time, Downsampling & Gap Filling
// -----------------------------------------------------------------------------

export {
  // Types
  AggregatedPoint,
  AggregationStats,
  HistogramBucket,
  TrendAnalysis,
  AggregationRule,
  WindowFunction,
  GapFillingConfig,
  DownsamplingConfig,
  AggregationPipeline,
  RawDataPoint,
  AggregationConfig,

  // Enums
  AggregationResolution,

  // Service
  AggregationService,
  getAggregationService,
} from './aggregation-service';

// -----------------------------------------------------------------------------
// Streaming - WebSocket, MQTT & Real-Time Push
// -----------------------------------------------------------------------------

export {
  // Types
  StreamMessage,
  StreamSubscription,
  StreamClient,
  MqttBrokerConfig,
  BackpressureConfig,
  DataBufferConfig,
  StreamingConfig,
  StreamingMetrics,

  // Enums
  StreamProtocol,
  SubscriptionType,

  // Service
  StreamingService,
  getStreamingService,
} from './streaming-service';

// =============================================================================
// ALERTS & ANOMALY DETECTION EXPORTS
// =============================================================================

// -----------------------------------------------------------------------------
// Alert Service - Rules, Conditions, Actions & Escalation
// -----------------------------------------------------------------------------

export {
  // Types
  AlertCondition,
  AlertAction,
  AlertRule,
  Alert,
  ActionResult,
  SuppressionConfig,
  EscalationConfig,
  EscalationLevel,
  AlertServiceConfig,
  AlertMetrics,

  // Enums
  AlertSeverity,
  AlertStatus,
  ConditionType,
  ActionType,
  SuppressionType,
  EscalationPolicy,

  // Service
  AlertService,
  getAlertService,
} from './alert-service';

// -----------------------------------------------------------------------------
// Anomaly Detector - Statistical, ML & Seasonal Detection
// -----------------------------------------------------------------------------

export {
  // Types
  DataPoint,
  AnomalyResult,
  DetectionModel,
  ModelStatistics,
  DetectionRule,
  SeasonalDecomposition,
  AnomalyAlert,
  AnomalyDetectorConfig,

  // Enums
  AnomalyType,
  AnomalySeverity,
  DetectionAlgorithm,

  // Service
  AnomalyDetector,
  getAnomalyDetector,
} from './anomaly-detector';

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

import { getDeviceRegistry } from './device-registry';
import { getDeviceService } from './device-service';
import { getIngestionService } from './ingestion-service';
import { getStorageService } from './storage-service';
import { getAggregationService } from './aggregation-service';
import { getStreamingService } from './streaming-service';
import { getAlertService } from './alert-service';
import { getAnomalyDetector } from './anomaly-detector';

/**
 * Initialize all services with default configuration.
 * Returns an object containing all service instances.
 */
export function initializeServices() {
  const registry = getDeviceRegistry();
  const deviceService = getDeviceService();
  const ingestionService = getIngestionService();
  const storageService = getStorageService();
  const aggregationService = getAggregationService();
  const streamingService = getStreamingService();
  const alertService = getAlertService();
  const anomalyDetector = getAnomalyDetector();

  // Wire up services
  ingestionService.setStorageCallback(async (data) => {
    for (const point of data) {
      await storageService.writePoint({
        deviceId: point.deviceId,
        capabilityId: point.capabilityId,
        timestamp: point.timestamp,
        value: point.value,
        unit: point.unit,
        quality: point.quality,
        metadata: point.metadata,
      });
    }
  });

  aggregationService.setRawDataCallback(async (deviceId, capabilityId, startTime, endTime) => {
    const points = await storageService.queryRange(deviceId, capabilityId, startTime, endTime);
    return points.map(p => ({
      deviceId: p.deviceId,
      capabilityId: p.capabilityId,
      timestamp: p.timestamp,
      value: typeof p.value === 'number' ? p.value : 0,
      metadata: p.metadata,
    }));
  });

  return {
    registry,
    deviceService,
    ingestionService,
    storageService,
    aggregationService,
    streamingService,
    alertService,
    anomalyDetector,
  };
}

/**
 * Gracefully destroy all services.
 */
export function destroyServices(): void {
  getDeviceService().destroy();
  getIngestionService().destroy();
  getStorageService().destroy();
  getAggregationService().destroy();
  getStreamingService().destroy();
  getAlertService().destroy();
  getAnomalyDetector().destroy();
}
