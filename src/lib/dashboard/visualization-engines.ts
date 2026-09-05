/**
 * Visualization engines for dashboard widgets.
 * Provides rendering logic and data processing for charts, gauges,
 * maps, tables, KPIs, status indicators, heatmaps, and sparklines.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ChartType =
  | "line"
  | "area"
  | "bar"
  | "pie"
  | "donut"
  | "radar"
  | "scatter";

export type ScaleType = "linear" | "logarithmic" | "category" | "time";

export type TimeUnit =
  | "millisecond"
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

export interface ChartDataSet {
  label: string;
  data: number[];
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  hidden?: boolean;
  yAxisID?: string;
  order?: number;
}

export interface AxisConfig {
  type: ScaleType;
  label: string;
  min?: number;
  max?: number;
  tickCount?: number;
  tickFormat?: string;
  gridLines?: boolean;
  gridColor?: string;
  tickColor?: string;
  position?: "left" | "right" | "top" | "bottom";
  reverse?: boolean;
  stacked?: boolean;
}

export interface TooltipConfig {
  enabled: boolean;
  format?: string;
  backgroundColor?: string;
  titleColor?: string;
  bodyColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  padding?: number;
  displayColors?: boolean;
  callbacks?: Record<string, string>;
}

export interface LegendConfig {
  enabled: boolean;
  position: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  labels?: {
    color?: string;
    font?: { size?: number; weight?: string };
    padding?: number;
    usePointStyle?: boolean;
    pointStyle?: string;
  };
}

export interface ReferenceLine {
  value: number;
  label: string;
  color: string;
  style?: "solid" | "dashed" | "dotted";
  width?: number;
}

export interface ChartAnnotations {
  referenceLines: ReferenceLine[];
  zones: { from: number; to: number; color: string; label: string }[];
}

export interface GradientConfig {
  enabled: boolean;
  type: "linear" | "radial";
  angle?: number;
  stops: { offset: number; color: string; opacity: number }[];
}

export interface RenderedChart {
  type: ChartType;
  datasets: ChartDataSet[];
  labels: string[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  legend: LegendConfig;
  tooltip: TooltipConfig;
  annotations: ChartAnnotations;
  options: Record<string, unknown>;
}

export interface GaugeValue {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  status: "normal" | "warning" | "critical" | "good";
  percentage: number;
  color: string;
}

export interface GaugeSegment {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface RenderedGauge {
  value: GaugeValue;
  segments: GaugeSegment[];
  needle: { angle: number; length: number; color: string };
  size: { width: number; height: number };
  centerLabel: string;
  displayConfig: {
    showValue: boolean;
    showLabel: boolean;
    showSegments: boolean;
    animated: boolean;
    format: string;
  };
}

export interface StatusIndicator {
  status: string;
  label: string;
  color: string;
  icon: string;
  pulse: boolean;
  size: "sm" | "md" | "lg" | "xl";
}

export interface KPICardData {
  value: number;
  formattedValue: string;
  unit: string;
  label: string;
  trend: {
    direction: "up" | "down" | "neutral";
    value: number;
    percentage: number;
    color: string;
  };
  sparkline: number[];
  comparisonLabel: string;
  icon?: string;
  size: "sm" | "md" | "lg";
  format: "number" | "currency" | "percent" | "bytes" | "duration" | "custom";
}

export interface TableRenderConfig {
  columns: TableColumn[];
  rows: TableRow[];
  pagination: PaginationConfig;
  sorting: SortConfig;
  search: SearchConfig;
  selection: SelectionConfig;
  styling: TableStyling;
}

export interface TableColumn {
  field: string;
  header: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align: "left" | "center" | "right";
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  format?: ColumnFormat;
  sticky?: "left" | "right";
  resizable: boolean;
}

export type ColumnFormat =
  | { type: "number"; decimals?: number; prefix?: string; suffix?: string }
  | { type: "currency"; currency?: string; decimals?: number }
  | { type: "percent"; decimals?: number }
  | { type: "date"; format?: string }
  | { type: "datetime"; format?: string }
  | { type: "bytes" }
  | { type: "duration" }
  | { type: "boolean"; trueLabel?: string; falseLabel?: string }
  | { type: "status"; statusMap?: Record<string, { color: string; label: string }> }
  | { type: "custom"; expression: string };

export interface TableRow {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
  expanded?: boolean;
}

export interface PaginationConfig {
  enabled: boolean;
  page: number;
  pageSize: number;
  totalRows: number;
  pageSizeOptions: number[];
  showFirstLast: boolean;
  showPrevNext: boolean;
}

export interface SortConfig {
  enabled: boolean;
  field: string | null;
  order: "asc" | "desc" | null;
  multiSort: boolean;
}

export interface SearchConfig {
  enabled: boolean;
  query: string;
  fields: string[];
  caseSensitive: boolean;
  debounceMs: number;
}

export interface SelectionConfig {
  enabled: boolean;
  mode: "single" | "multi";
  selectedIds: Set<string>;
  showCheckbox: boolean;
}

export interface TableStyling {
  striped: boolean;
  compact: boolean;
  bordered: boolean;
  hoverable: boolean;
  headerStyle: {
    background: string;
    color: string;
    font: string;
  };
  rowStyle: {
    background: string;
    alternateBackground: string;
    selectedBackground: string;
  };
  cellStyle: {
    padding: string;
    fontSize: string;
  };
}

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  normalizedValue: number;
  color: string;
  label: string;
}

export interface HeatmapRenderData {
  cells: HeatmapCell[];
  xLabels: string[];
  yLabels: string[];
  colorScale: { value: number; color: string }[];
  minValue: number;
  maxValue: number;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  value?: number;
  color?: string;
  icon?: string;
  size?: "sm" | "md" | "lg";
}

export interface MapCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  markers: MapMarker[];
  color: string;
}

export interface MapRenderData {
  markers: MapMarker[];
  clusters: MapCluster[];
  center: { lat: number; lng: number };
  zoom: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface SparklineData {
  values: number[];
  color: string;
  fillColor: string;
  lineWidth: number;
  showArea: boolean;
  showDots: boolean;
  curveType: "linear" | "monotone" | "step";
  height: number;
  width: number;
}

// ── Chart Engine ─────────────────────────────────────────────────────────────

export class ChartEngine {
  // ─── Line/Area Charts ────────────────────────────────────────────────

  renderLineChart(
    data: Record<string, unknown>[],
    config: {
      xField: string;
      yFields: string[];
      labels?: string[];
      colors?: string[];
      showArea?: boolean;
      tension?: number;
      showGrid?: boolean;
      showLegend?: boolean;
      showTooltip?: boolean;
      xAxisLabel?: string;
      yAxisLabel?: string;
      yAxisMin?: number;
      yAxisMax?: number;
      referenceLines?: ReferenceLine[];
      xAxisType?: ScaleType;
      yAxisType?: ScaleType;
    }
  ): RenderedChart {
    const colors = config.colors ?? [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
      "#ec4899",
      "#84cc16",
    ];

    const labels = config.labels
      ?? data.map((d) => String(d[config.xField] ?? ""));

    const datasets: ChartDataSet[] = config.yFields.map((field, i) => ({
      label: field,
      data: data.map((d) => Number(d[field]) || 0),
      color: colors[i % colors.length],
      borderColor: colors[i % colors.length],
      backgroundColor: config.showArea
        ? `${colors[i % colors.length]}20`
        : undefined,
      fill: config.showArea,
      tension: config.tension ?? 0.4,
      borderWidth: 2,
      pointRadius: data.length > 50 ? 0 : 3,
      pointHoverRadius: 5,
    }));

    return {
      type: config.showArea ? "area" : "line",
      datasets,
      labels,
      xAxis: {
        type: config.xAxisType ?? "category",
        label: config.xAxisLabel ?? "",
        gridLines: config.showGrid ?? true,
        gridColor: "#e5e7eb",
        tickColor: "#6b7280",
      },
      yAxis: {
        type: config.yAxisType ?? "linear",
        label: config.yAxisLabel ?? "",
        min: config.yAxisMin,
        max: config.yAxisMax,
        gridLines: config.showGrid ?? true,
        gridColor: "#e5e7eb",
        tickColor: "#6b7280",
      },
      legend: {
        enabled: config.showLegend ?? true,
        position: "top",
        labels: { usePointStyle: true, padding: 16 },
      },
      tooltip: {
        enabled: config.showTooltip ?? true,
        backgroundColor: "#1f2937",
        titleColor: "#ffffff",
        bodyColor: "#d1d5db",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
      },
      annotations: {
        referenceLines: config.referenceLines ?? [],
        zones: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 300 },
      },
    };
  }

  renderAreaChart(
    data: Record<string, unknown>[],
    config: {
      xField: string;
      yFields: string[];
      colors?: string[];
      stackAreas?: boolean;
      gradient?: boolean;
      opacity?: number;
    }
  ): RenderedChart {
    const chart = this.renderLineChart(data, {
      ...config,
      showArea: true,
      tension: 0.4,
    });

    chart.datasets = chart.datasets.map((ds, i) => ({
      ...ds,
      fill: config.stackAreas ? (i === 0 ? "origin" : "-1") : true,
      fillOpacity: config.opacity ?? 0.3,
    }));

    return chart;
  }

  // ─── Bar Charts ──────────────────────────────────────────────────────

  renderBarChart(
    data: Record<string, unknown>[],
    config: {
      xField: string;
      yFields: string[];
      colors?: string[];
      horizontal?: boolean;
      stacked?: boolean;
      barRadius?: number;
      showGrid?: boolean;
      showLegend?: boolean;
      showTooltip?: boolean;
      xAxisLabel?: string;
      yAxisLabel?: string;
      barWidth?: number;
      barGap?: number;
    }
  ): RenderedChart {
    const colors = config.colors ?? [
      "#3b82f6",
      "#8b5cf6",
      "#06b6d4",
      "#10b981",
      "#f59e0b",
      "#ef4444",
    ];

    const labels = data.map((d) => String(d[config.xField] ?? ""));

    const datasets: ChartDataSet[] = config.yFields.map((field, i) => ({
      label: field,
      data: data.map((d) => Number(d[field]) || 0),
      color: colors[i % colors.length],
      backgroundColor: `${colors[i % colors.length]}CC`,
      borderColor: colors[i % colors.length],
      borderWidth: 0,
      borderRadius: config.barRadius ?? 4,
      yAxisID: "y",
    }));

    return {
      type: "bar",
      datasets,
      labels,
      xAxis: {
        type: "category",
        label: config.xAxisLabel ?? "",
        stacked: config.stacked,
        gridLines: false,
        tickColor: "#6b7280",
      },
      yAxis: {
        type: "linear",
        label: config.yAxisLabel ?? "",
        stacked: config.stacked,
        gridLines: config.showGrid ?? true,
        gridColor: "#e5e7eb",
        tickColor: "#6b7280",
      },
      legend: {
        enabled: config.showLegend ?? true,
        position: "top",
        labels: { usePointStyle: true, padding: 16 },
      },
      tooltip: {
        enabled: config.showTooltip ?? true,
        backgroundColor: "#1f2937",
        titleColor: "#ffffff",
        bodyColor: "#d1d5db",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
      annotations: { referenceLines: [], zones: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: config.horizontal ? "y" : "x",
        animation: { duration: 300 },
      },
    };
  }

  // ─── Pie/Donut Charts ────────────────────────────────────────────────

  renderPieChart(
    data: Record<string, unknown>[],
    config: {
      labelField: string;
      valueField: string;
      colors?: string[];
      innerRadius?: number;
      showLabels?: boolean;
      showLegend?: boolean;
      showTooltip?: boolean;
      padAngle?: number;
      cornerRadius?: number;
    }
  ): RenderedChart {
    const colors = config.colors ?? [
      "#3b82f6",
      "#8b5cf6",
      "#06b6d4",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#ec4899",
      "#84cc16",
    ];

    const labels = data.map((d) => String(d[config.labelField] ?? ""));
    const values = data.map((d) => Number(d[config.valueField]) || 0);

    const datasets: ChartDataSet[] = [
      {
        label: config.valueField,
        data: values,
        color: "",
        backgroundColor: data.map((_, i) => colors[i % colors.length]),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ];

    return {
      type: config.innerRadius && config.innerRadius > 0 ? "donut" : "pie",
      datasets,
      labels,
      xAxis: { type: "category", label: "", gridLines: false },
      yAxis: { type: "linear", label: "", gridLines: false },
      legend: {
        enabled: config.showLegend ?? true,
        position: "right",
        labels: { usePointStyle: true, padding: 12 },
      },
      tooltip: {
        enabled: config.showTooltip ?? true,
        backgroundColor: "#1f2937",
        titleColor: "#ffffff",
        bodyColor: "#d1d5db",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: "percentage",
        },
      },
      annotations: { referenceLines: [], zones: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: config.innerRadius ?? 0,
        animation: { animateRotate: true, duration: 500 },
      },
    };
  }
}

// ── Gauge Engine ─────────────────────────────────────────────────────────────

export class GaugeEngine {
  render(
    value: number,
    config: {
      min?: number;
      max?: number;
      unit?: string;
      label?: string;
      segments?: GaugeSegment[];
      size?: "sm" | "md" | "lg";
      decimals?: number;
      showValue?: boolean;
      showLabel?: boolean;
    } = {}
  ): RenderedGauge {
    const min = config.min ?? 0;
    const max = config.max ?? 100;
    const clampedValue = Math.max(min, Math.min(max, value));
    const percentage = ((clampedValue - min) / (max - min)) * 100;

    const segments = config.segments ?? [
      { from: 0, to: 33, color: "#ef4444" },
      { from: 33, to: 66, color: "#f59e0b" },
      { from: 66, to: 100, color: "#10b981" },
    ];

    const currentSegment = segments.find(
      (s) => percentage >= s.from && percentage <= s.to
    );
    const color = currentSegment?.color ?? "#3b82f6";

    let status: GaugeValue["status"] = "normal";
    if (percentage >= 80) status = "good";
    else if (percentage >= 50) status = "normal";
    else if (percentage >= 25) status = "warning";
    else status = "critical";

    const sizeMap = {
      sm: { width: 120, height: 80 },
      md: { width: 200, height: 130 },
      lg: { width: 300, height: 190 },
    };

    const size = sizeMap[config.size ?? "md"];
    const needleAngle = -90 + (percentage / 100) * 180;

    return {
      value: {
        value: clampedValue,
        min,
        max,
        unit: config.unit ?? "",
        label: config.label ?? "",
        status,
        percentage,
        color,
      },
      segments: segments.map((s) => ({
        ...s,
        from: (s.from / max) * 100,
        to: (s.to / max) * 100,
      })),
      needle: {
        angle: needleAngle,
        length: size.height * 0.6,
        color: "#1f2937",
      },
      size,
      centerLabel: config.label ?? "",
      displayConfig: {
        showValue: config.showValue ?? true,
        showLabel: config.showLabel ?? true,
        showSegments: true,
        animated: true,
        format: `,.${config.decimals ?? 0}f`,
      },
    };
  }

  calculateSegments(values: number[], thresholds: { warning: number; critical: number }): GaugeSegment[] {
    return [
      { from: 0, to: thresholds.critical, color: "#ef4444", label: "Critical" },
      { from: thresholds.critical, to: thresholds.warning, color: "#f59e0b", label: "Warning" },
      { from: thresholds.warning, to: Math.max(...values) * 1.2, color: "#10b981", label: "Normal" },
    ];
  }
}

// ── Status Indicator Engine ──────────────────────────────────────────────────

export class StatusIndicatorEngine {
  render(
    value: string,
    statusMap: Record<string, { label: string; color: string; icon: string }>,
    config: {
      size?: StatusIndicator["size"];
      pulse?: boolean;
      showLabel?: boolean;
      showIcon?: boolean;
    } = {}
  ): StatusIndicator {
    const status = statusMap[value] ?? {
      label: value,
      color: "#6b7280",
      icon: "help-circle",
    };

    return {
      status: value,
      label: status.label,
      color: status.color,
      icon: status.icon,
      pulse: config.pulse ?? false,
      size: config.size ?? "md",
    };
  }

  getStatusColor(
    value: number,
    thresholds: { good?: number; warning?: number; critical?: number },
    invert = false
  ): string {
    if (invert) {
      if (value <= (thresholds.critical ?? 20)) return "#ef4444";
      if (value <= (thresholds.warning ?? 50)) return "#f59e0b";
      return "#10b981";
    }
    if (value >= (thresholds.critical ?? 80)) return "#ef4444";
    if (value >= (thresholds.warning ?? 60)) return "#f59e0b";
    return "#10b981";
  }
}

// ── KPI Card Engine ──────────────────────────────────────────────────────────

export class KPICardEngine {
  render(
    value: number,
    config: {
      previousValue?: number;
      unit?: string;
      label?: string;
      format?: KPICardData["format"];
      currency?: string;
      decimals?: number;
      showTrend?: boolean;
      sparklineData?: number[];
      comparisonLabel?: string;
      icon?: string;
      size?: KPICardData["size"];
    } = {}
  ): KPICardData {
    const format = config.format ?? "number";
    const decimals = config.decimals ?? 0;

    const formattedValue = this.formatValue(value, format, {
      currency: config.currency,
      decimals,
    });

    let trendDirection: "up" | "down" | "neutral" = "neutral";
    let trendValue = 0;
    let trendPercentage = 0;
    let trendColor = "#6b7280";

    if (config.previousValue !== undefined) {
      trendValue = value - config.previousValue;
      if (config.previousValue !== 0) {
        trendPercentage = (trendValue / Math.abs(config.previousValue)) * 100;
      }
      if (trendValue > 0) {
        trendDirection = "up";
        trendColor = "#10b981";
      } else if (trendValue < 0) {
        trendDirection = "down";
        trendColor = "#ef4444";
      }
    }

    return {
      value,
      formattedValue,
      unit: config.unit ?? "",
      label: config.label ?? "",
      trend: {
        direction: trendDirection,
        value: trendValue,
        percentage: Math.round(trendPercentage * 10) / 10,
        color: trendColor,
      },
      sparkline: config.sparklineData ?? [],
      comparisonLabel: config.comparisonLabel ?? "vs previous period",
      icon: config.icon,
      size: config.size ?? "md",
      format,
    };
  }

  private formatValue(
    value: number,
    format: KPICardData["format"],
    options: { currency?: string; decimals: number }
  ): string {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: options.currency ?? "USD",
          minimumFractionDigits: options.decimals,
          maximumFractionDigits: options.decimals,
        }).format(value);
      case "percent":
        return `${value.toFixed(options.decimals)}%`;
      case "bytes":
        return this.formatBytes(value);
      case "duration":
        return this.formatDuration(value);
      default:
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: options.decimals,
          maximumFractionDigits: options.decimals,
        }).format(value);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }
}

// ── Table Engine ─────────────────────────────────────────────────────────────

export class TableEngine {
  processData(
    data: Record<string, unknown>[],
    config: {
      columns: { field: string; header: string; sortable?: boolean; filterable?: boolean; format?: ColumnFormat }[];
      sortField?: string;
      sortOrder?: "asc" | "desc";
      searchQuery?: string;
      searchFields?: string[];
      page?: number;
      pageSize?: number;
    }
  ): TableRenderConfig {
    let processed = [...data];

    if (config.searchQuery && config.searchFields?.length) {
      const query = config.searchQuery.toLowerCase();
      processed = processed.filter((row) =>
        config.searchFields!.some((field) =>
          String(row[field] ?? "").toLowerCase().includes(query)
        )
      );
    }

    if (config.sortField && config.sortOrder) {
      processed.sort((a, b) => {
        const aVal = a[config.sortField!];
        const bVal = b[config.sortField!];
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return config.sortOrder === "desc" ? -cmp : cmp;
      });
    }

    const totalRows = processed.length;
    const page = config.page ?? 0;
    const pageSize = config.pageSize ?? 10;
    const start = page * pageSize;
    const paginated = processed.slice(start, start + pageSize);

    const columns: TableColumn[] = config.columns.map((col) => ({
      field: col.field,
      header: col.header,
      align: "left",
      sortable: col.sortable ?? true,
      filterable: col.filterable ?? false,
      visible: true,
      format: col.format,
      resizable: true,
    }));

    const rows: TableRow[] = paginated.map((row, i) => ({
      id: String(row.id ?? i),
      data: row,
      selected: false,
      expanded: false,
    }));

    return {
      columns,
      rows,
      pagination: {
        enabled: true,
        page,
        pageSize,
        totalRows,
        pageSizeOptions: [10, 25, 50, 100],
        showFirstLast: true,
        showPrevNext: true,
      },
      sorting: {
        enabled: true,
        field: config.sortField ?? null,
        order: config.sortOrder ?? null,
        multiSort: false,
      },
      search: {
        enabled: true,
        query: config.searchQuery ?? "",
        fields: config.searchFields ?? [],
        caseSensitive: false,
        debounceMs: 300,
      },
      selection: {
        enabled: false,
        mode: "single",
        selectedIds: new Set(),
        showCheckbox: false,
      },
      styling: {
        striped: true,
        compact: false,
        bordered: false,
        hoverable: true,
        headerStyle: {
          background: "#f9fafb",
          color: "#374151",
          font: "600 14px system-ui",
        },
        rowStyle: {
          background: "#ffffff",
          alternateBackground: "#f9fafb",
          selectedBackground: "#eff6ff",
        },
        cellStyle: {
          padding: "12px 16px",
          fontSize: "14px",
        },
      },
    };
  }

  formatCellValue(value: unknown, format?: ColumnFormat): string {
    if (value === null || value === undefined) return "—";
    if (!format) return String(value);

    switch (format.type) {
      case "number":
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: format.decimals ?? 0,
          maximumFractionDigits: format.decimals ?? 0,
        }).format(Number(value));
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: format.currency ?? "USD",
        }).format(Number(value));
      case "percent":
        return `${Number(value).toFixed(format.decimals ?? 0)}%`;
      case "date":
        return new Date(String(value)).toLocaleDateString();
      case "datetime":
        return new Date(String(value)).toLocaleString();
      case "bytes":
        if (Number(value) === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(Number(value)) / Math.log(k));
        return `${(Number(value) / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
      case "boolean":
        return value ? (format.trueLabel ?? "Yes") : (format.falseLabel ?? "No");
      case "status": {
        const statusVal = String(value);
        const statusConf = format.statusMap?.[statusVal];
        return statusConf?.label ?? statusVal;
      }
      default:
        return String(value);
    }
  }
}

// ── Heatmap Engine ───────────────────────────────────────────────────────────

export class HeatmapEngine {
  render(
    data: Record<string, unknown>[],
    config: {
      xField: string;
      yField: string;
      valueField: string;
      colorScale?: string[];
      showValues?: boolean;
    }
  ): HeatmapRenderData {
    const xLabels = [...new Set(data.map((d) => String(d[config.xField])))];
    const yLabels = [...new Set(data.map((d) => String(d[config.yField])))];

    const colorScale = config.colorScale ?? [
      "#eff6ff",
      "#bfdbfe",
      "#60a5fa",
      "#3b82f6",
      "#2563eb",
      "#1d4ed8",
      "#1e40af",
    ];

    const values = data.map((d) => Number(d[config.valueField]) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const cells: HeatmapCell[] = data.map((d) => {
      const raw = Number(d[config.valueField]) || 0;
      const normalized = (raw - minVal) / range;
      const colorIndex = Math.min(
        Math.floor(normalized * (colorScale.length - 1)),
        colorScale.length - 1
      );

      return {
        x: String(d[config.xField]),
        y: String(d[config.yField]),
        value: raw,
        normalizedValue: normalized,
        color: colorScale[colorIndex],
        label: config.showValues ? String(raw) : "",
      };
    });

    return {
      cells,
      xLabels,
      yLabels,
      colorScale: colorScale.map((color, i) => ({
        value: (i / (colorScale.length - 1)) * range + minVal,
        color,
      })),
      minValue: minVal,
      maxValue: maxVal,
    };
  }
}

// ── Map Engine ───────────────────────────────────────────────────────────────

export class MapEngine {
  renderMarkers(
    data: Record<string, unknown>[],
    config: {
      latField: string;
      lngField: string;
      labelField?: string;
      valueField?: string;
      colorField?: string;
      clusterThreshold?: number;
    }
  ): MapRenderData {
    const markers: MapMarker[] = data.map((d, i) => ({
      id: String(d.id ?? i),
      lat: Number(d[config.latField]) || 0,
      lng: Number(d[config.lngField]) || 0,
      label: config.labelField ? String(d[config.labelField] ?? "") : `Marker ${i}`,
      value: config.valueField ? Number(d[config.valueField]) : undefined,
      color: config.colorField ? String(d[config.colorField] ?? "#3b82f6") : "#3b82f6",
    }));

    const clusters = this.clusterMarkers(markers, config.clusterThreshold ?? 10);

    const lats = markers.map((m) => m.lat);
    const lngs = markers.map((m) => m.lng);

    return {
      markers,
      clusters,
      center: {
        lat: lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0,
        lng: lngs.length ? lngs.reduce((a, b) => a + b, 0) / lngs.length : 0,
      },
      zoom: markers.length > 100 ? 10 : markers.length > 20 ? 12 : 14,
      bounds: lats.length
        ? {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs),
          }
        : undefined,
    };
  }

  private clusterMarkers(markers: MapMarker[], threshold: number): MapCluster[] {
    if (markers.length <= threshold) return [];

    const clusters: MapCluster[] = [];
    const used = new Set<string>();

    for (let i = 0; i < markers.length; i++) {
      if (used.has(markers[i].id)) continue;

      const nearby = markers.filter(
        (m, j) =>
          j >= i &&
          !used.has(m.id) &&
          Math.abs(m.lat - markers[i].lat) < 0.01 &&
          Math.abs(m.lng - markers[i].lng) < 0.01
      );

      if (nearby.length > 1) {
        const cluster: MapCluster = {
          id: `cluster-${clusters.length}`,
          lat: nearby.reduce((s, m) => s + m.lat, 0) / nearby.length,
          lng: nearby.reduce((s, m) => s + m.lng, 0) / nearby.length,
          count: nearby.length,
          markers: nearby,
          color: "#3b82f6",
        };
        clusters.push(cluster);
        nearby.forEach((m) => used.add(m.id));
      }
    }

    return clusters;
  }

  calculateBounds(
    markers: MapMarker[]
  ): { north: number; south: number; east: number; west: number } | null {
    if (!markers.length) return null;
    return {
      north: Math.max(...markers.map((m) => m.lat)),
      south: Math.min(...markers.map((m) => m.lat)),
      east: Math.max(...markers.map((m) => m.lng)),
      west: Math.min(...markers.map((m) => m.lng)),
    };
  }
}

// ── Sparkline Engine ─────────────────────────────────────────────────────────

export class SparklineEngine {
  render(
    values: number[],
    config: {
      color?: string;
      lineWidth?: number;
      showArea?: boolean;
      showDots?: boolean;
      height?: number;
      width?: number;
      curveType?: SparklineData["curveType"];
    } = {}
  ): SparklineData {
    return {
      values,
      color: config.color ?? "#3b82f6",
      fillColor: `${config.color ?? "#3b82f6"}20`,
      lineWidth: config.lineWidth ?? 2,
      showArea: config.showArea ?? true,
      showDots: config.showDots ?? false,
      curveType: config.curveType ?? "monotone",
      height: config.height ?? 40,
      width: config.width ?? 120,
    };
  }

  generateSVGPath(
    values: number[],
    width: number,
    height: number,
    padding = 2
  ): string {
    if (values.length < 2) return "";

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = (width - padding * 2) / (values.length - 1);

    const points = values.map((v, i) => ({
      x: padding + i * stepX,
      y: padding + ((v - min) / range) * (height - padding * 2),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return path;
  }
}

// ── Engine Registry ──────────────────────────────────────────────────────────

let engines: {
  chart: ChartEngine;
  gauge: GaugeEngine;
  status: StatusIndicatorEngine;
  kpi: KPICardEngine;
  table: TableEngine;
  heatmap: HeatmapEngine;
  map: MapEngine;
  sparkline: SparklineEngine;
} | null = null;

export function getEngines() {
  if (!engines) {
    engines = {
      chart: new ChartEngine(),
      gauge: new GaugeEngine(),
      status: new StatusIndicatorEngine(),
      kpi: new KPICardEngine(),
      table: new TableEngine(),
      heatmap: new HeatmapEngine(),
      map: new MapEngine(),
      sparkline: new SparklineEngine(),
    };
  }
  return engines;
}
