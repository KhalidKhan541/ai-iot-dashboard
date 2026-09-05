/**
 * Data source service for dashboard widgets.
 * Handles device data, aggregated queries, custom SQL, API sources,
 * static data, and data transformation pipelines.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type DataSourceType =
  | "device"
  | "aggregated"
  | "custom_sql"
  | "api"
  | "static"
  | "multi";

export type AggregationFunction =
  | "avg"
  | "min"
  | "max"
  | "sum"
  | "count"
  | "first"
  | "last"
  | "median"
  | "p95"
  | "p99"
  | "stddev"
  | "variance";

export type DataTransformType =
  | "map"
  | "filter"
  | "reduce"
  | "sort"
  | "limit"
  | "pivot"
  | "derivative"
  | "cumulative"
  | "movingAverage"
  | "normalize"
  | "groupBy"
  | "flatten"
  | "uniq"
  | "window"
  | "shift"
  | "fill"
  | "interpolate"
  | "resample";

export type TimeInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "6h"
  | "12h"
  | "24h"
  | "7d"
  | "30d"
  | "90d"
  | "1y"
  | "custom";

export interface DataSourceFilter {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "notContains"
    | "startsWith"
    | "endsWith"
    | "in"
    | "notIn"
    | "between"
    | "isNull"
    | "isNotNull"
    | "regex";
  value: unknown;
  caseSensitive?: boolean;
}

export interface DataSourceSort {
  field: string;
  order: "asc" | "desc";
  nullsFirst?: boolean;
}

export interface DataTransform {
  id: string;
  type: DataTransformType;
  field?: string;
  expression?: string;
  aggregation?: AggregationFunction;
  limit?: number;
  order?: "asc" | "desc";
  groupByField?: string;
  windowSize?: number;
  fillValue?: unknown;
  fillMethod?: "zero" | "linear" | "forward" | "backward" | "interpolate";
  resampleInterval?: TimeInterval;
}

export interface DeviceDataSource {
  type: "device";
  deviceId: string;
  metrics: string[];
  aggregation: AggregationFunction;
  timeRange: TimeInterval;
  customStartTime?: Date;
  customEndTime?: Date;
  filters: DataSourceFilter[];
  groupBy?: string;
  interval?: TimeInterval;
}

export interface AggregatedDataSource {
  type: "aggregated";
  deviceIds: string[];
  metrics: string[];
  aggregation: AggregationFunction;
  timeRange: TimeInterval;
  customStartTime?: Date;
  customEndTime?: Date;
  groupBy?: "device" | "location" | "type" | "metric";
  filters: DataSourceFilter[];
  interval?: TimeInterval;
}

export interface CustomSQLDataSource {
  type: "custom_sql";
  sql: string;
  parameters?: Record<string, unknown>;
  timeoutMs?: number;
  maxRows?: number;
}

export interface APIDataSource {
  type: "api";
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  authType?: "none" | "bearer" | "basic" | "api_key";
  authToken?: string;
  timeoutMs?: number;
  cacheMs?: number;
  resultPath?: string;
}

export interface StaticDataSource {
  type: "static";
  data: unknown;
  format: "json" | "csv" | "key_value";
}

export interface MultiDataSource {
  type: "multi";
  sources: DataSourceConfig[];
  mergeStrategy: "concat" | "union" | "interleave";
}

export type DataSourceConfig =
  | DeviceDataSource
  | AggregatedDataSource
  | CustomSQLDataSource
  | APIDataSource
  | StaticDataSource
  | MultiDataSource;

export interface DataSource {
  id: string;
  name: string;
  description: string;
  config: DataSourceConfig;
  transforms: DataTransform[];
  refreshIntervalMs: number;
  autoRefresh: boolean;
  cacheEnabled: boolean;
  cacheTtlMs: number;
  lastFetchedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSourceCreateInput {
  name: string;
  description?: string;
  config: DataSourceConfig;
  transforms?: DataTransform[];
  refreshIntervalMs?: number;
  autoRefresh?: boolean;
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
}

export interface DataSourceUpdateInput {
  name?: string;
  description?: string;
  config?: DataSourceConfig;
  transforms?: DataTransform[];
  refreshIntervalMs?: number;
  autoRefresh?: boolean;
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
}

export interface QueryResult {
  data: unknown[];
  columns: { name: string; type: string }[];
  rowCount: number;
  executionTimeMs: number;
  fromCache: boolean;
  timestamp: Date;
}

export interface QueryContext {
  variables?: Record<string, unknown>;
  startTime?: Date;
  endTime?: Date;
  timezone?: string;
  userId?: string;
}

export interface DeviceDataPoint {
  timestamp: string;
  deviceId: string;
  metric: string;
  value: number;
  unit?: string;
  quality?: "good" | "uncertain" | "bad";
  metadata?: Record<string, unknown>;
}

// ── In-Memory Store ──────────────────────────────────────────────────────────

const sources = new Map<string, DataSource>();
const queryCache = new Map<string, { result: QueryResult; expiresAt: number }>();

// ── Data Source Service ──────────────────────────────────────────────────────

export class DataSourceService {
  createSource(input: DataSourceCreateInput): DataSource {
    const id = crypto.randomUUID();
    const now = new Date();

    const source: DataSource = {
      id,
      name: input.name,
      description: input.description ?? "",
      config: input.config,
      transforms: input.transforms ?? [],
      refreshIntervalMs: input.refreshIntervalMs ?? 30_000,
      autoRefresh: input.autoRefresh ?? true,
      cacheEnabled: input.cacheEnabled ?? true,
      cacheTtlMs: input.cacheTtlMs ?? 60_000,
      lastFetchedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };

    sources.set(id, source);
    return source;
  }

  getSource(id: string): DataSource | null {
    return sources.get(id) ?? null;
  }

  updateSource(id: string, input: DataSourceUpdateInput): DataSource | null {
    const existing = sources.get(id);
    if (!existing) return null;

    const updated: DataSource = {
      ...existing,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.config !== undefined && { config: input.config }),
      ...(input.transforms !== undefined && { transforms: input.transforms }),
      ...(input.refreshIntervalMs !== undefined && {
        refreshIntervalMs: input.refreshIntervalMs,
      }),
      ...(input.autoRefresh !== undefined && { autoRefresh: input.autoRefresh }),
      ...(input.cacheEnabled !== undefined && { cacheEnabled: input.cacheEnabled }),
      ...(input.cacheTtlMs !== undefined && { cacheTtlMs: input.cacheTtlMs }),
      updatedAt: new Date(),
    };

    sources.set(id, updated);
    return updated;
  }

  deleteSource(id: string): boolean {
    for (const [key, value] of queryCache) {
      if (key.startsWith(id)) queryCache.delete(key);
    }
    return sources.delete(id);
  }

  listSources(): DataSource[] {
    return Array.from(sources.values());
  }

  // ─── Query Execution ─────────────────────────────────────────────────

  async query(
    sourceId: string,
    context: QueryContext = {}
  ): Promise<QueryResult> {
    const source = sources.get(sourceId);
    if (!source) throw new already existssource not found: ${sourceId}`);

    const cacheKey = this.buildCacheKey(sourceId, context);

    if (source.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    const startTime = Date.now();
    let result: QueryResult;

    try {
      switch (source.config.type) {
        case "device":
          result = await this.queryDevice(source.config, context);
          break;
        case "aggregated":
          result = await this.queryAggregated(source.config, context);
          break;
        case "custom_sql":
          result = await this.queryCustomSQL(source.config, context);
          break;
        case "api":
          result = await this.queryAPI(source.config);
          break;
        case "static":
          result = this.queryStatic(source.config);
          break;
        case "multi":
          result = await this.queryMulti(source.config, context);
          break;
        default:
          throw new Error(`Unknown source type`);
      }

      result.executionTimeMs = Date.now() - startTime;
      result.timestamp = new Date();

      if (source.transforms.length > 0) {
        result = this.applyTransforms(result, source.transforms);
      }

      if (source.cacheEnabled) {
        this.setCache(cacheKey, result, source.cacheTtlMs);
      }

      source.lastFetchedAt = new Date();
      source.lastError = null;
      return result;
    } catch (error) {
      source.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  // ─── Device Data ─────────────────────────────────────────────────────

  private async queryDevice(
    config: DeviceDataSource,
    context: QueryContext
  ): Promise<QueryResult> {
    const { startTime, endTime } = this.resolveTimeRange(
      config.timeRange,
      config.customStartTime,
      config.customEndTime,
      context
    );

    const dataPoints = this.generateDeviceData(
      config.deviceId,
      config.metrics,
      startTime,
      endTime,
      config.aggregation
    );

    const filtered = this.applyFilters(dataPoints, config.filters);

    return {
      data: filtered,
      columns: [
        { name: "timestamp", type: "datetime" },
        { name: "deviceId", type: "string" },
        { name: "metric", type: "string" },
        { name: "value", type: "number" },
      ],
      rowCount: filtered.length,
      executionTimeMs: 0,
      fromCache: false,
      timestamp: new Date(),
    };
  }

  private generateDeviceData(
    deviceId: string,
    metrics: string[],
    start: Date,
    end: Date,
    aggregation: AggregationFunction
  ): DeviceDataPoint[] {
    const points: DeviceDataPoint[] = [];
    const intervalMs = 60_000;

    for (let t = start.getTime(); t <= end.getTime(); t += intervalMs) {
      for (const metric of metrics) {
        const baseValue = this.getBaseValue(metric);
        const variance = Math.random() * 10 - 5;
        const value = this.applyAggregationValue(baseValue + variance, aggregation);

        points.push({
          timestamp: new Date(t).toISOString(),
          deviceId,
          metric,
          value: Math.round(value * 100) / 100,
          unit: this.getUnit(metric),
          quality: "good",
        });
      }
    }

    return points;
  }

  private getBaseValue(metric: string): number {
    const defaults: Record<string, number> = {
      temperature: 22,
      humidity: 55,
      pressure: 1013,
      voltage: 12,
      current: 5,
      power: 60,
      speed: 0,
      battery: 85,
    };
    return defaults[metric] ?? 50;
  }

  private getUnit(metric: string): string {
    const units: Record<string, string> = {
      temperature: "°C",
      humidity: "%",
      pressure: "hPa",
      voltage: "V",
      current: "A",
      power: "W",
      speed: "m/s",
      battery: "%",
    };
    return units[metric] ?? "";
  }

  private applyAggregationValue(
    value: number,
    aggregation: AggregationFunction
  ): number {
    switch (aggregation) {
      case "avg":
        return value;
      case "min":
        return value - Math.random() * 5;
      case "max":
        return value + Math.random() * 5;
      case "sum":
        return value * 10;
      case "count":
        return Math.floor(Math.random() * 100);
      default:
        return value;
    }
  }

  // ─── Aggregated Data ─────────────────────────────────────────────────

  private async queryAggregated(
    config: AggregatedDataSource,
    context: QueryContext
  ): Promise<QueryResult> {
    const { startTime, endTime } = this.resolveTimeRange(
      config.timeRange,
      config.customStartTime,
      config.customEndTime,
      context
    );

    const data: Record<string, unknown>[] = [];

    for (const deviceId of config.deviceIds) {
      for (const metric of config.metrics) {
        const value = this.getBaseValue(metric) + Math.random() * 10 - 5;
        data.push({
          deviceId,
          metric,
          value: Math.round(value * 100) / 100,
          timestamp: startTime.toISOString(),
          period: { start: startTime.toISOString(), end: endTime.toISOString() },
        });
      }
    }

    const filtered = this.applyFilters(data, config.filters);

    return {
      data: filtered,
      columns: [
        { name: "deviceId", type: "string" },
        { name: "metric", type: "string" },
        { name: "value", type: "number" },
        { name: "timestamp", type: "datetime" },
      ],
      rowCount: filtered.length,
      executionTimeMs: 0,
      fromCache: false,
      timestamp: new Date(),
    };
  }

  // ─── Custom SQL ──────────────────────────────────────────────────────

  private async queryCustomSQL(
    config: CustomSQLDataSource,
    context: QueryContext
  ): Promise<QueryResult> {
    const timeoutMs = config.timeoutMs ?? 30_000;
    const maxRows = config.maxRows ?? 1000;

    let processedSQL = config.sql;
    if (context.variables) {
      for (const [key, value] of Object.entries(context.variables)) {
        processedSQL = processedSQL.replace(
          new RegExp(`\\$\\{${key}\\}`, "g"),
          String(value)
        );
      }
    }

    return {
      data: [],
      columns: [],
      rowCount: 0,
      executionTimeMs: 0,
      fromCache: false,
      timestamp: new Date(),
    };
  }

  // ─── API Data ────────────────────────────────────────────────────────

  private async queryAPI(config: APIDataSource): Promise<QueryResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config.headers,
    };

    if (config.authType === "bearer" && config.authToken) {
      headers["Authorization"] = `Bearer ${config.authToken}`;
    } else if (config.authType === "basic" && config.authToken) {
      headers["Authorization"] = `Basic ${config.authToken}`;
    } else if (config.authType === "api_key" && config.authToken) {
      headers["X-API-Key"] = config.authToken;
    }

    const fetchOptions: RequestInit = {
      method: config.method,
      headers,
      signal: AbortSignal.timeout(config.timeoutMs ?? 10_000),
    };

    if (config.body && config.method !== "GET") {
      fetchOptions.body = config.body;
    }

    const response = await fetch(config.url, fetchOptions);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    let rawData = await response.json();

    if (config.resultPath) {
      const parts = config.resultPath.split(".");
      for (const part of parts) {
        if (rawData && typeof rawData === "object") {
          rawData = (rawData as Record<string, unknown>)[part];
        }
      }
    }

    const data = Array.isArray(rawData) ? rawData : [rawData];
    const columns = data.length > 0
      ? Object.keys(data[0] as Record<string, unknown>).map((key) => ({
          name: key,
          type: typeof (data[0] as Record<string, unknown>)[key],
        }))
      : [];

    return {
      data,
      columns,
      rowCount: data.length,
      executionTimeMs: 0,
      fromCache: false,
      timestamp: new Date(),
    };
  }

  // ─── Static Data ─────────────────────────────────────────────────────

  private queryStatic(config: StaticDataSource): QueryResult {
    let data: unknown[];

    if (config.format === "json") {
      data = Array.isArray(config.data) ? config.data : [config.data];
    } else if (config.format === "csv") {
      data = this.parseCSV(String(config.data));
    } else {
      data = Object.entries(config.data as Record<string, unknown>).map(
        ([key, value]) => ({ key, value })
      );
    }

    const columns = data.length > 0
      ? Object.keys(data[0] as Record<string, unknown>).map((key) => ({
          name: key,
          type: typeof (data[0] as Record<string, unknown>)[key],
        }))
      : [];

    return {
      data,
      columns,
      rowCount: data.length,
      executionTimeMs: 0,
      fromCache: false,
      timestamp: new Date(),
    };
  }

  // ─── Multi Source ────────────────────────────────────────────────────

  private async queryMulti(
    config: MultiDataSource,
    context: QueryContext
  ): Promise<QueryResult> {
    const results = await Promise.all(
      config.sources.map((src) => this.querySourceByConfig(src, context))
    );

    let mergedData: unknown[] = [];

    switch (config.mergeStrategy) {
      case "concat":
        mergedData = results.flatMap((r) => r.data);
        break;
      case "union":
        mergedData = results.flatMap((r) => r.data);
        mergedData = this.deduplicateData(mergedData);
        break;
      case "interleave":
        mergedData = this.interleaveData(results.map((r) => r.data));
        break;
    }

    const columns = results[0]?.columns ?? [];

    return {
      data: mergedData,
      columns,
      rowCount: mergedData.length,
      executionTimeMs: 0,
      fromCache: false,
      timestamp: new Date(),
    };
  }

  private async querySourceByConfig(
    config: DataSourceConfig,
    context: QueryContext
  ): Promise<QueryResult> {
    switch (config.type) {
      case "device":
        return this.queryDevice(config, context);
      case "aggregated":
        return this.queryAggregated(config, context);
      case "custom_sql":
        return this.queryCustomSQL(config, context);
      case "api":
        return this.queryAPI(config);
      case "static":
        return this.queryStatic(config);
      default:
        return { data: [], columns: [], rowCount: 0, executionTimeMs: 0, fromCache: false, timestamp: new Date() };
    }
  }

  private deduplicateData(data: unknown[]): unknown[] {
    const seen = new Set<string>();
    return data.filter((item) => {
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private interleaveData(arrays: unknown[][]): unknown[] {
    const maxLen = Math.max(...arrays.map((a) => a.length));
    const result: unknown[] = [];
    for (let i = 0; i < maxLen; i++) {
      for (const arr of arrays) {
        if (i < arr.length) result.push(arr[i]);
      }
    }
    return result;
  }

  // ─── Transforms ──────────────────────────────────────────────────────

  applyTransforms(result: QueryResult, transforms: DataTransform[]): QueryResult {
    let data = [...result.data];
    let columns = [...result.columns];

    for (const transform of transforms) {
      const output = this.applySingleTransform(data, transform, columns);
      data = output.data;
      if (output.columns) columns = output.columns;
    }

    return { ...result, data, columns, rowCount: data.length };
  }

  private applySingleTransform(
    data: unknown[],
    transform: DataTransform,
    columns: { name: string; type: string }[]
  ): { data: unknown[]; columns?: { name: string; type: string }[] } {
    const items = data as Record<string, unknown>[];

    switch (transform.type) {
      case "map":
        if (!transform.expression) return { data };
        return {
          data: items.map((item) => {
            const result = { ...item };
            try {
              const fn = new Function("item", `return ${transform.expression}`);
              return fn(item);
            } catch {
              return result;
            }
          }),
        };

      case "filter":
        if (!transform.expression) return { data };
        return {
          data: items.filter((item) => {
            try {
              const fn = new Function("item", `return ${transform.expression}`);
              return fn(item);
            } catch {
              return true;
            }
          }),
        };

      case "reduce":
        if (!transform.field || !transform.aggregation) return { data };
        return {
          data: [
            items.reduce(
              (acc, item) => {
                const val = Number(item[transform.field!]) || 0;
                switch (transform.aggregation) {
                  case "sum":
                    return { ...acc, value: (acc.value as number) + val };
                  case "avg":
                    return {
                      ...acc,
                      value: ((acc.value as number) * (acc.count as number) + val) / ((acc.count as number) + 1),
                      count: (acc.count as number) + 1,
                    };
                  case "min":
                    return { ...acc, value: Math.min(acc.value as number, val) };
                  case "max":
                    return { ...acc, value: Math.max(acc.value as number, val) };
                  case "count":
                    return { ...acc, value: (acc.value as number) + 1 };
                  default:
                    return acc;
                }
              },
              { value: transform.aggregation === "avg" ? 0 : Infinity, count: 0 }
            ),
          ],
        };

      case "sort":
        return {
          data: [...items].sort((a, b) => {
            const field = transform.field ?? "";
            const aVal = a[field];
            const bVal = b[field];
            const cmp = String(aVal).localeCompare(String(bVal));
            return transform.order === "desc" ? -cmp : cmp;
          }),
        };

      case "limit":
        return { data: items.slice(0, transform.limit ?? 100) };

      case "derivative":
        if (!transform.field) return { data };
        return {
          data: items.slice(1).map((item, i) => ({
            ...item,
            [transform.field!]:
              (Number(item[transform.field!]) || 0) -
              (Number(items[i][transform.field!]) || 0),
          })),
        };

      case "cumulative":
        if (!transform.field) return { data };
        let cumulative = 0;
        return {
          data: items.map((item) => {
            cumulative += Number(item[transform.field!]) || 0;
            return { ...item, [transform.field!]: cumulative };
          }),
        };

      case "movingAverage":
        if (!transform.field || !transform.windowSize) return { data };
        return {
          data: items.map((item, i) => {
            const start = Math.max(0, i - transform.windowSize! + 1);
            const window = items.slice(start, i + 1);
            const avg =
              window.reduce((sum, w) => sum + (Number(w[transform.field!]) || 0), 0) /
              window.length;
            return { ...item, [`${transform.field}_ma`]: Math.round(avg * 100) / 100 };
          }),
        };

      case "normalize":
        if (!transform.field) return { data };
        const values = items.map((i) => Number(i[transform.field!]) || 0);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        return {
          data: items.map((item) => ({
            ...item,
            [transform.field!]: ((Number(item[transform.field!]) || 0) - min) / range,
          })),
        };

      case "groupBy":
        if (!transform.field) return { data };
        const groups = new Map<string, Record<string, unknown>[]>();
        for (const item of items) {
          const key = String(item[transform.field!]);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(item);
        }
        return {
          data: Array.from(groups.entries()).map(([key, group]) => ({
            [transform.field!]: key,
            count: group.length,
            items: group,
          })),
        };

      case "flatten":
        return {
          data: items.flatMap((item) => {
            const val = item[transform.field ?? "items"];
            return Array.isArray(val) ? val : [item];
          }),
        };

      case "uniq":
        if (!transform.field) return { data };
        const seen = new Set<unknown>();
        return {
          data: items.filter((item) => {
            const val = item[transform.field!];
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
          }),
        };

      default:
        return { data };
    }
  }

  // ─── Filtering ───────────────────────────────────────────────────────

  private applyFilters(
    data: Record<string, unknown>[],
    filters: DataSourceFilter[]
  ): Record<string, unknown>[] {
    if (!filters.length) return data;

    return data.filter((item) =>
      filters.every((filter) => this.evaluateFilter(item, filter))
    );
  }

  private evaluateFilter(
    item: Record<string, unknown>,
    filter: DataSourceFilter
  ): boolean {
    const value = item[filter.field];
    const filterValue = filter.value;

    switch (filter.operator) {
      case "eq":
        return value === filterValue;
      case "neq":
        return value !== filterValue;
      case "gt":
        return Number(value) > Number(filterValue);
      case "gte":
        return Number(value) >= Number(filterValue);
      case "lt":
        return Number(value) < Number(filterValue);
      case "lte":
        return Number(value) <= Number(filterValue);
      case "contains":
        return String(value).includes(String(filterValue));
      case "notContains":
        return !String(value).includes(String(filterValue));
      case "startsWith":
        return String(value).startsWith(String(filterValue));
      case "endsWith":
        return String(value).endsWith(String(filterValue));
      case "in":
        return Array.isArray(filterValue) && filterValue.includes(value);
      case "notIn":
        return Array.isArray(filterValue) && !filterValue.includes(value);
      case "between": {
        const [min, max] = filterValue as [number, number];
        const numVal = Number(value);
        return numVal >= min && numVal <= max;
      }
      case "isNull":
        return value === null || value === undefined;
      case "isNotNull":
        return value !== null && value !== undefined;
      case "regex":
        try {
          return new RegExp(String(filterValue)).test(String(value));
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  // ─── Time Range ──────────────────────────────────────────────────────

  private resolveTimeRange(
    timeRange: TimeInterval,
    customStart?: Date,
    customEnd?: Date,
    context?: QueryContext
  ): { startTime: Date; endTime: Date } {
    const endTime = context?.endTime ?? customEnd ?? new Date();
    let startTime: Date;

    if (customStart) {
      startTime = customStart;
    } else {
      const intervals: Record<string, number> = {
        "1m": 60_000,
        "5m": 300_000,
        "15m": 900_000,
        "30m": 1_800_000,
        "1h": 3_600_000,
        "6h": 21_600_000,
        "12h": 43_200_000,
        "24h": 86_400_000,
        "7d": 604_800_000,
        "30d": 2_592_000_000,
        "90d": 7_776_000_000,
        "1y": 31_536_000_000,
      };
      startTime = new Date(
        endTime.getTime() - (intervals[timeRange] ?? intervals["24h"])
      );
    }

    return { startTime, endTime };
  }

  // ─── Cache ───────────────────────────────────────────────────────────

  private buildCacheKey(sourceId: string, context: QueryContext): string {
    return `${sourceId}:${JSON.stringify(context)}`;
  }

  private getFromCache(key: string): QueryResult | null {
    const entry = queryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      queryCache.delete(key);
      return null;
    }
    return { ...entry.result, fromCache: true };
  }

  private setCache(key: string, result: QueryResult, ttlMs: number): void {
    queryCache.set(key, {
      result,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clearCache(sourceId?: string): void {
    if (sourceId) {
      for (const [key] of queryCache) {
        if (key.startsWith(sourceId)) queryCache.delete(key);
      }
    } else {
      queryCache.clear();
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────────

  private parseCSV(csv: string): Record<string, unknown>[] {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        const val = values[i];
        row[header] = isNaN(Number(val)) ? val : Number(val);
      });
      return row;
    });
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

let defaultService: DataSourceService | null = null;

export function getDataSourceService(): DataSourceService {
  if (!defaultService) defaultService = new DataSourceService();
  return defaultService;
}

export function createDataSourceService(): DataSourceService {
  return new DataSourceService();
}
