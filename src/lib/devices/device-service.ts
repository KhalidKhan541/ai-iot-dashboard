// =============================================================================
// DEVICE SERVICE - Device Management, Provisioning, Groups & Health
// =============================================================================
// Complete device lifecycle management including registration, provisioning,
// health monitoring, group management, and firmware tracking.
// =============================================================================

import { randomBytes, createHash, createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  Device,
  DeviceGroup,
  DeviceStatus,
  DeviceCategory,
  DeviceProvisioningInfo,
  DeviceFirmware,
  DeviceHealth,
  DeviceLocation,
  DeviceCapability,
  DeviceTypeDefinition,
  ProtocolConfig,
  Protocol,
  DataFormat,
  CapabilityType,
  getDeviceRegistry,
} from './device-registry';

// -----------------------------------------------------------------------------
// Event Types
// -----------------------------------------------------------------------------

export enum DeviceEvent {
  REGISTERED = 'device.registered',
  UPDATED = 'device.updated',
  DELETED = 'device.deleted',
  ONLINE = 'device.online',
  OFFLINE = 'device.offline',
  STATUS_CHANGED = 'device.status_changed',
  FIRMWARE_UPDATE = 'device.firmware_update',
  HEALTH_ALERT = 'device.health_alert',
  PROVISIONED = 'device.provisioned',
  GROUP_ADDED = 'device.group_added',
  GROUP_REMOVED = 'device.group_removed',
}

export interface DeviceEventPayload {
  event: DeviceEvent;
  deviceId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  userId?: string;
}

// -----------------------------------------------------------------------------
// Service Configuration
// -----------------------------------------------------------------------------

export interface DeviceServiceConfig {
  maxDevices: number;
  healthCheckInterval: number; // ms
  offlineThreshold: number; // ms since last heartbeat
  warningThreshold: number; // ms since last heartbeat
  maxGroupsPerDevice: number;
  maxTagsPerDevice: number;
  maxCapabilitiesPerDevice: number;
  provisioningKeyExpiry: number; // ms
  provisioningKeyPrefix: string;
  healthScoreThresholds: {
    critical: number;
    warning: number;
    good: number;
  };
}

const DEFAULT_CONFIG: DeviceServiceConfig = {
  maxDevices: 100000,
  healthCheckInterval: 30000,
  offlineThreshold: 300000, // 5 minutes
  warningThreshold: 120000, // 2 minutes
  maxGroupsPerDevice: 20,
  maxTagsPerDevice: 30,
  maxCapabilitiesPerDevice: 50,
  provisioningKeyExpiry: 86400000, // 24 hours
  provisioningKeyPrefix: 'dk_',
  healthScoreThresholds: {
    critical: 30,
    warning: 60,
    good: 85,
  },
};

// -----------------------------------------------------------------------------
// Service Errors
// -----------------------------------------------------------------------------

export class DeviceServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DeviceServiceError';
  }
}

export const ERROR_CODES = {
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_EXISTS: 'DEVICE_EXISTS',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  GROUP_EXISTS: 'GROUP_EXISTS',
  INVALID_DEVICE_TYPE: 'INVALID_DEVICE_TYPE',
  INVALID_PROTOCOL: 'INVALID_PROTOCOL',
  MAX_DEVICES_REACHED: 'MAX_DEVICES_REACHED',
  MAX_CAPABILITIES_REACHED: 'MAX_CAPABILITIES_REACHED',
  MAX_TAGS_REACHED: 'MAX_TAGS_REACHED',
  MAX_GROUPS_REACHED: 'MAX_GROUPS_REACHED',
  INVALID_CAPABILITY: 'INVALID_CAPABILITY',
  INVALID_CONFIG: 'INVALID_CONFIG',
  PROVISIONING_FAILED: 'PROVISIONING_FAILED',
  FIRMWARE_UPDATE_FAILED: 'FIRMWARE_UPDATE_FAILED',
  DEVICE_SUSPENDED: 'DEVICE_SUSPENDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

// -----------------------------------------------------------------------------
// Input Types
// -----------------------------------------------------------------------------

export interface RegisterDeviceInput {
  name: string;
  displayName?: string;
  description?: string;
  deviceTypeId: string;
  serialNumber?: string;
  macAddress?: string;
  ipAddress?: string;
  location?: Partial<DeviceLocation>;
  capabilities?: string[];
  protocolConfigs?: Partial<ProtocolConfig>[];
  groups?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface UpdateDeviceInput {
  name?: string;
  displayName?: string;
  description?: string;
  location?: Partial<DeviceLocation>;
  tags?: string[];
  metadata?: Record<string, unknown>;
  updatedBy: string;
}

export interface DeviceFilter {
  status?: DeviceStatus | DeviceStatus[];
  category?: DeviceCategory | DeviceCategory[];
  deviceTypeId?: string | string[];
  groups?: string[];
  tags?: string[];
  search?: string;
  lastSeenAfter?: Date;
  lastSeenBefore?: Date;
  healthScoreMin?: number;
  healthScoreMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface DeviceGroupInput {
  name: string;
  description?: string;
  parentId?: string;
  deviceTypeIds?: string[];
  deviceIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Device Service
// -----------------------------------------------------------------------------

export class DeviceService {
  private devices: Map<string, Device> = new Map();
  private groups: Map<string, DeviceGroup> = new Map();
  private deviceIndex: Map<string, Set<string>> = new Map(); // tag -> deviceIds
  private groupIndex: Map<string, Set<string>> = new Map(); // groupId -> deviceIds
  private eventLog: DeviceEventPayload[] = [];
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private registry = getDeviceRegistry();
  private config: DeviceServiceConfig;

  constructor(config: Partial<DeviceServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startHealthCheck();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private runHealthChecks(): void {
    const now = Date.now();
    for (const device of this.devices.values()) {
      const timeSinceLastSeen = now - device.health.lastSeen.getTime();
      const previousStatus = device.health.status;

      if (timeSinceLastSeen > this.config.offlineThreshold) {
        if (device.health.status === DeviceStatus.ONLINE) {
          device.health.status = DeviceStatus.OFFLINE;
          this.emitEvent(DeviceEvent.STATUS_CHANGED, device.id, {
            previousStatus,
            currentStatus: DeviceStatus.OFFLINE,
            reason: 'heartbeat_timeout',
          });
          this.emitEvent(DeviceEvent.OFFLINE, device.id, {
            lastSeen: device.health.lastSeen,
            offlineDuration: timeSinceLastSeen,
          });
        }
      } else if (timeSinceLastSeen > this.config.warningThreshold) {
        if (device.health.status === DeviceStatus.ONLINE) {
          this.emitEvent(DeviceEvent.HEALTH_ALERT, device.id, {
            type: 'warning',
            message: 'Device heartbeat delayed',
            lastSeen: device.health.lastSeen,
            delay: timeSinceLastSeen,
          });
        }
      }

      device.health.healthScore = this.calculateHealthScore(device);
      device.updatedAt = new Date();
    }
  }

  // -------------------------------------------------------------------------
  // Device Registration
  // -------------------------------------------------------------------------

  async registerDevice(input: RegisterDeviceInput): Promise<Device> {
    if (this.devices.size >= this.config.maxDevices) {
      throw new DeviceServiceError(
        'Maximum device limit reached',
        ERROR_CODES.MAX_DEVICES_REACHED,
        429
      );
    }

    const deviceType = this.registry.getDeviceType(input.deviceTypeId);
    if (!deviceType) {
      throw new DeviceServiceError(
        `Invalid device type: ${input.deviceTypeId}`,
        ERROR_CODES.INVALID_DEVICE_TYPE,
        400
      );
    }

    if (input.serialNumber) {
      const existing = this.findBySerialNumber(input.serialNumber);
      if (existing) {
        throw new DeviceServiceError(
          `Device with serial number ${input.serialNumber} already exists`,
          ERROR_CODES.DEVICE_EXISTS,
          409
        );
      }
    }

    const serialNumber = input.serialNumber || this.registry.generateSerialNumber();
    const provisioning = this.createProvisioningInfo();
    const capabilities = this.buildCapabilities(input.capabilities || [], deviceType);
    const protocolConfigs = this.buildProtocolConfigs(input.protocolConfigs || [], deviceType);

    const now = new Date();
    const device: Device = {
      id: uuidv4(),
      name: input.name,
      displayName: input.displayName || input.name,
      description: input.description || '',
      deviceTypeId: input.deviceTypeId,
      category: deviceType.category,
      status: DeviceStatus.PROVISIONING,
      serialNumber,
      macAddress: input.macAddress || this.registry.generateMacAddress(),
      ipAddress: input.ipAddress,
      provisioning,
      firmware: {
        currentVersion: deviceType.firmware?.currentVersion || '0.0.0',
        lastUpdateCheck: now,
        updateStatus: 'current',
      },
      health: {
        status: DeviceStatus.PROVISIONING,
        lastSeen: now,
        uptime: 0,
        errorCount: 0,
        warningCount: 0,
        healthScore: 100,
      },
      location: input.location ? this.normalizeLocation(input.location) : undefined,
      capabilities,
      protocolConfigs,
      groups: [],
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
    };

    this.devices.set(device.id, device);

    // Index by tags
    for (const tag of device.tags) {
      if (!this.deviceIndex.has(tag)) {
        this.deviceIndex.set(tag, new Set());
      }
      this.deviceIndex.get(tag)!.add(device.id);
    }

    // Add to groups
    if (input.groups && input.groups.length > 0) {
      for (const groupId of input.groups) {
        await this.addDeviceToGroup(device.id, groupId);
      }
    }

    this.emitEvent(DeviceEvent.REGISTERED, device.id, {
      name: device.name,
      deviceTypeId: device.deviceTypeId,
      serialNumber: device.serialNumber,
    });

    return { ...device, provisioning: { ...provisioning, deviceSecret: '***' } } as Device;
  }

  // -------------------------------------------------------------------------
  // Device Provisioning
  // -------------------------------------------------------------------------

  private createProvisioningInfo(): DeviceProvisioningInfo {
    const deviceKey = this.registry.generateDeviceKey();
    const deviceSecret = this.registry.generateDeviceSecret();
    const now = new Date();

    return {
      deviceKey,
      deviceSecret,
      provisionedAt: now,
      expiresAt: new Date(now.getTime() + this.config.provisioningKeyExpiry),
    };
  }

  async activateDevice(deviceId: string, macAddress?: string): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    if (device.status !== DeviceStatus.PROVISIONING) {
      throw new DeviceServiceError(
        `Device ${deviceId} is not in provisioning state`,
        ERROR_CODES.INVALID_CONFIG,
        400
      );
    }

    if (macAddress) {
      device.macAddress = macAddress;
    }

    device.status = DeviceStatus.ONLINE;
    device.health.status = DeviceStatus.ONLINE;
    device.health.lastSeen = new Date();
    device.updatedAt = new Date();

    this.emitEvent(DeviceEvent.PROVISIONED, device.id, {
      macAddress: device.macAddress,
      activatedAt: new Date(),
    });
    this.emitEvent(DeviceEvent.ONLINE, device.id, {});

    return device;
  }

  async regenerateProvisioningKeys(deviceId: string): Promise<DeviceProvisioningInfo> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    const newProvisioning = this.createProvisioningInfo();
    device.provisioning = newProvisioning;
    device.updatedAt = new Date();

    return newProvisioning;
  }

  // -------------------------------------------------------------------------
  // Device CRUD
  // -------------------------------------------------------------------------

  async getDevice(deviceId: string): Promise<Device | undefined> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.health.healthScore = this.calculateHealthScore(device);
    }
    return device;
  }

  async getDeviceBySerialNumber(serialNumber: string): Promise<Device | undefined> {
    return this.findBySerialNumber(serialNumber);
  }

  async getDeviceByDeviceKey(deviceKey: string): Promise<Device | undefined> {
    for (const device of this.devices.values()) {
      if (device.provisioning.deviceKey === deviceKey) {
        return device;
      }
    }
    return undefined;
  }

  private findBySerialNumber(serialNumber: string): Device | undefined {
    for (const device of this.devices.values()) {
      if (device.serialNumber === serialNumber) {
        return device;
      }
    }
    return undefined;
  }

  async updateDevice(deviceId: string, input: UpdateDeviceInput): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    if (input.name !== undefined) device.name = input.name;
    if (input.displayName !== undefined) device.displayName = input.displayName;
    if (input.description !== undefined) device.description = input.description;
    if (input.metadata !== undefined) device.metadata = input.metadata;

    if (input.tags !== undefined) {
      // Remove old tag index entries
      for (const tag of device.tags) {
        this.deviceIndex.get(tag)?.delete(device.id);
      }
      device.tags = input.tags;
      // Add new tag index entries
      for (const tag of device.tags) {
        if (!this.deviceIndex.has(tag)) {
          this.deviceIndex.set(tag, new Set());
        }
        this.deviceIndex.get(tag)!.add(device.id);
      }
    }

    if (input.location !== undefined) {
      device.location = this.normalizeLocation(input.location);
    }

    device.updatedAt = new Date();
    device.updatedBy = input.updatedBy;

    this.emitEvent(DeviceEvent.UPDATED, device.id, {
      changes: input,
    });

    return device;
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    // Remove from all groups
    for (const groupId of device.groups) {
      await this.removeDeviceFromGroup(deviceId, groupId);
    }

    // Remove tag index entries
    for (const tag of device.tags) {
      this.deviceIndex.get(tag)?.delete(device.id);
    }

    this.devices.delete(deviceId);

    this.emitEvent(DeviceEvent.DELETED, device.id, {
      name: device.name,
      serialNumber: device.serialNumber,
    });

    return true;
  }

  async listDevices(filter: DeviceFilter = {}): Promise<{ devices: Device[]; total: number }> {
    let results = Array.from(this.devices.values());

    // Apply filters
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter(d => statuses.includes(d.status));
    }

    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      results = results.filter(d => categories.includes(d.category));
    }

    if (filter.deviceTypeId) {
      const typeIds = Array.isArray(filter.deviceTypeId) ? filter.deviceTypeId : [filter.deviceTypeId];
      results = results.filter(d => typeIds.includes(d.deviceTypeId));
    }

    if (filter.groups && filter.groups.length > 0) {
      results = results.filter(d => d.groups.some(g => filter.groups!.includes(g)));
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(d => d.tags.some(t => filter.tags!.includes(t)));
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(d =>
        d.name.toLowerCase().includes(searchLower) ||
        d.displayName.toLowerCase().includes(searchLower) ||
        d.serialNumber.toLowerCase().includes(searchLower) ||
        d.description.toLowerCase().includes(searchLower)
      );
    }

    if (filter.lastSeenAfter) {
      results = results.filter(d => d.health.lastSeen >= filter.lastSeenAfter!);
    }
    if (filter.lastSeenBefore) {
      results = results.filter(d => d.health.lastSeen <= filter.lastSeenBefore!);
    }

    if (filter.healthScoreMin !== undefined) {
      results = results.filter(d => d.health.healthScore >= filter.healthScoreMin!);
    }
    if (filter.healthScoreMax !== undefined) {
      results = results.filter(d => d.health.healthScore <= filter.healthScoreMax!);
    }

    if (filter.createdAfter) {
      results = results.filter(d => d.createdAt >= filter.createdAfter!);
    }
    if (filter.createdBefore) {
      results = results.filter(d => d.createdAt <= filter.createdBefore!);
    }

    const total = results.length;

    // Sort
    if (filter.sortBy) {
      const order = filter.sortOrder === 'desc' ? -1 : 1;
      results.sort((a: any, b: any) => {
        const aVal = a[filter.sortBy!];
        const bVal = b[filter.sortBy!];
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
      });
    } else {
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Paginate
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    results = results.slice(offset, offset + limit);

    return { devices: results, total };
  }

  // -------------------------------------------------------------------------
  // Device Status
  // -------------------------------------------------------------------------

  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    const previousStatus = device.status;
    device.status = status;
    device.health.status = status;
    device.updatedAt = new Date();

    if (status === DeviceStatus.ONLINE) {
      device.health.lastSeen = new Date();
      this.emitEvent(DeviceEvent.ONLINE, device.id, { previousStatus });
    } else if (status === DeviceStatus.OFFLINE) {
      this.emitEvent(DeviceEvent.OFFLINE, device.id, { previousStatus });
    }

    this.emitEvent(DeviceEvent.STATUS_CHANGED, device.id, {
      previousStatus,
      currentStatus: status,
    });

    return device;
  }

  async recordHeartbeat(deviceId: string, data?: {
    signalStrength?: number;
    batteryLevel?: number;
    cpuUsage?: number;
    memoryUsage?: number;
    storageUsage?: number;
    temperature?: number;
    errorCount?: number;
    warningCount?: number;
    uptime?: number;
  }): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    const now = new Date();
    device.health.lastHeartbeat = now;
    device.health.lastSeen = now;

    if (device.status === DeviceStatus.OFFLINE) {
      device.status = DeviceStatus.ONLINE;
      device.health.status = DeviceStatus.ONLINE;
      this.emitEvent(DeviceEvent.ONLINE, device.id, { reason: 'heartbeat_received' });
    }

    if (data) {
      if (data.signalStrength !== undefined) device.health.signalStrength = data.signalStrength;
      if (data.batteryLevel !== undefined) device.health.batteryLevel = data.batteryLevel;
      if (data.cpuUsage !== undefined) device.health.cpuUsage = data.cpuUsage;
      if (data.memoryUsage !== undefined) device.health.memoryUsage = data.memoryUsage;
      if (data.storageUsage !== undefined) device.health.storageUsage = data.storageUsage;
      if (data.temperature !== undefined) device.health.temperature = data.temperature;
      if (data.errorCount !== undefined) device.health.errorCount = data.errorCount;
      if (data.warningCount !== undefined) device.health.warningCount = data.warningCount;
      if (data.uptime !== undefined) device.health.uptime = data.uptime;
    }

    device.health.healthScore = this.calculateHealthScore(device);
    device.updatedAt = now;

    return device;
  }

  private calculateHealthScore(device: Device): number {
    let score = 100;

    // Time since last seen penalty
    const timeSinceLastSeen = Date.now() - device.health.lastSeen.getTime();
    if (timeSinceLastSeen > this.config.offlineThreshold) {
      score -= 50;
    } else if (timeSinceLastSeen > this.config.warningThreshold) {
      score -= 20;
    }

    // Battery level penalty
    if (device.health.batteryLevel !== undefined) {
      if (device.health.batteryLevel < 10) score -= 30;
      else if (device.health.batteryLevel < 20) score -= 15;
      else if (device.health.batteryLevel < 30) score -= 5;
    }

    // Signal strength penalty
    if (device.health.signalStrength !== undefined) {
      if (device.health.signalStrength < -90) score -= 20;
      else if (device.health.signalStrength < -70) score -= 10;
    }

    // CPU usage penalty
    if (device.health.cpuUsage !== undefined) {
      if (device.health.cpuUsage > 90) score -= 15;
      else if (device.health.cpuUsage > 75) score -= 5;
    }

    // Memory usage penalty
    if (device.health.memoryUsage !== undefined) {
      if (device.health.memoryUsage > 90) score -= 15;
      else if (device.health.memoryUsage > 80) score -= 5;
    }

    // Error count penalty
    score -= Math.min(device.health.errorCount * 5, 30);
    score -= Math.min(device.health.warningCount * 2, 15);

    return Math.max(0, Math.min(100, score));
  }

  // -------------------------------------------------------------------------
  // Groups
  // -------------------------------------------------------------------------

  async createGroup(input: DeviceGroupInput): Promise<DeviceGroup> {
    const group: DeviceGroup = {
      id: uuidv4(),
      name: input.name,
      description: input.description || '',
      parentId: input.parentId,
      deviceTypeIds: input.deviceTypeIds || [],
      deviceIds: input.deviceIds || [],
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.groups.set(group.id, group);

    // Add devices to group
    for (const deviceId of group.deviceIds) {
      await this.addDeviceToGroup(deviceId, group.id);
    }

    return group;
  }

  async updateGroup(groupId: string, updates: Partial<DeviceGroupInput>): Promise<DeviceGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new DeviceServiceError(
        `Group not found: ${groupId}`,
        ERROR_CODES.GROUP_NOT_FOUND,
        404
      );
    }

    if (updates.name !== undefined) group.name = updates.name;
    if (updates.description !== undefined) group.description = updates.description;
    if (updates.parentId !== undefined) group.parentId = updates.parentId;
    if (updates.deviceTypeIds !== undefined) group.deviceTypeIds = updates.deviceTypeIds;
    if (updates.tags !== undefined) group.tags = updates.tags;
    if (updates.metadata !== undefined) group.metadata = updates.metadata;
    group.updatedAt = new Date();

    return group;
  }

  async deleteGroup(groupId: string): Promise<boolean> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new DeviceServiceError(
        `Group not found: ${groupId}`,
        ERROR_CODES.GROUP_NOT_FOUND,
        404
      );
    }

    // Remove all devices from group
    for (const deviceId of group.deviceIds) {
      const device = this.devices.get(deviceId);
      if (device) {
        device.groups = device.groups.filter(g => g !== groupId);
      }
    }

    this.groups.delete(groupId);
    return true;
  }

  async getGroup(groupId: string): Promise<DeviceGroup | undefined> {
    return this.groups.get(groupId);
  }

  async listGroups(): Promise<DeviceGroup[]> {
    return Array.from(this.groups.values());
  }

  async addDeviceToGroup(deviceId: string, groupId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    const group = this.groups.get(groupId);

    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }
    if (!group) {
      throw new DeviceServiceError(
        `Group not found: ${groupId}`,
        ERROR_CODES.GROUP_NOT_FOUND,
        404
      );
    }

    if (device.groups.length >= this.config.maxGroupsPerDevice) {
      throw new DeviceServiceError(
        `Device ${deviceId} has reached maximum group limit`,
        ERROR_CODES.MAX_GROUPS_REACHED,
        400
      );
    }

    if (!device.groups.includes(groupId)) {
      device.groups.push(groupId);
      device.updatedAt = new Date();
    }

    if (!group.deviceIds.includes(deviceId)) {
      group.deviceIds.push(deviceId);
      group.updatedAt = new Date();
    }

    this.emitEvent(DeviceEvent.GROUP_ADDED, deviceId, { groupId, groupName: group.name });
  }

  async removeDeviceFromGroup(deviceId: string, groupId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    const group = this.groups.get(groupId);

    if (device) {
      device.groups = device.groups.filter(g => g !== groupId);
      device.updatedAt = new Date();
    }

    if (group) {
      group.deviceIds = group.deviceIds.filter(d => d !== deviceId);
      group.updatedAt = new Date();
    }

    this.emitEvent(DeviceEvent.GROUP_REMOVED, deviceId, { groupId });
  }

  async getDevicesByGroup(groupId: string): Promise<Device[]> {
    const group = this.groups.get(groupId);
    if (!group) return [];

    return group.deviceIds
      .map(id => this.devices.get(id))
      .filter((d): d is Device => d !== undefined);
  }

  // -------------------------------------------------------------------------
  // Tags
  // -------------------------------------------------------------------------

  async addTag(deviceId: string, tag: string): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    if (device.tags.length >= this.config.maxTagsPerDevice) {
      throw new DeviceServiceError(
        `Device ${deviceId} has reached maximum tag limit`,
        ERROR_CODES.MAX_TAGS_REACHED,
        400
      );
    }

    if (!device.tags.includes(tag)) {
      device.tags.push(tag);
      if (!this.deviceIndex.has(tag)) {
        this.deviceIndex.set(tag, new Set());
      }
      this.deviceIndex.get(tag)!.add(deviceId);
      device.updatedAt = new Date();
    }

    return device;
  }

  async removeTag(deviceId: string, tag: string): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    device.tags = device.tags.filter(t => t !== tag);
    this.deviceIndex.get(tag)?.delete(deviceId);
    device.updatedAt = new Date();

    return device;
  }

  async findByTag(tag: string): Promise<Device[]> {
    const deviceIds = this.deviceIndex.get(tag);
    if (!deviceIds) return [];

    return Array.from(deviceIds)
      .map(id => this.devices.get(id))
      .filter((d): d is Device => d !== undefined);
  }

  async getAllTags(): Promise<string[]> {
    return Array.from(this.deviceIndex.keys());
  }

  // -------------------------------------------------------------------------
  // Firmware
  // -------------------------------------------------------------------------

  async updateFirmware(deviceId: string, version: string): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    const deviceType = this.registry.getDeviceType(device.deviceTypeId);
    if (!deviceType) {
      throw new DeviceServiceError(
        `Invalid device type for device: ${deviceId}`,
        ERROR_CODES.INVALID_DEVICE_TYPE,
        400
      );
    }

    if (device.status === DeviceStatus.UPDATING) {
      throw new DeviceServiceError(
        `Device ${deviceId} is already updating`,
        ERROR_CODES.FIRMWARE_UPDATE_FAILED,
        409
      );
    }

    const previousVersion = device.firmware.currentVersion;
    device.firmware.targetVersion = version;
    device.firmware.updateStatus = 'updating';
    device.firmware.lastUpdateAttempt = new Date();
    device.firmware.rollbackVersion = previousVersion;
    device.status = DeviceStatus.UPDATING;
    device.updatedAt = new Date();

    this.emitEvent(DeviceEvent.FIRMWARE_UPDATE, device.id, {
      previousVersion,
      targetVersion: version,
      startedAt: new Date(),
    });

    return device;
  }

  async completeFirmwareUpdate(deviceId: string, success: boolean): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    if (success) {
      device.firmware.currentVersion = device.firmware.targetVersion || device.firmware.currentVersion;
      device.firmware.updateStatus = 'current';
      device.firmware.targetVersion = undefined;
      device.status = DeviceStatus.ONLINE;
    } else {
      device.firmware.updateStatus = 'failed';
      if (device.firmware.rollbackVersion) {
        device.firmware.currentVersion = device.firmware.rollbackVersion;
      }
      device.status = DeviceStatus.ERROR;
    }

    device.firmware.lastUpdateCheck = new Date();
    device.updatedAt = new Date();

    return device;
  }

  // -------------------------------------------------------------------------
  // Capabilities
  // -------------------------------------------------------------------------

  async addCapability(deviceId: string, capabilityType: CapabilityType, alias?: string): Promise<DeviceCapability> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    if (device.capabilities.length >= this.config.maxCapabilitiesPerDevice) {
      throw new DeviceServiceError(
        `Device ${deviceId} has reached maximum capability limit`,
        ERROR_CODES.MAX_CAPABILITIES_REACHED,
        400
      );
    }

    const definition = this.registry.getCapabilityDefinition(capabilityType);
    if (!definition) {
      throw new DeviceServiceError(
        `Invalid capability type: ${capabilityType}`,
        ERROR_CODES.INVALID_CAPABILITY,
        400
      );
    }

    const existing = device.capabilities.find(c => c.definitionId === capabilityType);
    if (existing) {
      throw new DeviceServiceError(
        `Capability ${capabilityType} already exists on device ${deviceId}`,
        ERROR_CODES.DEVICE_EXISTS,
        409
      );
    }

    const capability: DeviceCapability = {
      id: uuidv4(),
      definitionId: capabilityType,
      alias: alias || definition.name,
      enabled: true,
    };

    device.capabilities.push(capability);
    device.updatedAt = new Date();

    return capability;
  }

  async removeCapability(deviceId: string, capabilityId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    const initialLength = device.capabilities.length;
    device.capabilities = device.capabilities.filter(c => c.id !== capabilityId);

    if (device.capabilities.length === initialLength) {
      return false;
    }

    device.updatedAt = new Date();
    return true;
  }

  async updateCapabilityCalibration(
    deviceId: string,
    capabilityId: string,
    offset: number,
    scale: number
  ): Promise<DeviceCapability> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new DeviceServiceError(
        `Device not found: ${deviceId}`,
        ERROR_CODES.DEVICE_NOT_FOUND,
        404
      );
    }

    const capability = device.capabilities.find(c => c.id === capabilityId);
    if (!capability) {
      throw new DeviceServiceError(
        `Capability not found: ${capabilityId}`,
        ERROR_CODES.INVALID_CAPABILITY,
        404
      );
    }

    capability.calibrationOffset = offset;
    capability.calibrationScale = scale;
    device.updatedAt = new Date();

    return capability;
  }

  private buildCapabilities(capabilityTypes: string[], deviceType: DeviceTypeDefinition): DeviceCapability[] {
    const capabilities: DeviceCapability[] = [];

    for (const typeStr of capabilityTypes) {
      const type = typeStr as CapabilityType;
      const definition = deviceType.capabilities.find(c => c.type === type) ||
                         this.registry.getCapabilityDefinition(type);

      if (definition) {
        capabilities.push({
          id: uuidv4(),
          definitionId: type,
          alias: definition.name,
          enabled: true,
        });
      }
    }

    // Add default capabilities from device type that aren't already added
    for (const defCap of deviceType.capabilities) {
      if (!capabilities.find(c => c.definitionId === defCap.type)) {
        capabilities.push({
          id: uuidv4(),
          definitionId: defCap.type,
          alias: defCap.name,
          enabled: true,
        });
      }
    }

    return capabilities;
  }

  private buildProtocolConfigs(configs: Partial<ProtocolConfig>[], deviceType: DeviceTypeDefinition): ProtocolConfig[] {
    if (configs.length > 0) {
      return configs.map(config => ({
        protocol: config.protocol || deviceType.protocolCapabilities.preferredProtocol,
        enabled: config.enabled !== false,
        endpoint: config.endpoint,
        port: config.port,
        topic: config.topic,
        clientId: config.clientId,
        username: config.username,
        password: config.password,
        qos: config.qos ?? 1,
        retain: config.retain ?? false,
        keepAlive: config.keepAlive ?? 60,
        cleanSession: config.cleanSession ?? true,
        willTopic: config.willTopic,
        willMessage: config.willMessage,
        tls: config.tls ?? false,
        caCert: config.caCert,
        clientCert: config.clientCert,
        clientKey: config.clientKey,
        dataFormat: config.dataFormat || DataFormat.JSON,
        compression: config.compression,
        batchSize: config.batchSize,
        batchInterval: config.batchInterval,
        timeout: config.timeout ?? 30000,
        retryCount: config.retryCount ?? 3,
        retryDelay: config.retryDelay ?? 1000,
        customHeaders: config.customHeaders,
      }));
    }

    // Default protocol config from device type
    const defaultConfig: ProtocolConfig = {
      protocol: deviceType.protocolCapabilities.preferredProtocol,
      enabled: true,
      dataFormat: DataFormat.JSON,
      qos: 1,
      retain: false,
      keepAlive: 60,
      cleanSession: true,
      tls: false,
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
    };

    return [defaultConfig];
  }

  private normalizeLocation(location: Partial<DeviceLocation>): DeviceLocation {
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy,
      address: location.address,
      building: location.building,
      floor: location.floor,
      room: location.room,
      zone: location.zone,
    };
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  private eventListeners: Map<DeviceEvent, Array<(payload: DeviceEventPayload) => void>> = new Map();

  onEvent(event: DeviceEvent, listener: (payload: DeviceEventPayload) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  offEvent(event: DeviceEvent, listener: (payload: DeviceEventPayload) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: DeviceEvent, deviceId: string, data: Record<string, unknown>): void {
    const payload: DeviceEventPayload = {
      event,
      deviceId,
      timestamp: new Date(),
      data,
    };

    this.eventLog.push(payload);
    if (this.eventLog.length > 10000) {
      this.eventLog = this.eventLog.slice(-5000);
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  getEventLog(limit: number = 100): DeviceEventPayload[] {
    return this.eventLog.slice(-limit);
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  getStatistics(): {
    totalDevices: number;
    byStatus: Record<DeviceStatus, number>;
    byCategory: Record<DeviceCategory, number>;
    averageHealthScore: number;
    onlinePercentage: number;
    totalGroups: number;
    totalTags: number;
  } {
    const devices = Array.from(this.devices.values());
    const byStatus: Record<DeviceStatus, number> = {} as any;
    const byCategory: Record<DeviceCategory, number> = {} as any;

    for (const status of Object.values(DeviceStatus)) {
      byStatus[status] = 0;
    }
    for (const category of Object.values(DeviceCategory)) {
      byCategory[category] = 0;
    }

    let totalHealthScore = 0;
    for (const device of devices) {
      byStatus[device.status]++;
      byCategory[device.category]++;
      totalHealthScore += device.health.healthScore;
    }

    return {
      totalDevices: devices.length,
      byStatus,
      byCategory,
      averageHealthScore: devices.length > 0 ? totalHealthScore / devices.length : 0,
      onlinePercentage: devices.length > 0 ? (byStatus[DeviceStatus.ONLINE] / devices.length) * 100 : 0,
      totalGroups: this.groups.size,
      totalTags: this.deviceIndex.size,
    };
  }

  // -------------------------------------------------------------------------
  // Bulk Operations
  // -------------------------------------------------------------------------

  async bulkRegisterDevices(
    inputs: RegisterDeviceInput[]
  ): Promise<{ registered: Device[]; errors: Array<{ input: RegisterDeviceInput; error: string }> }> {
    const registered: Device[] = [];
    const errors: Array<{ input: RegisterDeviceInput; error: string }> = [];

    for (const input of inputs) {
      try {
        const device = await this.registerDevice(input);
        registered.push(device);
      } catch (error) {
        errors.push({
          input,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { registered, errors };
  }

  async bulkUpdateStatus(
    deviceIds: string[],
    status: DeviceStatus
  ): Promise<{ updated: string[]; errors: Array<{ deviceId: string; error: string }> }> {
    const updated: string[] = [];
    const errors: Array<{ deviceId: string; error: string }> = [];

    for (const deviceId of deviceIds) {
      try {
        await this.updateDeviceStatus(deviceId, status);
        updated.push(deviceId);
      } catch (error) {
        errors.push({
          deviceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { updated, errors };
  }

  async bulkDeleteDevices(
    deviceIds: string[]
  ): Promise<{ deleted: string[]; errors: Array<{ deviceId: string; error: string }> }> {
    const deleted: string[] = [];
    const errors: Array<{ deviceId: string; error: string }> = [];

    for (const deviceId of deviceIds) {
      try {
        await this.deleteDevice(deviceId);
        deleted.push(deviceId);
      } catch (error) {
        errors.push({
          deviceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { deleted, errors };
  }
}

// Singleton instance
let serviceInstance: DeviceService | null = null;

export function getDeviceService(): DeviceService {
  if (!serviceInstance) {
    serviceInstance = new DeviceService();
  }
  return serviceInstance;
}

export default DeviceService;
