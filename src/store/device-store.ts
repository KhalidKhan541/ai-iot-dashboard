import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

type DeviceStatus = "online" | "offline" | "error" | "maintenance";

interface Device {
  id: string;
  name: string;
  type: string;
  status: DeviceStatus;
  groupId?: string;
  location?: string;
  lastSeen?: number;
  sensors: Array<{
    id: string;
    name: string;
    type: string;
    unit: string;
  }>;
  metadata?: Record<string, unknown>;
}

interface SensorData {
  deviceId: string;
  sensorId: string;
  value: number;
  unit: string;
  timestamp: number;
  quality?: "good" | "uncertain" | "bad";
}

interface DeviceAlert {
  id: string;
  deviceId: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

interface DeviceState {
  devices: Device[];
  selectedDeviceId: string | null;
  sensorData: Map<string, SensorData[]>;
  alerts: DeviceAlert[];
  connectionStatus: "connected" | "disconnected" | "connecting";
  isLoading: boolean;
  error: string | null;
  filters: {
    status: DeviceStatus[];
    type: string[];
    search: string;
    groupId?: string;
  };
  sortBy: "name" | "status" | "lastSeen";
  sortOrder: "asc" | "desc";
  maxDataPoints: number;

  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  selectDevice: (id: string | null) => void;
  updateSensorData: (data: SensorData) => void;
  batchUpdateSensorData: (data: SensorData[]) => void;
  clearSensorData: (deviceId: string) => void;
  addAlert: (alert: DeviceAlert) => void;
  acknowledgeAlert: (id: string) => void;
  removeAlert: (id: string) => void;
  clearAlerts: (deviceId?: string) => void;
  setConnectionStatus: (status: DeviceState["connectionStatus"]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<DeviceState["filters"]>) => void;
  setSorting: (sortBy: DeviceState["sortBy"], sortOrder: DeviceState["sortOrder"]) => void;
  getFilteredDevices: () => Device[];
  getDeviceById: (id: string) => Device | undefined;
  getDeviceSensorData: (deviceId: string, sensorId?: string) => SensorData[];
  getDeviceAlerts: (deviceId: string) => DeviceAlert[];
  getDeviceStatusCounts: () => Record<DeviceStatus, number>;
}

const MAX_DATA_POINTS = 500;

export const useDeviceStore = create<DeviceState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      devices: [],
      selectedDeviceId: null,
      sensorData: new Map<string, SensorData[]>(),
      alerts: [],
      connectionStatus: "disconnected",
      isLoading: false,
      error: null,
      filters: {
        status: [],
        type: [],
        search: "",
      },
      sortBy: "name",
      sortOrder: "asc",
      maxDataPoints: MAX_DATA_POINTS,

      setDevices: (devices) => set({ devices }),

      addDevice: (device) =>
        set((state) => ({
          devices: [...state.devices, device],
        })),

      updateDevice: (id, updates) =>
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      removeDevice: (id) =>
        set((state) => {
          const newSensorData = new Map(state.sensorData);
          newSensorData.delete(id);
          return {
            devices: state.devices.filter((d) => d.id !== id),
            sensorData: newSensorData,
            alerts: state.alerts.filter((a) => a.deviceId !== id),
            selectedDeviceId:
              state.selectedDeviceId === id ? null : state.selectedDeviceId,
          };
        }),

      selectDevice: (id) => set({ selectedDeviceId: id }),

      updateSensorData: (data) =>
        set((state) => {
          const key = `${data.deviceId}:${data.sensorId}`;
          const existing = state.sensorData.get(key) ?? [];
          const updated = [...existing, data].slice(-state.maxDataPoints);
          const newSensorData = new Map(state.sensorData);
          newSensorData.set(key, updated);
          return { sensorData: newSensorData };
        }),

      batchUpdateSensorData: (dataPoints) =>
        set((state) => {
          const newSensorData = new Map(state.sensorData);
          for (const data of dataPoints) {
            const key = `${data.deviceId}:${data.sensorId}`;
            const existing = newSensorData.get(key) ?? [];
            const updated = [...existing, data].slice(-state.maxDataPoints);
            newSensorData.set(key, updated);
          }
          return { sensorData: newSensorData };
        }),

      clearSensorData: (deviceId) =>
        set((state) => {
          const newSensorData = new Map(state.sensorData);
          for (const key of newSensorData.keys()) {
            if (key.startsWith(`${deviceId}:`)) {
              newSensorData.delete(key);
            }
          }
          return { sensorData: newSensorData };
        }),

      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 100),
        })),

      acknowledgeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, acknowledged: true } : a
          ),
        })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      clearAlerts: (deviceId) =>
        set((state) => ({
          alerts: deviceId
            ? state.alerts.filter((a) => a.deviceId !== deviceId)
            : [],
        })),

      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

      getFilteredDevices: () => {
        const { devices, filters, sortBy, sortOrder } = get();
        let filtered = [...devices];

        if (filters.status.length > 0) {
          filtered = filtered.filter((d) => filters.status.includes(d.status));
        }

        if (filters.type.length > 0) {
          filtered = filtered.filter((d) => filters.type.includes(d.type));
        }

        if (filters.groupId) {
          filtered = filtered.filter((d) => d.groupId === filters.groupId);
        }

        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            (d) =>
              d.name.toLowerCase().includes(search) ||
              d.id.toLowerCase().includes(search) ||
              d.type.toLowerCase().includes(search)
          );
        }

        filtered.sort((a, b) => {
          let cmp = 0;
          switch (sortBy) {
            case "name":
              cmp = a.name.localeCompare(b.name);
              break;
            case "status": {
              const order: Record<DeviceStatus, number> = {
                online: 0,
                maintenance: 1,
                error: 2,
                offline: 3,
              };
              cmp = order[a.status] - order[b.status];
              break;
            }
            case "lastSeen":
              cmp = (b.lastSeen ?? 0) - (a.lastSeen ?? 0);
              break;
          }
          return sortOrder === "asc" ? cmp : -cmp;
        });

        return filtered;
      },

      getDeviceById: (id) => get().devices.find((d) => d.id === id),

      getDeviceSensorData: (deviceId, sensorId) => {
        const { sensorData } = get();
        const result: SensorData[] = [];

        for (const [key, data] of sensorData) {
          if (key.startsWith(`${deviceId}:`)) {
            if (!sensorId || key === `${deviceId}:${sensorId}`) {
              result.push(...data);
            }
          }
        }

        return result.sort((a, b) => a.timestamp - b.timestamp);
      },

      getDeviceAlerts: (deviceId) =>
        get().alerts.filter((a) => a.deviceId === deviceId),

      getDeviceStatusCounts: () => {
        const { devices } = get();
        const counts: Record<DeviceStatus, number> = {
          online: 0,
          offline: 0,
          error: 0,
          maintenance: 0,
        };
        for (const device of devices) {
          counts[device.status]++;
        }
        return counts;
      },
    })),
    { name: "DeviceStore" }
  )
);
