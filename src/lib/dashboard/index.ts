/**
 * Dashboard module barrel exports.
 * Central export point for all dashboard builder services,
 * types, and utilities.
 */

// ── Dashboard Service ────────────────────────────────────────────────────────

export {
  DashboardService,
  getDashboardService,
  createDashboardService,
  type Dashboard,
  type DashboardPermission,
  type DashboardShare,
  type DashboardFavorite,
  type DashboardFolder,
  type DashboardVariable,
  type DashboardTemplate,
  type CreateDashboardInput,
  type UpdateDashboardInput,
  type DashboardListOptions,
  type DashboardListResult,
  type DashboardPermissionLevel,
  type WidgetTemplate,
} from "./dashboard-service";

// ── Widget Service ───────────────────────────────────────────────────────────

export {
  WidgetService,
  getWidgetService,
  createWidgetService,
  type Widget,
  type WidgetType,
  type WidgetLayout,
  type WidgetConfig,
  type WidgetDataSourceConfig,
  type WidgetThreshold,
  type WidgetColorScheme,
  type WidgetCreateInput,
  type WidgetUpdateInput,
  type WidgetBatchUpdate,
  type WidgetSize,
  type WidgetRefreshUnit,
  type AggregationType,
  type TimeUnit,
  type WidgetDataFilter,
  type WidgetDataTransform,
  type LineChartConfig,
  type AreaChartConfig,
  type BarChartConfig,
  type GaugeConfig,
  type TableConfig,
  type MapConfig,
  type HeatmapConfig,
  type StatusConfig,
  type KPIConfig,
  type TextConfig,
  type ImageConfig,
  type PieChartConfig,
  type SparklineConfig,
  type ProgressConfig,
} from "./widget-service";

// ── Layout Engine ────────────────────────────────────────────────────────────

export {
  LayoutEngine,
  getLayoutEngine,
  createLayoutEngine,
  type Breakpoint,
  type GridLayoutDirection,
  type GridPosition,
  type LayoutItem,
  type LayoutConfig,
  type ResponsiveBreakpointConfig,
  type LayoutSnapshot,
  type LayoutTemplate,
  type DragEvent,
  type ResizeEvent,
  type CollisionResult,
} from "./layout-engine";

// ── Data Source Service ──────────────────────────────────────────────────────

export {
  DataSourceService,
  getDataSourceService,
  createDataSourceService,
  type DataSource,
  type DataSourceType,
  type DataSourceConfig,
  type DataSourceFilter,
  type DataSourceSort,
  type DataTransform,
  type DataTransformType,
  type DeviceDataSource,
  type AggregatedDataSource,
  type CustomSQLDataSource,
  type APIDataSource,
  type StaticDataSource,
  type MultiDataSource,
  type TimeInterval,
  type AggregationFunction,
  type QueryResult,
  type QueryContext,
  type DeviceDataPoint,
} from "./data-source";

// ── Visualization Engines ────────────────────────────────────────────────────

export {
  ChartEngine,
  GaugeEngine,
  StatusIndicatorEngine,
  KPICardEngine,
  TableEngine,
  HeatmapEngine,
  MapEngine,
  SparklineEngine,
  getEngines,
  type ChartType,
  type ScaleType,
  type ChartDataSet,
  type AxisConfig,
  type TooltipConfig,
  type LegendConfig,
  type ReferenceLine,
  type ChartAnnotations,
  type GradientConfig,
  type RenderedChart,
  type GaugeValue,
  type GaugeSegment,
  type RenderedGauge,
  type StatusIndicator,
  type KPICardData,
  type TableRenderConfig,
  type TableColumn,
  type TableRow,
  type ColumnFormat,
  type PaginationConfig,
  type SortConfig,
  type SearchConfig,
  type SelectionConfig,
  type TableStyling,
  type HeatmapCell,
  type HeatmapRenderData,
  type MapMarker,
  type MapCluster,
  type MapRenderData,
  type SparklineData,
} from "./visualization-engines";

// ── Template Library ─────────────────────────────────────────────────────────

export {
  TemplateLibraryService,
  getTemplateLibraryService,
  createTemplateLibraryService,
  type DashboardTemplate as TemplateDefinition,
  type TemplateCategory,
  type TemplateWidget,
  type TemplateVariable,
  type TemplateCreateInput,
  type TemplateSearchOptions,
} from "./template-library";

// ── Export Service ───────────────────────────────────────────────────────────

export {
  ExportService,
  getExportService,
  createExportService,
  type ExportFormat,
  type ExportQuality,
  type ExportOrientation,
  type ExportOptions,
  type ExportResult,
  type ExportSchedule,
  type ScheduleFrequency,
  type DeliveryMethod,
  type DeliveryConfig,
  type EmailConfig,
  type WebhookConfig,
  type FileConfig,
  type S3Config,
  type ExportHistoryEntry,
  type DashboardSnapshot,
  type WidgetSnapshot,
  type ExportSize,
} from "./export-service";
