export type DeviceType =
  | "temperature_sensor"
  | "humidity_sensor"
  | "pressure_sensor"
  | "motion_sensor"
  | "light_sensor"
  | "air_quality_sensor"
  | "water_flow_sensor"
  | "power_meter"
  | "gateway"
  | "actuator"
  | "camera"
  | "generic";

export type DeviceStatus = "online" | "offline" | "error" | "maintenance" | "provisioning";

export type DataPointType = "gauge" | "counter" | "histogram" | "state" | "binary";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  description?: string;
  groupId?: string;
  location?: DeviceLocation;
  firmware?: DeviceFirmware;
  connectivity: DeviceConnectivity;
  sensors: Sensor[];
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface DeviceLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  building?: string;
  floor?: number;
  zone?: string;
}

export interface DeviceFirmware {
  version: string;
  lastUpdated?: Date;
  availableVersion?: string;
  updateStatus?: "up_to_date" | "update_available" | "updating" | "failed";
}

export interface DeviceConnectivity {
  protocol: "mqtt" | "http" | "websocket" | "coap" | "lorawan" | "zigbee" | "bluetooth";
  signalStrength?: number;
  rssi?: number;
  lastPing?: number;
  latency?: number;
  connectionUptime?: number;
}

export interface Sensor {
  id: string;
  name: string;
  type: DataPointType;
  unit: string;
  minValue?: number;
  maxValue?: number;
  accuracy?: number;
  resolution?: number;
  calibrationDate?: Date;
  lastReading?: SensorReading;
}

export interface SensorReading {
  sensorId: string;
  value: number;
  unit: string;
  timestamp: Date;
  quality: "good" | "uncertain" | "bad";
  metadata?: Record<string, unknown>;
}

export interface DeviceDataPoint {
  deviceId: string;
  sensorId: string;
  timestamp: number;
  value: number;
  unit: string;
  quality?: "good" | "uncertain" | "bad";
  metadata?: Record<string, unknown>;
}

export interface DeviceCommand {
  id: string;
  deviceId: string;
  command: string;
  parameters?: Record<string, unknown>;
  status: "pending" | "sent" | "acknowledged" | "executing" | "completed" | "failed" | "timeout";
  result?: unknown;
  createdAt: Date;
  executedAt?: Date;
  timeout?: number;
}

export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  deviceIds: string[];
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceTemplate {
  id: string;
  name: string;
  type: DeviceType;
  description?: string;
  sensors: Omit<Sensor, "id">[];
  defaultConfig?: Record<string, unknown>;
  icon?: string;
}

export interface DeviceStats {
  deviceId: string;
  uptime: number;
  dataPointsReceived: number;
  averageLatency: number;
  errorCount: number;
  lastRestart?: Date;
}

export interface DeviceEvent {
  id: string;
  deviceId: string;
  eventType: "connection" | "disconnection" | "data" | "alert" | "firmware" | "config" | "error";
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  severity: "info" | "warning" | "error";
}

export interface DeviceFilter {
  status?: DeviceStatus[];
  type?: DeviceType[];
  groupId?: string;
  search?: string;
  tags?: string[];
  lastSeenAfter?: Date;
  lastSeenBefore?: Date;
}

export interface DeviceSortOptions {
  field: "name" | "status" | "type" | "lastSeen" | "createdAt";
  direction: "asc" | "desc";
}

export interface PaginatedDevices {
  devices: Device[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
