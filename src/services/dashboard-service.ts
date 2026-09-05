import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type WidgetType = 'chart' | 'gauge' | 'table' | 'map' | 'status' | 'alert-list' | 'kpi';

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter';

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  widgets: Widget[];
  ownerId: string;
  shared: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  gap: number;
}

export interface Widget {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: WidgetPosition;
  refreshIntervalMs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  deviceId?: string;
  metric?: string;
  chartType?: ChartType;
  timeRange?: string;
  thresholds?: WidgetThreshold[];
  displayOptions?: Record<string, unknown>;
}

export interface WidgetThreshold {
  value: number;
  color: string;
  label: string;
}

export interface DashboardCreateInput {
  name: string;
  description?: string;
  ownerId: string;
  shared?: boolean;
  tags?: string[];
  layout?: Partial<DashboardLayout>;
}

export interface WidgetCreateInput {
  dashboardId: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position?: Partial<WidgetPosition>;
  refreshIntervalMs?: number;
}

export interface DashboardStats {
  totalDashboards: number;
  totalWidgets: number;
  avgWidgetsPerDashboard: number;
  byType: Record<WidgetType, number>;
  mostUsedWidgets: { type: WidgetType; count: number }[];
}

// ── Service ─────────────────────────────────────────────────────────────────

export class DashboardService {
  private dashboards: Map<string, Dashboard> = new Map();
  private widgetService: WidgetService;

  constructor(widgetService?: WidgetService) {
    this.widgetService = widgetService ?? new WidgetService();
  }

  create(input: DashboardCreateInput): Dashboard {
    const now = new Date();
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description ?? '',
      layout: {
        columns: input.layout?.columns ?? 12,
        rowHeight: input.layout?.rowHeight ?? 80,
        gap: input.layout?.gap ?? 16,
      },
      widgets: [],
      ownerId: input.ownerId,
      shared: input.shared ?? false,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  getById(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  getAll(filter?: { ownerId?: string; shared?: boolean; tags?: string[] }): Dashboard[] {
    let results = Array.from(this.dashboards.values());
    if (filter?.ownerId) {
      results = results.filter(d => d.ownerId === filter.ownerId);
    }
    if (filter?.shared !== undefined) {
      results = results.filter(d => d.shared === filter.shared);
    }
    if (filter?.tags?.length) {
      results = results.filter(d =>
        filter.tags!.some(t => d.tags.includes(t))
      );
    }
    return results;
  }

  update(id: string, input: Partial<DashboardCreateInput>): Dashboard | undefined {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;

    if (input.name) dashboard.name = input.name;
    if (input.description !== undefined) dashboard.description = input.description;
    if (input.shared !== undefined) dashboard.shared = input.shared;
    if (input.tags) dashboard.tags = input.tags;
    if (input.layout) {
      dashboard.layout = { ...dashboard.layout, ...input.layout };
    }
    dashboard.updatedAt = new Date();
    return dashboard;
  }

  delete(id: string): boolean {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return false;
    dashboard.widgets.forEach(w => this.widgetService.delete(w.id));
    return this.dashboards.delete(id);
  }

  duplicate(id: string, newName: string, ownerId: string): Dashboard | undefined {
    const original = this.dashboards.get(id);
    if (!original) return undefined;

    const copy = this.create({
      name: newName,
      description: original.description,
      ownerId,
      shared: false,
      tags: [...original.tags],
      layout: { ...original.layout },
    });

    original.widgets.forEach(w => {
      this.widgetService.create({
        dashboardId: copy.id,
        type: w.type,
        title: w.title,
        config: { ...w.config },
        position: { ...w.position },
        refreshIntervalMs: w.refreshIntervalMs,
      });
    });

    copy.widgets = this.widgetService.getByDashboardId(copy.id);
    return copy;
  }

  addWidget(widgetInput: WidgetCreateInput): Widget {
    const widget = this.widgetService.create(widgetInput);
    const dashboard = this.dashboards.get(widgetInput.dashboardId);
    if (dashboard) {
      dashboard.widgets.push(widget);
      dashboard.updatedAt = new Date();
    }
    return widget;
  }

  removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const index = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (index === -1) return false;

    dashboard.widgets.splice(index, 1);
    this.widgetService.delete(widgetId);
    dashboard.updatedAt = new Date();
    return true;
  }

  getStats(): DashboardStats {
    const all = Array.from(this.dashboards.values());
    const allWidgets = all.flatMap(d => d.widgets);
    const typeCount: Record<string, number> = {};

    allWidgets.forEach(w => {
      typeCount[w.type] = (typeCount[w.type] || 0) + 1;
    });

    const mostUsed = Object.entries(typeCount)
      .map(([type, count]) => ({ type: type as WidgetType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalDashboards: all.length,
      totalWidgets: allWidgets.length,
      avgWidgetsPerDashboard: all.length > 0 ? allWidgets.length / all.length : 0,
      byType: typeCount as Record<WidgetType, number>,
      mostUsedWidgets: mostUsed,
    };
  }

  count(): number {
    return this.dashboards.size;
  }

  clear(): void {
    this.dashboards.clear();
    this.widgetService.clear();
  }
}

// ── Widget Service ──────────────────────────────────────────────────────────

export class WidgetService {
  private widgets: Map<string, Widget> = new Map();

  create(input: WidgetCreateInput): Widget {
    const now = new Date();
    const widget: Widget = {
      id: crypto.randomUUID(),
      dashboardId: input.dashboardId,
      type: input.type,
      title: input.title,
      config: input.config,
      position: {
        x: input.position?.x ?? 0,
        y: input.position?.y ?? 0,
        w: input.position?.w ?? 6,
        h: input.position?.h ?? 4,
      },
      refreshIntervalMs: input.refreshIntervalMs ?? 30000,
      createdAt: now,
      updatedAt: now,
    };
    this.widgets.set(widget.id, widget);
    return widget;
  }

  getById(id: string): Widget | undefined {
    return this.widgets.get(id);
  }

  getByDashboardId(dashboardId: string): Widget[] {
    return Array.from(this.widgets.values()).filter(w => w.dashboardId === dashboardId);
  }

  getAll(filter?: { type?: WidgetType; dashboardId?: string }): Widget[] {
    let results = Array.from(this.widgets.values());
    if (filter?.type) {
      results = results.filter(w => w.type === filter.type);
    }
    if (filter?.dashboardId) {
      results = results.filter(w => w.dashboardId === filter.dashboardId);
    }
    return results;
  }

  update(id: string, input: Partial<WidgetCreateInput>): Widget | undefined {
    const widget = this.widgets.get(id);
    if (!widget) return undefined;

    if (input.title) widget.title = input.title;
    if (input.config) widget.config = { ...widget.config, ...input.config };
    if (input.position) widget.position = { ...widget.position, ...input.position };
    if (input.refreshIntervalMs) widget.refreshIntervalMs = input.refreshIntervalMs;
    widget.updatedAt = new Date();
    return widget;
  }

  delete(id: string): boolean {
    return this.widgets.delete(id);
  }

  updatePosition(id: string, position: WidgetPosition): Widget | undefined {
    const widget = this.widgets.get(id);
    if (!widget) return undefined;
    widget.position = position;
    widget.updatedAt = new Date();
    return widget;
  }

  reorder(dashboardId: string, widgetIds: string[]): void {
    const widgets = this.getByDashboardId(dashboardId);
    widgetIds.forEach((id, index) => {
      const widget = widgets.find(w => w.id === id);
      if (widget) {
        widget.position.y = Math.floor(index / 3) * 4;
        widget.position.x = (index % 3) * 4;
        widget.updatedAt = new Date();
      }
    });
  }

  count(): number {
    return this.widgets.size;
  }

  clear(): void {
    this.widgets.clear();
  }
}
