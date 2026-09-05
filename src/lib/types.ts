export interface Device {
  id: string;
  name: string;
  type: 'sensor' | 'actuator' | 'gateway' | 'camera' | 'thermostat' | 'light' | 'humidity' | 'pressure';
  status: 'online' | 'offline' | 'warning' | 'error';
  location: string;
  lastSeen: string;
  batteryLevel?: number;
  firmware: string;
  ipAddress: string;
  macAddress: string;
  sensors: SensorReading[];
  metadata: Record<string, unknown>;
}

export interface SensorReading {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  min?: number;
  max?: number;
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  value?: number;
  threshold?: number;
  metric?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string;
  metric: string;
  condition: 'greater' | 'less' | 'equal' | 'between' | 'outside';
  threshold: number | [number, number];
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  cooldownMinutes: number;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'line-chart' | 'bar-chart' | 'gauge' | 'table' | 'status' | 'kpi' | 'heatmap' | 'text';
  title: string;
  deviceId?: string;
  metric?: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  isStarred?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

export interface AIMetric {
  metric: string;
  current: number;
  predicted: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  anomalyScore: number;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  predicted?: number;
  lower?: number;
  upper?: number;
}

export interface RuleCondition {
  id: string;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'between' | 'outside';
  value: number | [number, number];
}

export interface RuleAction {
  id: string;
  type: 'alert' | 'email' | 'webhook' | 'device-control' | 'notification';
  config: Record<string, unknown>;
}
