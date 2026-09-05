import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type DeviceStatus = 'online' | 'offline' | 'warning' | 'error';

export type DeviceType = 'sensor' | 'actuator' | 'gateway' | 'controller';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  location: string;
  lastSeen: Date;
  firmware: string;
  batteryLevel?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceCreateInput {
  name: string;
  type: DeviceType;
  location: string;
  firmware: string;
  batteryLevel?: number;
  metadata?: Record<string, unknown>;
}

export interface DeviceUpdateInput {
  name?: string;
  status?: DeviceStatus;
  location?: string;
  firmware?: string;
  batteryLevel?: number;
  metadata?: Record<string, unknown>;
}

export interface DeviceFilter {
  status?: DeviceStatus[];
  type?: DeviceType[];
  location?: string;
  search?: string;
  batteryLow?: boolean;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  warning: number;
  error: number;
  avgBatteryLevel: number;
  byType: Record<DeviceType, number>;
  byLocation: Record<string, number>;
}

// ── Validation Schemas ──────────────────────────────────────────────────────

export const deviceCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['sensor', 'actuator', 'gateway', 'controller']),
  location: z.string().min(1).max(200),
  firmware: z.string().min(1),
  batteryLevel: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const deviceUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['online', 'offline', 'warning', 'error']).optional(),
  location: z.string().min(1).max(200).optional(),
  firmware: z.string().min(1).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ── Service ─────────────────────────────────────────────────────────────────

export class DeviceService {
  private devices: Map<string, Device> = new Map();

  constructor(initialDevices: Device[] = []) {
    initialDevices.forEach(d => this.devices.set(d.id, d));
  }

  create(input: DeviceCreateInput): Device {
    const validated = deviceCreateSchema.parse(input);
    const now = new Date();
    const device: Device = {
      id: crypto.randomUUID(),
      ...validated,
      status: 'offline',
      lastSeen: now,
      metadata: validated.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.devices.set(device.id, device);
    return device;
  }

  getById(id: string): Device | undefined {
    return this.devices.get(id);
  }

  getAll(filter?: DeviceFilter): Device[] {
    let results = Array.from(this.devices.values());

    if (filter) {
      if (filter.status?.length) {
        results = results.filter(d => filter.status!.includes(d.status));
      }
      if (filter.type?.length) {
        results = results.filter(d => filter.type!.includes(d.type));
      }
      if (filter.location) {
        results = results.filter(d =>
          d.location.toLowerCase().includes(filter.location!.toLowerCase())
        );
      }
      if (filter.search) {
        const search = filter.search.toLowerCase();
        results = results.filter(
          d =>
            d.name.toLowerCase().includes(search) ||
            d.id.toLowerCase().includes(search)
        );
      }
      if (filter.batteryLow) {
        results = results.filter(d => d.batteryLevel !== undefined && d.batteryLevel < 20);
      }
    }

    return results;
  }

  update(id: string, input: DeviceUpdateInput): Device | undefined {
    const device = this.devices.get(id);
    if (!device) return undefined;

    const validated = deviceUpdateSchema.parse(input);
    const updated: Device = {
      ...device,
      ...validated,
      metadata: { ...device.metadata, ...(validated.metadata ?? {}) },
      updatedAt: new Date(),
    };
    this.devices.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.devices.delete(id);
  }

  updateStatus(id: string, status: DeviceStatus): Device | undefined {
    return this.update(id, { status });
  }

  recordHeartbeat(id: string): Device | undefined {
    const device = this.devices.get(id);
    if (!device) return undefined;
    return this.update(id, { status: 'online' });
  }

  getStats(): DeviceStats {
    const all = Array.from(this.devices.values());
    const byType: Record<string, number> = {};
    const byLocation: Record<string, number> = {};
    let batterySum = 0;
    let batteryCount = 0;

    all.forEach(d => {
      byType[d.type] = (byType[d.type] || 0) + 1;
      byLocation[d.location] = (byLocation[d.location] || 0) + 1;
      if (d.batteryLevel !== undefined) {
        batterySum += d.batteryLevel;
        batteryCount++;
      }
    });

    return {
      total: all.length,
      online: all.filter(d => d.status === 'online').length,
      offline: all.filter(d => d.status === 'offline').length,
      warning: all.filter(d => d.status === 'warning').length,
      error: all.filter(d => d.status === 'error').length,
      avgBatteryLevel: batteryCount > 0 ? batterySum / batteryCount : 0,
      byType: byType as Record<DeviceType, number>,
      byLocation,
    };
  }

  getStaleDevices(thresholdMs: number = 5 * 60 * 1000): Device[] {
    const now = Date.now();
    return Array.from(this.devices.values()).filter(
      d => now - d.lastSeen.getTime() > thresholdMs
    );
  }

  count(): number {
    return this.devices.size;
  }

  clear(): void {
    this.devices.clear();
  }
}
