export type PredictionModel =
  | "linear_regression"
  | "polynomial_regression"
  | "arima"
  | "sarima"
  | "prophet"
  | "lstm"
  | "random_forest"
  | "gradient_boosting"
  | "ensemble";

export type AnomalyDetectionMethod = "zscore" | "iqr" | "mad" | "isolation_forest" | "autoencoder" | "statistical";

export type ModelStatus = "idle" | "training" | "evaluating" | "deployed" | "failed" | "archived";

export interface AIPrediction {
  id: string;
  modelId: string;
  deviceId: string;
  sensorId: string;
  timestamp: Date;
  predictedValue: number;
  confidence: number;
  lowerBound?: number;
  upperBound?: number;
  actualValue?: number;
  error?: number;
  metadata?: Record<string, unknown>;
}

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  type: PredictionModel;
  status: ModelStatus;
  deviceId: string;
  sensorId: string;
  features: ModelFeature[];
  hyperparameters: Record<string, unknown>;
  metrics: ModelMetrics;
  trainedAt?: Date;
  deployedAt?: Date;
  version: number;
  trainingDataPoints: number;
  trainingDuration?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelFeature {
  name: string;
  type: "numerical" | "categorical" | "temporal" | "derived";
  importance?: number;
  description?: string;
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  mape?: number;
  r2?: number;
  auc?: number;
  logLoss?: number;
  crossValidationScore?: number;
}

export interface AnomalyDetection {
  id: string;
  deviceId: string;
  sensorId: string;
  method: AnomalyDetectionMethod;
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  isConfirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: Date;
  description?: string;
  context?: Record<string, unknown>;
}

export interface AnomalyRule {
  id: string;
  name: string;
  description?: string;
  deviceId: string;
  sensorId: string;
  method: AnomalyDetectionMethod;
  sensitivity: number;
  windowSize: number;
  minSamples: number;
  enabled: boolean;
  notifyOnDetection: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelTrainingJob {
  id: string;
  modelId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  metrics?: ModelMetrics;
  dataRange: {
    start: Date;
    end: Date;
  };
  parameters: Record<string, unknown>;
}

export interface ForecastResult {
  modelId: string;
  deviceId: string;
  sensorId: string;
  historicalData: ForecastDataPoint[];
  predictions: ForecastDataPoint[];
  confidenceInterval?: {
    upper: ForecastDataPoint[];
    lower: ForecastDataPoint[];
  };
  metrics?: ModelMetrics;
  generatedAt: Date;
}

export interface ForecastDataPoint {
  timestamp: Date;
  value: number;
  confidence?: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
  description?: string;
}

export interface ModelComparison {
  models: Array<{
    modelId: string;
    name: string;
    type: PredictionModel;
    metrics: ModelMetrics;
  }>;
  bestModel: string;
  comparisonMetric: keyof ModelMetrics;
}

export interface AIInsight {
  id: string;
  type: "trend" | "anomaly" | "prediction" | "recommendation" | "pattern";
  deviceId: string;
  sensorId?: string;
  title: string;
  description: string;
  confidence: number;
  impact: "low" | "medium" | "high";
  actionable: boolean;
  suggestedActions?: string[];
  data?: Record<string, unknown>;
  generatedAt: Date;
  expiresAt?: Date;
  isRead: boolean;
  isDismissed: boolean;
}

export interface TrainModelInput {
  deviceId: string;
  sensorId: string;
  type: PredictionModel;
  name?: string;
  description?: string;
  features?: string[];
  hyperparameters?: Record<string, unknown>;
  trainingPeriod?: {
    start: Date;
    end: Date;
  };
}

export interface PredictInput {
  modelId: string;
  steps: number;
  includeConfidence?: boolean;
  includeHistorical?: boolean;
}

export interface AIConfig {
  enabled: boolean;
  models: {
    trainingEnabled: boolean;
    autoRetrain: boolean;
    retrainInterval: number;
    maxModelsPerDevice: number;
  };
  anomalyDetection: {
    enabled: boolean;
    defaultMethod: AnomalyDetectionMethod;
    defaultSensitivity: number;
    alertOnDetection: boolean;
  };
  forecasting: {
    enabled: boolean;
    defaultHorizon: number;
    confidenceLevel: number;
  };
}

export interface AIMetricsDashboard {
  totalModels: number;
  activeModels: number;
  totalPredictions: number;
  averageAccuracy: number;
  anomalyDetectionRate: number;
  lastTrainingRun?: Date;
  nextScheduledTraining?: Date;
  modelPerformance: Array<{
    modelId: string;
    name: string;
    accuracy: number;
    predictionCount: number;
  }>;
  recentAnomalies: AnomalyDetection[];
  recentPredictions: AIPrediction[];
}
