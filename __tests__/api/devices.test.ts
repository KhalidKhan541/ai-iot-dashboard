import { DeviceService } from '@/services/device-service';

describe('Devices API Integration', () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  describe('GET /api/devices', () => {
    it('should return empty list when no devices', () => {
      const devices = service.getAll();
      expect(devices).toHaveLength(0);
    });

    it('should return all devices', () => {
      service.create({ name: 'D1', type: 'sensor', location: 'A', firmware: '1.0.0' });
      service.create({ name: 'D2', type: 'actuator', location: 'B', firmware: '1.0.0' });

      const devices = service.getAll();
      expect(devices).toHaveLength(2);
    });

    it('should filter devices by status', () => {
      const d1 = service.create({ name: 'D1', type: 'sensor', location: 'A', firmware: '1.0.0' });
      const d2 = service.create({ name: 'D2', type: 'sensor', location: 'A', firmware: '1.0.0' });
      service.updateStatus(d1.id, 'online');

      const online = service.getAll({ status: ['online'] });
      expect(online).toHaveLength(1);
      expect(online[0].id).toBe(d1.id);
    });

    it('should filter devices by type', () => {
      service.create({ name: 'Sensor', type: 'sensor', location: 'A', firmware: '1.0.0' });
      service.create({ name: 'Actuator', type: 'actuator', location: 'A', firmware: '1.0.0' });

      const sensors = service.getAll({ type: ['sensor'] });
      expect(sensors).toHaveLength(1);
      expect(sensors[0].type).toBe('sensor');
    });

    it('should search devices by name', () => {
      service.create({ name: 'Temperature Sensor', type: 'sensor', location: 'A', firmware: '1.0.0' });
      service.create({ name: 'Humidity Sensor', type: 'sensor', location: 'A', firmware: '1.0.0' });

      const results = service.getAll({ search: 'Temperature' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Temperature Sensor');
    });

    it('should return device statistics', () => {
      service.create({ name: 'D1', type: 'sensor', location: 'A', firmware: '1.0.0' });
      service.create({ name: 'D2', type: 'actuator', location: 'A', firmware: '1.0.0' });

      const stats = service.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byType.sensor).toBe(1);
      expect(stats.byType.actuator).toBe(1);
    });
  });

  describe('POST /api/devices', () => {
    it('should create a device', () => {
      const device = service.create({
        name: 'New Sensor',
        type: 'sensor',
        location: 'Lab',
        firmware: '1.0.0',
      });

      expect(device.id).toBeDefined();
      expect(device.name).toBe('New Sensor');
      expect(device.status).toBe('offline');
    });

    it('should reject invalid device data', () => {
      expect(() =>
        service.create({
          name: '',
          type: 'sensor',
          location: 'Lab',
          firmware: '1.0.0',
        })
      ).toThrow();
    });

    it('should create device with metadata', () => {
      const device = service.create({
        name: 'Smart Sensor',
        type: 'sensor',
        location: 'Building A',
        firmware: '2.0.0',
        metadata: { manufacturer: 'Acme', batch: 'A001' },
      });

      expect(device.metadata.manufacturer).toBe('Acme');
    });
  });

  describe('PUT /api/devices', () => {
    it('should update device', () => {
      const created = service.create({
        name: 'Original',
        type: 'sensor',
        location: 'Lab',
        firmware: '1.0.0',
      });

      const updated = service.update(created.id, {
        name: 'Updated',
        location: 'Warehouse',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.location).toBe('Warehouse');
    });

    it('should return undefined for non-existent device', () => {
      const result = service.update('non-existent', { name: 'New' });
      expect(result).toBeUndefined();
    });

    it('should update device status', () => {
      const created = service.create({
        name: 'Device',
        type: 'sensor',
        location: 'Lab',
        firmware: '1.0.0',
      });

      const updated = service.updateStatus(created.id, 'online');
      expect(updated?.status).toBe('online');
    });
  });

  describe('DELETE /api/devices', () => {
    it('should delete device', () => {
      const created = service.create({
        name: 'To Delete',
        type: 'sensor',
        location: 'Lab',
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

  describe('Device Lifecycle', () => {
    it('should handle full device lifecycle', () => {
      // Create
      const device = service.create({
        name: 'Lifecycle Sensor',
        type: 'sensor',
        location: 'Test Lab',
        firmware: '1.0.0',
      });
      expect(device.status).toBe('offline');

      // Update status to online
      service.updateStatus(device.id, 'online');
      expect(service.getById(device.id)?.status).toBe('online');

      // Record heartbeat
      service.recordHeartbeat(device.id);
      expect(service.getById(device.id)?.status).toBe('online');

      // Update to warning
      service.updateStatus(device.id, 'warning');
      expect(service.getById(device.id)?.status).toBe('warning');

      // Update to error
      service.updateStatus(device.id, 'error');
      expect(service.getById(device.id)?.status).toBe('error');

      // Delete
      service.delete(device.id);
      expect(service.getById(device.id)).toBeUndefined();
    });

    it('should track device statistics through lifecycle', () => {
      const d1 = service.create({ name: 'D1', type: 'sensor', location: 'A', firmware: '1.0.0' });
      const d2 = service.create({ name: 'D2', type: 'actuator', location: 'B', firmware: '1.0.0' });

      service.updateStatus(d1.id, 'online');
      service.updateStatus(d2.id, 'warning');

      const stats = service.getStats();
      expect(stats.online).toBe(1);
      expect(stats.warning).toBe(1);
      expect(stats.offline).toBe(0);
    });
  });
});
