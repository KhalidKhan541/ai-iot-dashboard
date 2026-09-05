/**
 * Natural language query engine for IoT data.
 * Converts human language to time-series queries, provides suggestions,
 * manages query history, and generates result visualizations.
 */

import crypto from "crypto";
import { AIClient, getAIClient } from "./provider";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NLQuery {
  id: string;
  rawText: string;
  parsedQuery: ParsedQuery;
  sql?: string;
  generatedAt: Date;
  executionTimeMs?: number;
  resultCount?: number;
}

export interface ParsedQuery {
  intent: QueryIntent;
  timeRange: TimeRange;
  filters: QueryFilter[];
  aggregations: QueryAggregation[];
  groupBy: string[];
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
  visualization?: VisualizationHint;
}

export type QueryIntent =
  | "select"
  | "aggregate"
  | "compare"
  | "trend"
  | "anomaly"
  | "forecast"
  | "summary"
  | "count"
  | "min"
  | "max"
  | "average"
  | "distribution"
  | "alert";

export interface TimeRange {
  type: "absolute" | "relative";
  start: Date;
  end: Date;
  description: string;
}

export interface QueryFilter {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
  value: string | number | (string | number)[];
}

export interface QueryAggregation {
  function: "count" | "sum" | "avg" | "min" | "max" | "percentile" | "stddev" | "distinct";
  field: string;
  alias?: string;
}

export interface VisualizationHint {
  type: "line" | "bar" | "pie" | "scatter" | "heatmap" | "gauge" | "table" | "area";
  xAxis?: string;
  yAxis?: string;
  colorBy?: string;
  title?: string;
}

export interface QuerySuggestion {
  id: string;
  text: string;
  category: "quick" | "analytical" | "diagnostic" | "predictive";
  description: string;
}

export interface QueryHistoryEntry {
  id: string;
  query: NLQuery;
  executedAt: Date;
  resultPreview: string;
  bookmarks: boolean;
  tags: string[];
}

export interface QueryResult {
  queryId: string;
  columns: ResultColumn[];
  rows: ResultRow[];
  summary: ResultSummary;
  visualization: VisualizationConfig;
  suggestions: string[];
}

export interface ResultColumn {
  name: string;
  type: "string" | "number" | "datetime" | "boolean";
  unit?: string;
}

export interface ResultRow {
  values: (string | number | boolean | null)[];
}

export interface ResultSummary {
  totalRows: number;
  executionTimeMs: number;
  description: string;
  highlights: string[];
}

export interface VisualizationConfig {
  type: string;
  title: string;
  series: SeriesConfig[];
  axes: AxisConfig[];
}

export interface SeriesConfig {
  name: string;
  data: { x: number | string; y: number }[];
  color?: string;
}

export interface AxisConfig {
  label: string;
  type: "linear" | "log" | "time" | "category";
  unit?: string;
}

// ── Time parsing patterns ────────────────────────────────────────────────────

const RELATIVE_TIME_PATTERNS: { regex: RegExp; parser: (match: RegExpMatchArray) => number }[] = [
  { regex: /(\d+)\s*s(?:ec(?:ond)?s?)?/i, parser: (m) => parseInt(m[1]) * 1000 },
  { regex: /(\d+)\s*m(?:in(?:ute)?s?)?/i, parser: (m) => parseInt(m[1]) * 60 * 1000 },
  { regex: /(\d+)\s*h(?:our)?s?/i, parser: (m) => parseInt(m[1]) * 3600000 },
  { regex: /(\d+)\s*d(?:ay)?s?/i, parser: (m) => parseInt(m[1]) * 86400000 },
  { regex: /(\d+)\s*w(?:eek)?s?/i, parser: (m) => parseInt(m[1]) * 604800000 },
  { regex: /(\d+)\s*mo(?:nth)?s?/i, parser: (m) => parseInt(m[1]) * 2592000000 },
  { regex: /(\d+)\s*y(?:ear)?s?/i, parser: (m) => parseInt(m[1]) * 31536000000 },
];

const TIME_PRESETS: Record<string, () => { start: Date; end: Date }> = {
  "today": () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: now };
  },
  "yesterday": () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end };
  },
  "last hour": () => ({
    start: new Date(Date.now() - 3600000),
    end: new Date(),
  }),
  "last 24 hours": () => ({
    start: new Date(Date.now() - 86400000),
    end: new Date(),
  }),
  "last 7 days": () => ({
    start: new Date(Date.now() - 604800000),
    end: new Date(),
  }),
  "last 30 days": () => ({
    start: new Date(Date.now() - 2592000000),
    end: new Date(),
  }),
  "this week": () => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    return { start, end: now };
  },
  "this month": () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  },
};

// ── Keyword dictionaries ─────────────────────────────────────────────────────

const INTENT_KEYWORDS: Record<string, QueryIntent[]> = {
  "show": ["select"],
  "display": ["select"],
  "list": ["select"],
  "get": ["select"],
  "fetch": ["select"],
  "total": ["aggregate"],
  "sum": ["aggregate"],
  "count": ["count"],
  "how many": ["count"],
  "average": ["average"],
  "mean": ["average"],
  "avg": ["average"],
  "maximum": ["max"],
  "highest": ["max"],
  "peak": ["max"],
  "minimum": ["min"],
  "lowest": ["min"],
  "compare": ["compare"],
  "vs": ["compare"],
  "versus": ["compare"],
  "trend": ["trend"],
  "over time": ["trend"],
  "change": ["trend"],
  "anomaly": ["anomaly"],
  "unusual": ["anomaly"],
  "outlier": ["anomaly"],
  "forecast": ["forecast"],
  "predict": ["forecast"],
  "future": ["forecast"],
  "summary": ["summary"],
  "overview": ["summary"],
  "summary report": ["summary"],
  "distribution": ["distribution"],
  "spread": ["distribution"],
};

const DEVICE_PATTERNS = [
  /device\s+(\w+)/i,
  /sensor\s+(\w+)/i,
  /gateway\s+(\w+)/i,
  /thermostat\s+(\w+)/i,
  /camera\s+(\w+)/i,
];

const METRIC_PATTERNS = [
  /temperature/i,
  /humidity/i,
  /pressure/i,
  /power/i,
  /consumption/i,
  /watts/i,
  /voltage/i,
  /current/i,
  /cpu/i,
  /memory/i,
  /disk/i,
  /network/i,
  /latency/i,
  /throughput/i,
  /error\s*rate/i,
  /uptime/i,
  /battery/i,
  /signal/i,
  /rssi/i,
];

// ── NLQueryEngine ────────────────────────────────────────────────────────────

export class NLQueryEngine {
  private aiClient: AIClient;
  private history: QueryHistoryEntry[] = [];
  private bookmarks: Set<string> = new Set();

  constructor(aiClient?: AIClient) {
    this.aiClient = aiClient ?? getAIClient();
  }

  async parseQuery(text: string): Promise<NLQuery> {
    const lower = text.toLowerCase().trim();

    const parsed = this.ruleBasedParse(lower);
    const sql = this.generateSQL(parsed);

    return {
      id: crypto.randomUUID(),
      rawText: text,
      parsedQuery: parsed,
      sql,
      generatedAt: new Date(),
    };
  }

  async parseQueryWithAI(text: string): Promise<NLQuery> {
    const response = await this.aiClient.chat([
      {
        role: "system",
        content: `You convert natural language queries about IoT devices into structured JSON.
Output ONLY valid JSON matching this schema:
{
  "intent": "select"|"aggregate"|"compare"|"trend"|"anomaly"|"forecast"|"summary"|"count"|"min"|"max"|"average"|"distribution"|"alert",
  "timeRange": {"type": "relative", "start": ISO8601, "end": ISO8601, "description": "..."},
  "filters": [{"field": "...", "operator": "eq"|"gt"|"lt"|"in"|..., "value": ...}],
  "aggregations": [{"function": "count"|"sum"|"avg"|"min"|"max", "field": "..."}],
  "groupBy": ["..."],
  "limit": number or null,
  "visualization": {"type": "line"|"bar"|"pie"|"scatter"|"table", "title": "..."}
}
Available metrics: temperature, humidity, pressure, power, consumption, voltage, cpu, memory, latency, error_rate, throughput.
Available device fields: deviceId, type, location, status.
Current time: ${new Date().toISOString()}`,
      },
      { role: "user", content: text },
    ]);

    try {
      const parsed = JSON.parse(response) as ParsedQuery;
      const sql = this.generateSQL(parsed);
      return {
        id: crypto.randomUUID(),
        rawText: text,
        parsedQuery: parsed,
        sql,
        generatedAt: new Date(),
      };
    } catch {
      return this.parseQuery(text);
    }
  }

  private ruleBasedParse(text: string): ParsedQuery {
    const intent = this.extractIntent(text);
    const timeRange = this.extractTimeRange(text);
    const filters = this.extractFilters(text);
    const aggregations = this.extractAggregations(text, intent);
    const groupBy = this.extractGroupBy(text);
    const visualization = this.suggestVisualization(intent, text);

    return {
      intent,
      timeRange,
      filters,
      aggregations,
      groupBy,
      visualization,
    };
  }

  private extractIntent(text: string): QueryIntent {
    let bestIntent: QueryIntent = "select";
    let bestScore = 0;

    for (const [keywords, intents] of Object.entries(INTENT_KEYWORDS)) {
      if (text.includes(keywords)) {
        const score = keywords.length;
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intents[0];
        }
      }
    }
    return bestIntent;
  }

  private extractTimeRange(text: string): TimeRange {
    for (const [preset, fn] of Object.entries(TIME_PRESETS)) {
      if (text.includes(preset)) {
        const { start, end } = fn();
        return { type: "relative", start, end, description: preset };
      }
    }

    for (const pattern of RELATIVE_TIME_PATTERNS) {
      const match = text.match(pattern.regex);
      if (match) {
        const ms = pattern.parser(match);
        return {
          type: "relative",
          start: new Date(Date.now() - ms),
          end: new Date(),
          description: `last ${match[0]}`,
        };
      }
    }

    return {
      type: "relative",
      start: new Date(Date.now() - 86400000),
      end: new Date(),
      description: "last 24 hours (default)",
    };
  }

  private extractFilters(text: string): QueryFilter[] {
    const filters: QueryFilter[] = [];

    for (const pattern of DEVICE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        filters.push({
          field: "deviceId",
          operator: "eq",
          value: match[1],
        });
      }
    }

    const rangeMatch = text.match(/above\s+(\d+(?:\.\d+)?)/i) ||
      text.match(/greater than\s+(\d+(?:\.\d+)?)/i) ||
      text.match(/over\s+(\d+(?:\.\d+)?)/i);
    if (rangeMatch) {
      filters.push({
        field: this.detectMetricField(text),
        operator: "gt",
        value: parseFloat(rangeMatch[1]),
      });
    }

    const belowMatch = text.match(/below\s+(\d+(?:\.\d+)?)/i) ||
      text.match(/less than\s+(\d+(?:\.\d+)?)/i) ||
      text.match(/under\s+(\d+(?:\.\d+)?)/i);
    if (belowMatch) {
      filters.push({
        field: this.detectMetricField(text),
        operator: "lt",
        value: parseFloat(belowMatch[1]),
      });
    }

    return filters;
  }

  private detectMetricField(text: string): string {
    for (const pattern of METRIC_PATTERNS) {
      if (pattern.test(text)) {
        return pattern.source.replace(/\\s+/g, "_").toLowerCase();
      }
    }
    return "value";
  }

  private extractAggregations(text: string, intent: QueryIntent): QueryAggregation[] {
    const field = this.detectMetricField(text);

    switch (intent) {
      case "count":
        return [{ function: "count", field: "*", alias: "count" }];
      case "average":
        return [{ function: "avg", field, alias: `avg_${field}` }];
      case "min":
        return [{ function: "min", field, alias: `min_${field}` }];
      case "max":
        return [{ function: "max", field, alias: `max_${field}` }];
      case "aggregate":
        return [
          { function: "sum", field, alias: `sum_${field}` },
          { function: "avg", field, alias: `avg_${field}` },
          { function: "count", field: "*", alias: "count" },
        ];
      default:
        return [];
    }
  }

  private extractGroupBy(text: string): string[] {
    const groups: string[] = [];
    if (/by\s+device/i.test(text)) groups.push("deviceId");
    if (/by\s+type/i.test(text)) groups.push("type");
    if (/by\s+location/i.test(text)) groups.push("location");
    if (/per\s+hour/i.test(text)) groups.push("hour");
    if (/per\s+day/i.test(text)) groups.push("day");
    return groups;
  }

  private suggestVisualization(intent: QueryIntent, text: string): VisualizationHint {
    if (/pie\s+chart/i.test(text)) return { type: "pie", title: this.generateTitle(text) };
    if (/bar\s+chart/i.test(text)) return { type: "bar", title: this.generateTitle(text) };
    if (/scatter/i.test(text)) return { type: "scatter", title: this.generateTitle(text) };
    if (/heatmap/i.test(text)) return { type: "heatmap", title: this.generateTitle(text) };
    if (/gauge/i.test(text)) return { type: "gauge", title: this.generateTitle(text) };

    switch (intent) {
      case "trend":
      case "forecast":
        return { type: "line", title: this.generateTitle(text) };
      case "compare":
        return { type: "bar", title: this.generateTitle(text) };
      case "distribution":
        return { type: "bar", title: this.generateTitle(text) };
      case "summary":
        return { type: "table", title: this.generateTitle(text) };
      default:
        return { type: "line", title: this.generateTitle(text) };
    }
  }

  private generateTitle(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1, 80);
  }

  private generateSQL(parsed: ParsedQuery): string {
    const selectParts: string[] = [];

    if (parsed.aggregations.length > 0) {
      for (const agg of parsed.aggregations) {
        const field = agg.field === "*" ? "*" : `"${agg.field}"`;
        selectParts.push(`${agg.function.toUpperCase()}(${field}) AS "${agg.alias ?? agg.function}"`);
      }
    } else {
      selectParts.push('"timestamp"', '"deviceId"', '"metric"', '"value"');
    }

    for (const group of parsed.groupBy) {
      if (!selectParts.includes(`"${group}"`)) {
        selectParts.unshift(`"${group}"`);
      }
    }

    const whereParts: string[] = [];
    whereParts.push(`"timestamp" >= '${parsed.timeRange.start.toISOString()}'`);
    whereParts.push(`"timestamp" <= '${parsed.timeRange.end.toISOString()}'`);

    for (const filter of parsed.filters) {
      const op = filter.operator === "eq" ? "=" :
        filter.operator === "gt" ? ">" :
        filter.operator === "lt" ? "<" :
        filter.operator === "gte" ? ">=" :
        filter.operator === "lte" ? "<=" : "=";
      whereParts.push(`"${filter.field}" ${op} ${typeof filter.value === "string" ? `'${filter.value}'` : filter.value}`);
    }

    let sql = `SELECT ${selectParts.join(", ")} FROM readings`;
    sql += ` WHERE ${whereParts.join(" AND ")}`;

    if (parsed.groupBy.length > 0) {
      sql += ` GROUP BY ${parsed.groupBy.map((g) => `"${g}"`).join(", ")}`;
    }

    if (parsed.orderBy) {
      sql += ` ORDER BY "${parsed.orderBy.field}" ${parsed.orderBy.direction.toUpperCase()}`;
    }

    if (parsed.limit) {
      sql += ` LIMIT ${parsed.limit}`;
    }

    return sql;
  }

  async getSuggestions(context?: {
    recentMetrics?: string[];
    recentDevices?: string[];
    userRole?: string;
  }): Promise<QuerySuggestion[]> {
    const suggestions: QuerySuggestion[] = [];

    suggestions.push(
      {
        id: crypto.randomUUID(),
        text: "Show temperature trends for all devices in the last 24 hours",
        category: "quick",
        description: "Quick overview of temperature across devices",
      },
      {
        id: crypto.randomUUID(),
        text: "Which devices have the highest power consumption this week?",
        category: "analytical",
        description: "Identify energy-heavy devices",
      },
      {
        id: crypto.randomUUID(),
        text: "Compare error rates between gateways and sensors",
        category: "diagnostic",
        description: "Cross-device type comparison",
      },
      {
        id: crypto.randomUUID(),
        text: "Predict memory usage for the next 7 days",
        category: "predictive",
        description: "AI-powered forecast",
      },
      {
        id: crypto.randomUUID(),
        text: "Show anomalies detected in the last hour",
        category: "diagnostic",
        description: "Recent anomaly detection",
      },
      {
        id: crypto.randomUUID(),
        text: "What is the average humidity across all locations?",
        category: "quick",
        description: "Simple aggregation query",
      },
    );

    if (context?.recentDevices?.length) {
      suggestions.push({
        id: crypto.randomUUID(),
        text: `Show all metrics for device ${context.recentDevices[0]} today`,
        category: "quick",
        description: `Device-specific overview`,
      });
    }

    if (context?.recentMetrics?.includes("temperature")) {
      suggestions.push({
        id: crypto.randomUUID(),
        text: "Alert me when temperature exceeds 35 degrees",
        category: "analytical",
        description: "Set up temperature monitoring",
      });
    }

    return suggestions;
  }

  async executeQuery(query: NLQuery): Promise<QueryResult> {
    const startTime = Date.now();

    const columns: ResultColumn[] = [
      { name: "timestamp", type: "datetime" },
      { name: "deviceId", type: "string" },
      { name: "metric", type: "string" },
      { name: "value", type: "number" },
    ];

    const rows: ResultRow[] = [];
    const summary: ResultSummary = {
      totalRows: rows.length,
      executionTimeMs: Date.now() - startTime,
      description: `Query executed: ${query.rawText}`,
      highlights: [],
    };

    const vizType = query.parsedQuery.visualization?.type ?? "line";
    const visualization: VisualizationConfig = {
      type: vizType,
      title: query.parsedQuery.visualization?.title ?? query.rawText,
      series: [],
      axes: [
        { label: "Time", type: "time" },
        { label: "Value", type: "linear" },
      ],
    };

    const entry: QueryHistoryEntry = {
      id: crypto.randomUUID(),
      query,
      executedAt: new Date(),
      resultPreview: `${rows.length} rows returned`,
      bookmarks: false,
      tags: [],
    };
    this.history.push(entry);

    return {
      queryId: query.id,
      columns,
      rows,
      summary,
      visualization,
      suggestions: await this.generateFollowUpSuggestions(query),
    };
  }

  private async generateFollowUpSuggestions(query: NLQuery): Promise<string[]> {
    const suggestions: string[] = [];
    const intent = query.parsedQuery.intent;

    if (intent === "select" || intent === "trend") {
      suggestions.push("Show the same data grouped by hour");
      suggestions.push("Compare with the previous period");
    }
    if (intent === "aggregate") {
      suggestions.push("Show the trend over time instead");
      suggestions.push("Break down by device");
    }
    if (intent === "anomaly") {
      suggestions.push("Show root cause analysis");
      suggestions.push("Display correlated metrics");
    }
    if (intent === "forecast") {
      suggestions.push("Show confidence intervals");
      suggestions.push("Compare with actual values");
    }

    suggestions.push("Export results as CSV");
    suggestions.push("Set up an alert for this metric");

    return suggestions;
  }

  getHistory(): QueryHistoryEntry[] {
    return [...this.history];
  }

  toggleBookmark(historyId: string): boolean {
    const entry = this.history.find((h) => h.id === historyId);
    if (entry) {
      entry.bookmarks = !entry.bookmarks;
      return entry.bookmarks;
    }
    return false;
  }

  getBookmarks(): QueryHistoryEntry[] {
    return this.history.filter((h) => h.bookmarks);
  }

  searchHistory(searchText: string): QueryHistoryEntry[] {
    const lower = searchText.toLowerCase();
    return this.history.filter(
      (h) =>
        h.query.rawText.toLowerCase().includes(lower) ||
        h.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }

  clearHistory(): void {
    this.history = [];
  }
}
