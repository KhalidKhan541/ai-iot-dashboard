import { create } from 'zustand';
import { Device, Alert, AlertRule, Dashboard, DashboardWidget, Notification } from '@/lib/types';
import { mockDevices, mockAlerts, mockAlertRules, mockDashboards, mockNotifications } from '@/lib/mock-data';
import { generateId } from '@/lib/utils';

interface AppState {
  devices: Device[];
  alerts: Alert[];
  alertRules: AlertRule[];
  dashboards: Dashboard[];
  notifications: Notification[];
  sidebarOpen: boolean;
  darkMode: boolean;
  currentDashboard: string | null;
  selectedDevice: string | null;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setDarkMode: (dark: boolean) => void;
  setCurrentDashboard: (id: string | null) => void;
  setSelectedDevice: (id: string | null) => void;

  addDevice: (device: Device) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  removeDevice: (id: string) => void;

  acknowledgeAlert: (id: string) => void;
  addAlert: (alert: Alert) => void;

  addAlertRule: (rule: AlertRule) => void;
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  removeAlertRule: (id: string) => void;
  toggleAlertRule: (id: string) => void;

  addDashboard: (dashboard: Dashboard) => void;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  removeDashboard: (id: string) => void;
  addWidget: (dashboardId: string, widget: DashboardWidget) => void;
  updateWidget: (dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>) => void;
  removeWidget: (dashboardId: string, widgetId: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  devices: mockDevices,
  alerts: mockAlerts,
  alertRules: mockAlertRules,
  dashboards: mockDashboards,
  notifications: mockNotifications,
  sidebarOpen: true,
  darkMode: false,
  currentDashboard: null,
  selectedDevice: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setDarkMode: (dark) => set({ darkMode: dark }),
  setCurrentDashboard: (id) => set({ currentDashboard: id }),
  setSelectedDevice: (id) => set({ selectedDevice: id }),

  addDevice: (device) =>
    set((state) => ({
      devices: [...state.devices, device],
    })),
  updateDevice: (id, updates) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDevice: (id) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
    })),

  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      ),
    })),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
    })),

  addAlertRule: (rule) =>
    set((state) => ({
      alertRules: [...state.alertRules, rule],
    })),
  updateAlertRule: (id, updates) =>
    set((state) => ({
      alertRules: state.alertRules.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),
  removeAlertRule: (id) =>
    set((state) => ({
      alertRules: state.alertRules.filter((r) => r.id !== id),
    })),
  toggleAlertRule: (id) =>
    set((state) => ({
      alertRules: state.alertRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    })),

  addDashboard: (dashboard) =>
    set((state) => ({
      dashboards: [...state.dashboards, dashboard],
    })),
  updateDashboard: (id, updates) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),
  removeDashboard: (id) =>
    set((state) => ({
      dashboards: state.dashboards.filter((d) => d.id !== id),
    })),
  addWidget: (dashboardId, widget) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, widgets: [...d.widgets, widget] }
          : d
      ),
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
            }
          : d
      ),
    })),
  removeWidget: (dashboardId, widgetId) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, widgets: d.widgets.filter((w) => w.id !== widgetId) }
          : d
      ),
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
