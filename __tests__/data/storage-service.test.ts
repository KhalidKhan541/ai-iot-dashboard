import { StorageService } from '@/services/storage-service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService({
      hotRetentionDays: 7,
      warmRetentionDays: 30,
      coldRetentionDays: 90,
      maxStorageSizeBytes: 1024 * 1024 * 1024,
      autoTieringEnabled: true,
    });
  });

  describe('store', () => {
    it('should store readings with auto-tiering', () => {
      const readings = [
        {
          deviceId: 'device-1',
          metric: 'temperature',
          value: 25.5,
          unit: 'celsius',
          timestamp: new Date(),
        },
      ];

      const ids = service.store(readings);

      expect(ids).toHaveLength(1);
      expect(ids[0]).toBeDefined();

      const stored = service.retrieve(ids[0]);
      expect(stored).toBeDefined();
      expect(stored?.deviceId).toBe('device-1');
      expect(stored?.metric).toBe('temperature');
      expect(stored?.tier).toBe('hot');
      expect(stored?.compressed).toBe(false);
      expect(stored?.checksum).toBeDefined();
    });

    it('should store multiple readings', () => {
      const readings = [
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: new Date() },
        { deviceId: 'd2', metric: 'temp', value: 25, unit: 'C', timestamp: new Date() },
        { deviceId: 'd3', metric: 'temp', value: 30, unit: 'C', timestamp: new Date() },
      ];

      const ids = service.store(readings);
      expect(ids).toHaveLength(3);
    });

    it('should apply compression for non-hot tiers', () => {
      const oldTimestamp = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const readings = [
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: oldTimestamp },
      ];

      const ids = service.store(readings);
      const stored = service.retrieve(ids[0]);

      expect(stored?.tier).toBe('warm');
      expect(stored?.compressed).toBe(true);
    });

    it('should compute checksums', () => {
      const readings = [
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: new Date() },
      ];

      const ids = service.store(readings);
      const stored = service.retrieve(ids[0]);

      expect(stored?.checksum).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('retrieve', () => {
    it('should retrieve stored reading by ID', () => {
      const ids = service.store([
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: new Date() },
      ]);

      const reading = service.retrieve(ids[0]);
      expect(reading).toBeDefined();
      expect(reading?.id).toBe(ids[0]);
    });

    it('should return undefined for non-existent ID', () => {
      const reading = service.retrieve('non-existent');
      expect(reading).toBeUndefined();
    });
  });

  describe('query', () => {
    beforeEach(() => {
      const now = new Date();
      service.store([
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: now },
        { deviceId: 'd1', metric: 'humidity', value: 60, unit: '%', timestamp: now },
        { deviceId: 'd2', metric: 'temp', value: 25, unit: 'C', timestamp: now },
      ]);
    });

    it('should return all readings when no filter', () => {
      const results = service.query({});
      expect(results).toHaveLength(3);
    });

    it('should filter by device ID', () => {
      const results = service.query({ deviceId: 'd1' });
      expect(results).toHaveLength(2);
    });

    it('should filter by metric', () => {
      const results = service.query({ metric: 'temp' });
      expect(results).toHaveLength(2);
    });

    it('should filter by tier', () => {
      const results = service.query({ tier: ['hot'] });
      expect(results).toHaveLength(3);
    });

    it('should apply limit', () => {
      const results = service.query({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should filter by time range', () => {
      const now = new Date();
      const results = service.query({
        timeRange: {
          start: new Date(now.getTime() - 60000),
          end: new Date(now.getTime() + 60000),
        },
      });
      expect(results).toHaveLength(3);
    });
  });

  describe('promoteTier', () => {
    it('should move reading to target tier', () => {
      const ids = service.store([
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: new Date() },
      ]);

      const promoted = service.promoteTier(ids[0], 'cold');
      expect(promoted?.tier).toBe('cold');
      expect(promoted?.compressed).toBe(true);
    });

    it('should return undefined for non-existent ID', () => {
      const result = service.promoteTier('non-existent', 'warm');
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete existing reading', () => {
      const ids = service.store([
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: new Date() },
      ]);

      const result = service.delete(ids[0]);
      expect(result).toBe(true);
      expect(service.retrieve(ids[0])).toBeUndefined();
    });

    it('should return false for non-existent reading', () => {
      const result = service.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('deleteByTimeRange', () => {
    it('should delete readings within time range', () => {
      const now = new Date();
      service.store([
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: now },
        { deviceId: 'd1', metric: 'temp', value: 25, unit: 'C', timestamp: new Date(now.getTime() + 86400000) },
      ]);

      const deleted = service.deleteByTimeRange({
        start: new Date(now.getTime() - 1000),
        end: new Date(now.getTime() + 1000),
      });

      expect(deleted).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should calculate storage statistics', () => {
      const now = new Date();
      service.store([
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: now },
        { deviceId: 'd1', metric: 'temp', value: 25, unit: 'C', timestamp: now },
      ]);

      const stats = service.getStats();

      expect(stats.totalReadings).toBe(2);
      expect(stats.totalSizeBytes).toBeGreaterThanOrEqual(0);
      expect(stats.byTier.hot).toBe(2);
      expect(stats.oldestReading).toBeDefined();
      expect(stats.newestReading).toBeDefined();
    });
  });

  describe('getAvailableStorage', () => {
    it('should calculate available storage', () => {
      const available = service.getAvailableStorage();
      expect(available).toBeGreaterThan(0);
    });
  });

  describe('needsTiering', () => {
    it('should indicate when tiering is needed', () => {
      const result = service.needsTiering();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('clear', () => {
    it('should reset all data', () => {
      service.store([
        { deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: new Date() },
      ]);

      service.clear();
      expect(service.count()).toBe(0);
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(service.count()).toBe(0);
      service.store([{ deviceId: 'd1', metric: 'temp', value: 20, unit: 'C', timestamp: new Date() }]);
      expect(service.count()).toBe(1);
    });
  });
});
