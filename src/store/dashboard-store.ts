import { create } from "zustand";
import { devtools } from "zustand/middleware";

type WidgetType =
  | "line_chart"
  | "bar_chart"
  | "pie_chart"
  | "gauge"
  | "stat_card"
  | "table"
  | "map"
  | "timeline"
  | "text"
  | "alert_list"
  | "device_list";

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, unknown>;
  dataSource: {
    type: "device" | "api" | "static";
    deviceId?: string;
    sensorIds?: string[];
    apiUrl?: string;
  };
  refreshInterval?: number;
  isVisible: boolean;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: "grid" | "freeform";
  widgets: Widget[];
  isDefault: boolean;
  isPublic: boolean;
  refreshInterval: number;
  createdAt: number;
  updatedAt: number;
}

interface DashboardState {
  dashboards: Dashboard[];
  currentDashboardId: string | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  selectedWidgetIds: string[];
  isDragging: boolean;
  hasUnsavedChanges: boolean;
  timeRange: {
    start: Date;
    end: Date;
  };
  refreshInterval: number;

  setDashboards: (dashboards: Dashboard[]) => void;
  addDashboard: (dashboard: Dashboard) => void;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  removeDashboard: (id: string) => void;
  setCurrentDashboard: (id: string | null) => void;
  getCurrentDashboard: () => Dashboard | undefined;
  addWidget: (dashboardId: string, widget: Widget) => void;
  updateWidget: (dashboardId: string, widgetId: string, updates: Partial<Widget>) => void;
  removeWidget: (dashboardId: string, widgetId: string) => void;
  moveWidget: (dashboardId: string, widgetId: string, position: { x: number; y: number }) => void;
  resizeWidget: (dashboardId: string, widgetId: string, size: { width: number; height: number }) => void;
  duplicateWidget: (dashboardId: string, widgetId: string) => void;
  selectWidget: (widgetId: string, multi?: boolean) => void;
  clearSelection: () => void;
  setEditing: (editing: boolean) => void;
  setDragging: (dragging: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setTimeRange: (start: Date, end: Date) => void;
  setRefreshInterval: (interval: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getWidgetsByType: (type: WidgetType) => Widget[];
  getWidgetById: (dashboardId: string, widgetId: string) => Widget | undefined;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      dashboards: [],
      currentDashboardId: null,
      isLoading: false,
      error: null,
      isEditing: false,
      selectedWidgetIds: [],
      isDragging: false,
      hasUnsavedChanges: false,
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      refreshInterval: 30000,

      setDashboards: (dashboards) => set({ dashboards }),

      addDashboard: (dashboard) =>
        set((state) => ({
          dashboards: [...state.dashboards, dashboard],
        })),

      updateDashboard: (id, updates) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
          ),
          hasUnsavedChanges: true,
        })),

      removeDashboard: (id) =>
        set((state) => ({
          dashboards: state.dashboards.filter((d) => d.id !== id),
          currentDashboardId:
            state.currentDashboardId === id ? null : state.currentDashboardId,
        })),

      setCurrentDashboard: (id) => set({ currentDashboardId: id }),

      getCurrentDashboard: () => {
        const { dashboards, currentDashboardId } = get();
        return dashboards.find((d) => d.id === currentDashboardId);
      },

      addWidget: (dashboardId, widget) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? { ...d, widgets: [...d.widgets, widget], updatedAt: Date.now() }
              : d
          ),
          hasUnsavedChanges: true,
        })),

      updateWidget: (dashboardId, widgetId, updates) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.map((w) =>
                    w.id === widgetId ? { ...w, ...updates } : w
                  ),
                  updatedAt: Date.now(),
                }
              : d
          ),
          hasUnsavedChanges: true,
        })),

      removeWidget: (dashboardId, widgetId) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.filter((w) => w.id !== widgetId),
                  updatedAt: Date.now(),
                }
              : d
          ),
          selectedWidgetIds: state.selectedWidgetIds.filter(
            (id) => id !== widgetId
          ),
          hasUnsavedChanges: true,
        })),

      moveWidget: (dashboardId, widgetId, position) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.map((w) =>
                    w.id === widgetId ? { ...w, position } : w
                  ),
                  updatedAt: Date.now(),
                }
              : d
          ),
          hasUnsavedChanges: true,
        })),

      resizeWidget: (dashboardId, widgetId, size) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.map((w) =>
                    w.id === widgetId ? { ...w, size } : w
                  ),
                  updatedAt: Date.now(),
                }
              : d
          ),
          hasUnsavedChanges: true,
        })),

      duplicateWidget: (dashboardId, widgetId) => {
        const { dashboards } = get();
        const dashboard = dashboards.find((d) => d.id === dashboardId);
        const widget = dashboard?.widgets.find((w) => w.id === widgetId);

        if (!widget) return;

        const newWidget: Widget = {
          ...widget,
          id: `widget_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          title: `${widget.title} (Copy)`,
          position: {
            x: widget.position.x + 20,
            y: widget.position.y + 20,
          },
        };

        get().addWidget(dashboardId, newWidget);
      },

      selectWidget: (widgetId, multi = false) =>
        set((state) => {
          if (multi) {
            const isSelected = state.selectedWidgetIds.includes(widgetId);
            return {
              selectedWidgetIds: isSelected
                ? state.selectedWidgetIds.filter((id) => id !== widgetId)
                : [...state.selectedWidgetIds, widgetId],
            };
          }
          return { selectedWidgetIds: [widgetId] };
        }),

      clearSelection: () => set({ selectedWidgetIds: [] }),

      setEditing: (isEditing) => set({ isEditing }),

      setDragging: (isDragging) => set({ isDragging }),

      setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),

      setTimeRange: (start, end) =>
        set({ timeRange: { start, end }, hasUnsavedChanges: true }),

      setRefreshInterval: (refreshInterval) =>
        set({ refreshInterval, hasUnsavedChanges: true }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      getWidgetsByType: (type) => {
        const { dashboards, currentDashboardId } = get();
        const dashboard = dashboards.find((d) => d.id === currentDashboardId);
        return dashboard?.widgets.filter((w) => w.type === type) ?? [];
      },

      getWidgetById: (dashboardId, widgetId) => {
        const { dashboards } = get();
        const dashboard = dashboards.find((d) => d.id === dashboardId);
        return dashboard?.widgets.find((w) => w.id === widgetId);
      },
    })),
    { name: "DashboardStore" }
  )
);
