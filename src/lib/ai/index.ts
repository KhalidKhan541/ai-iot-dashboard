/**
 * Barrel exports for AI analytics and rules modules.
 */

export { AIClient, createAIClient, getAIClient } from "./provider";
export type {
  AIProvider,
  AIRole,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  TokenUsage,
  AIClientConfig,
  ProviderConfig,
  CostRecord,
} from "./provider";

export { PredictiveAnalyticsEngine } from "./predictive-analytics";
export type {
  TimeSeriesPoint,
  ForecastResult,
  ForecastPoint,
  ConfidenceInterval,
  ModelAccuracy,
  TrendAnalysis,
  SeasonalityResult,
  SeasonalComponent,
  CapacityPlan,
  FailurePrediction,
  ContributingFactor,
  ForecastMethod,
} from "./predictive-analytics";

export { AnomalyIntelligenceEngine } from "./anomaly-intelligence";
export type {
  DataPoint,
  Anomaly,
  AnomalySeverity,
  AnomalyType,
  RootCause,
  Correlation,
  AnomalyCluster,
  ImpactAssessment,
  PatternSignature,
  PatternCondition,
} from "./anomaly-intelligence";

export { OptimizationEngine } from "./optimization";
export type {
  DeviceData,
  MetricTimeSeries,
  EnergyOptimization,
  EnergyRecommendation,
  ScheduleAdjustment,
  MaintenanceSchedule,
  TimeWindow,
  ResourceAllocation,
  ResourcePool,
  AllocationEntry,
  Bottleneck,
  PerformanceRecommendation,
  CostOptimization,
  CostBreakdown,
  CostRecommendation,
} from "./optimization";

export { NLQueryEngine } from "./natural-language-query";
export type {
  NLQuery,
  ParsedQuery,
  QueryIntent,
  TimeRange,
  QueryFilter,
  QueryAggregation,
  VisualizationHint,
  QuerySuggestion,
  QueryHistoryEntry,
  QueryResult,
  ResultColumn,
  ResultRow,
  ResultSummary,
  VisualizationConfig,
  SeriesConfig,
  AxisConfig,
} from "./natural-language-query";

export { InsightsGenerator } from "./insights-generator";
export type {
  Insight,
  InsightType,
  InsightSeverity,
  InsightSource,
  InsightMetric,
  TrendHighlight,
  AnomalyExplanation,
  Recommendation,
  SummaryReport,
  ReportSection,
  InsightContext,
  DeviceSummary,
  AlertSummary,
} from "./insights-generator";

export { RuleEngine } from "./rule-engine";
export type {
  Rule,
  ConditionGroup,
  Condition,
  Action,
  ActionConfig,
  WebhookConfig,
  EmailConfig,
  SMSConfig,
  PushConfig,
  DeviceCommandConfig,
  LambdaConfig,
  LogConfig,
  ChainConfig,
  RuleChain,
  RuleTemplate,
  TemplateVariable,
  RuleTestResult,
  ConditionEvaluation,
  ActionTestResult,
  RuleContext,
  RuleEvaluationResult,
} from "./rule-engine";

export { ActionExecutor } from "./action-executor";
export type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionLog,
  WebhookPayload,
  EmailMessage,
  SMSMessage,
  PushPayload,
  DeviceCommand,
  LambdaInvocation,
  RetryConfig,
  ActionExecutorConfig,
} from "./action-executor";
