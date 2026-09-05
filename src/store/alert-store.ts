import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

type AlertSeverity = "info" | "warning" | "critical";
type AlertStatus = "active" | "acknowledged" | "resolved" | "snoozed";

interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  deviceId: string;
  deviceName?: string;
  message: string;
  value?: number;
  threshold?: number;
  triggeredAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  snoozedUntil?: number;
}

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  severity: AlertSeverity;
  deviceId: string;
  sensorId?: string;
  condition: {
    operator: "gt" | "lt" | "eq" | "gte" | "lte" | "between";
    threshold: number | number[];
  };
  notificationChannels: string[];
  cooldown: number;
  createdAt: number;
  updatedAt: number;
  lastTriggered?: number;
  triggerCount: number;
}

interface AlertNotification {
  id: string;
  alertId: string;
  channel: "email" | "webhook" | "push" | "sms";
  status: "pending" | "sent" | "failed";
  sentAt?: number;
  error?: string;
}

interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<AlertSeverity, number>;
}

interface AlertState {
  alerts: Alert[];
  rules: AlertRule[];
  notifications: AlertNotification[];
  stats: AlertStats;
  isLoading: boolean;
  error: string | null;
  filters: {
    severity: AlertSeverity[];
    status: AlertStatus[];
    deviceId?: string;
    search: string;
  };
  soundEnabled: boolean;
  desktopNotifications: boolean;
  maxAlerts: number;

  addAlert: (alert: Omit<Alert, "id" | "triggeredAt" | "status">) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
  acknowledgeAlert: (id: string, userId: string) => void;
  resolveAlert: (id: string) => void;
  snoozeAlert: (id: string, duration: number) => void;
  clearAlerts: (status?: AlertStatus) => void;
  addRule: (rule: Omit<AlertRule, "id" | "createdAt" | "updatedAt" | "triggerCount">) => void;
  updateRule: (id: string, updates: Partial<AlertRule>) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string) => void;
  addNotification: (notification: Omit<AlertNotification, "id">) => void;
  updateNotification: (id: string, updates: Partial<AlertNotification>) => void;
  setFilters: (filters: Partial<AlertState["filters"]>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDesktopNotifications: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getFilteredAlerts: () => Alert[];
  getAlertsByDevice: (deviceId: string) => Alert[];
  getActiveAlertCount: () => number;
  getUnacknowledgedAlerts: () => Alert[];
}

export const useAlertStore = create<AlertState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      alerts: [],
      rules: [],
      notifications: [],
      stats: {
        total: 0,
        active: 0,
        acknowledged: 0,
        resolved: 0,
        bySeverity: { info: 0, warning: 0, critical: 0 },
      },
      isLoading: false,
      error: null,
      filters: {
        severity: [],
        status: [],
        search: "",
      },
      soundEnabled: true,
      desktopNotifications: true,
      maxAlerts: 500,

      addAlert: (alertData) =>
        set((state) => {
          const id = `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
          const newAlert: Alert = {
            ...alertData,
            id,
            status: "active",
            triggeredAt: Date.now(),
          };

          const alerts = [newAlert, ...state.alerts].slice(0, state.maxAlerts);

          const stats = calculateStats(alerts);

          return { alerts, stats };
        }),

      updateAlert: (id, updates) =>
        set((state) => {
          const alerts = state.alerts.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          );
          return { alerts, stats: calculateStats(alerts) };
        }),

      removeAlert: (id) =>
        set((state) => {
          const alerts = state.alerts.filter((a) => a.id !== id);
          return { alerts, stats: calculateStats(alerts) };
        }),

      acknowledgeAlert: (id, userId) =>
        set((state) => {
          const alerts = state.alerts.map((a) =>
            a.id === id
              ? { ...a, status: "acknowledged" as const, acknowledgedAt: Date.now(), acknowledgedBy: userId }
              : a
          );
          return { alerts, stats: calculateStats(alerts) };
        }),

      resolveAlert: (id) =>
        set((state) => {
          const alerts = state.alerts.map((a) =>
            a.id === id
              ? { ...a, status: "resolved" as const, resolvedAt: Date.now() }
              : a
          );
          return { alerts, stats: calculateStats(alerts) };
        }),

      snoozeAlert: (id, duration) =>
        set((state) => {
          const alerts = state.alerts.map((a) =>
            a.id === id
              ? { ...a, status: "snoozed" as const, snoozedUntil: Date.now() + duration }
              : a
          );
          return { alerts, stats: calculateStats(alerts) };
        }),

      clearAlerts: (status) =>
        set((state) => {
          const alerts = status
            ? state.alerts.filter((a) => a.status !== status)
            : [];
          return { alerts, stats: calculateStats(alerts) };
        }),

      addRule: (ruleData) =>
        set((state) => {
          const id = `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
          const newRule: AlertRule = {
            ...ruleData,
            id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            triggerCount: 0,
          };
          return { rules: [...state.rules, newRule] };
        }),

      updateRule: (id, updates) =>
        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
          ),
        })),

      removeRule: (id) =>
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id),
        })),

      toggleRule: (id) =>
        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled, updatedAt: Date.now() } : r
          ),
        })),

      addNotification: (notificationData) =>
        set((state) => {
          const id = `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
          return {
            notifications: [...state.notifications, { ...notificationData, id }],
          };
        }),

      updateNotification: (id, updates) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        })),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setDesktopNotifications: (desktopNotifications) => set({ desktopNotifications }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      getFilteredAlerts: () => {
        const { alerts, filters } = get();
        let filtered = [...alerts];

        if (filters.severity.length > 0) {
          filtered = filtered.filter((a) => filters.severity.includes(a.severity));
        }

        if (filters.status.length > 0) {
          filtered = filtered.filter((a) => filters.status.includes(a.status));
        }

        if (filters.deviceId) {
          filtered = filtered.filter((a) => a.deviceId === filters.deviceId);
        }

        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            (a) =>
              a.name.toLowerCase().includes(search) ||
              a.message.toLowerCase().includes(search)
          );
        }

        return filtered;
      },

      getAlertsByDevice: (deviceId) =>
        get().alerts.filter((a) => a.deviceId === deviceId),

      getActiveAlertCount: () =>
        get().alerts.filter((a) => a.status === "active").length,

      getUnacknowledgedAlerts: () =>
        get().alerts.filter((a) => a.status === "active" && !a.acknowledgedAt),
    })),
    { name: "AlertStore" }
  )
);

function calculateStats(alerts: Alert[]): AlertStats {
  const stats: AlertStats = {
    total: alerts.length,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    bySeverity: { info: 0, warning: 0, critical: 0 },
  };

  for (const alert of alerts) {
    if (alert.status === "active") stats.active++;
    if (alert.status === "acknowledged") stats.acknowledged++;
    if (alert.status === "resolved") stats.resolved++;
    stats.bySeverity[alert.severity]++;
  }

  return stats;
}
