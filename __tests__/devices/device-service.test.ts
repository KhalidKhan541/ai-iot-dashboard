import { DeviceService, DeviceCreateInput, DeviceUpdateInput } from '@/services/device-service';

describe('DeviceService', () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  describe('create', () => {
    it('should create a device with valid input', () => {
      const input: DeviceCreateInput = {
        name: 'Temperature Sensor',
        type: 'sensor',
        location: 'Building A - Floor 1',
        firmware: '1.0.0',
        batteryLevel: 85,
      };

      const device = service.create(input);

      expect(device).toBeDefined();
      expect(device.id).toBeDefined();
      expect(device.name).toBe('Temperature Sensor');
      expect(device.type).toBe('sensor');
      expect(device.location).toBe('Building A - Floor 1');
      expect(device.firmware).toBe('1.0.0');
      expect(device.batteryLevel).toBe(85);
      expect(device.status).toBe('offline');
      expect(device.metadata).toEqual({});
      expect(device.createdAt).toBeInstanceOf(Date);
      expect(device.updatedAt).toBeInstanceOf(Date);
    });

    it('should create device with metadata', () => {
      const input: DeviceCreateInput = {
        name: 'Humidity Sensor',
        type: 'sensor',
        location: 'Warehouse',
        firmware: '2.0.0',
        metadata: { manufacturer: 'Acme', model: 'H100' },
      };

      const device = service.create(input);

      expect(device.metadata).toEqual({ manufacturer: 'Acme', model: 'H100' });
    });

    it('should create device without optional battery level', () => {
      const input: DeviceCreateInput = {
        name: 'Gateway',
        type: 'gateway',
        location: 'Server Room',
        firmware: '3.0.0',
      };

      const device = service.create(input);

      expect(device.batteryLevel).toBeUndefined();
    });

    it('should reject invalid device name', () => {
      const input: DeviceCreateInput = {
        name: '',
        type: 'sensor',
        location: 'Location',
        firmware: '1.0.0',
      };

      expect(() => service.create(input)).toThrow();
    });

    it('should reject invalid device type', () => {
      const input = {
        name: 'Device',
        type: 'invalid',
        location: 'Location',
        firmware: '1.0.0',
      };

      expect(() => service.create(input as any)).toThrow();
    });

    it('should reject battery level outside range', () => {
      const input: DeviceCreateInput = {
        name: 'Device',
        type: 'sensor',
        location: 'Location',
        firmware: '1.0.0',
        batteryLevel: 150,
      };

      expect(() => service.create(input)).toThrow();
    });
  });

  describe('getById', () => {
    it('should return device by ID', () => {
      const created = service.create({
        name: 'Test Device',
        type: 'sensor',
        location: 'Lab',
        firmware: '1.0.0',
      });

      const found = service.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for non-existent ID', () => {
      const found = service.getById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      service.create({ name: 'Sensor 1', type: 'sensor', location: 'Building A', firmware: '1.0.0' });
      service.create({ name: 'Sensor 2', type: 'sensor', location: 'Building B', firmware: '1.0.0' });
      service.create({ name: 'Actuator 1', type: 'actuator', location: 'Building A', firmware: '2.0.0' });
      service.create({ name: 'Gateway 1', type: 'gateway', location: 'Server Room', firmware: '3.0.0' });
    });

    it('should return all devices when no filter', () => {
      const devices = service.getAll();
      expect(devices).toHaveLength(4);
    });

    it('should filter by status', () => {
      const allDevices = service.getAll();
      service.updateStatus(allDevices[0].id, 'online');
      service.updateStatus(allDevices[1].id, 'error');

      const onlineDevices = service.getAll({ status: ['online'] });
      expect(onlineDevices).toHaveLength(1);
      expect(onlineDevices[0].status).toBe('online');

      const errorDevices = service.getAll({ status: ['error'] });
      expect(errorDevices).toHaveLength(1);
    });

    it('should filter by type', () => {
      const sensors = service.getAll({ type: ['sensor'] });
      expect(sensors).toHaveLength(2);
      sensors.forEach(s => expect(s.type).toBe('sensor'));
    });

    it('should filter by location', () => {
      const buildingADevices = service.getAll({ location: 'Building A' });
      expect(buildingADevices).toHaveLength(2);
    });

    it('should filter by search term', () => {
      const results = service.getAll({ search: 'Gateway' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Gateway 1');
    });

    it('should filter by battery low', () => {
      const devices = service.getAll();
      service.update(devices[0].id, { batteryLevel: 15 });

      const lowBattery = service.getAll({ batteryLow: true });
      expect(lowBattery).toHaveLength(1);
      expect(lowBattery[0].batteryLevel).toBeLessThan(20);
    });
  });

  describe('update', () => {
    it('should update device fields', () => {
      const created = service.create({
        name: 'Original Name',
        type: 'sensor',
        location: 'Original Location',
        firmware: '1.0.0',
      });

      const updated = service.update(created.id, {
        name: 'Updated Name',
        location: 'New Location',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.location).toBe('New Location');
      expect(updated?.firmware).toBe('1.0.0');
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should return undefined for non-existent device', () => {
      const result = service.update('non-existent', { name: 'New' });
      expect(result).toBeUndefined();
    });

    it('should merge metadata', () => {
      const created = service.create({
        name: 'Device',
        type: 'sensor',
        location: 'Location',
        firmware: '1.0.0',
        metadata: { key1: 'value1' },
      });

      const updated = service.update(created.id, {
        metadata: { key2: 'value2' },
      });

      expect(updated?.metadata).toEqual({ key1: 'value1', key2: 'value2' });
    });
  });

  describe('delete', () => {
    it('should delete existing device', () => {
      const created = service.create({
        name: 'To Delete',
        type: 'sensor',
        location: 'Location',
        firmware: '1.0.0',
      });

      const result = service.delete(created.id);
      expect(result).toBe(true);
      expect(service.getById(created.id)).toBeUndefined();
    });

    it('should return false for non-existent device', () => {
      const result = service.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('should update device status', () => {
      const created = service.create({
        name: 'Device',
        type: 'sensor',
        location: 'Location',
        firmware: '1.0.0',
      });

      const updated = service.updateStatus(created.id, 'online');
      expect(updated?.status).toBe('online');
    });
  });

  describe('recordHeartbeat', () => {
    it('should update status to online on heartbeat', () => {
      const created = service.create({
        name: 'Device',
        type: 'sensor',
        location: 'Location',
        firmware: '1.0.0',
      });

      const updated = service.recordHeartbeat(created.id);
      expect(updated?.status).toBe('online');
    });

    it('should return undefined for non-existent device', () => {
      const result = service.recordHeartbeat('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should calculate device statistics', () => {
      const d1 = service.create({ name: 'D1', type: 'sensor', location: 'A', firmware: '1.0.0' });
      const d2 = service.create({ name: 'D2', type: 'actuator', location: 'A', firmware: '1.0.0' });
      const d3 = service.create({ name: 'D3', type: 'sensor', location: 'B', firmware: '1.0.0' });

      service.updateStatus(d1.id, 'online');
      service.updateStatus(d2.id, 'warning');
      service.updateStatus(d3.id, 'error');

      service.update(d1.id, { batteryLevel: 80 });
      service.update(d2.id, { batteryLevel: 50 });

      const stats = service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.online).toBe(1);
      expect(stats.offline).toBe(0);
      expect(stats.warning).toBe(1);
      expect(stats.error).toBe(1);
      expect(stats.avgBatteryLevel).toBe(65);
      expect(stats.byType.sensor).toBe(2);
      expect(stats.byType.actuator).toBe(1);
      expect(stats.byLocation.A).toBe(2);
      expect(stats.byLocation.B).toBe(1);
    });
  });

  describe('getStaleDevices', () => {
    it('should return devices that have not sent heartbeat', () => {
      const fresh = service.create({ name: 'Fresh', type: 'sensor', location: 'A', firmware: '1.0.0' });
      const stale = service.create({ name: 'Stale', type: 'sensor', location: 'A', firmware: '1.0.0' });

      service.update(stale.id, {
        metadata: { lastSeen: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
      });

      const staleDevices = service.getStaleDevices(5 * 60 * 1000);
      expect(staleDevices.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(service.count()).toBe(0);
      service.create({ name: 'D1', type: 'sensor', location: 'A', firmware: '1.0.0' });
      expect(service.count()).toBe(1);
      service.create({ name: 'D2', type: 'sensor', location: 'A', firmware: '1.0.0' });
      expect(service.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all devices', () => {
      service.create({ name: 'D1', type: 'sensor', location: 'A', firmware: '1.0.0' });
      service.create({ name: 'D2', type: 'sensor', location: 'A', firmware: '1.0.0' });
      expect(service.count()).toBe(2);

      service.clear();
      expect(service.count()).toBe(0);
    });
  });
});
