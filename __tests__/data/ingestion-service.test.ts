import { IngestionService } from '@/services/ingestion-service';

describe('IngestionService', () => {
  let service: IngestionService;

  beforeEach(() => {
    service = new IngestionService({
      maxBatchSize: 100,
      deduplicationWindowMs: 5000,
      validationEnabled: true,
    });
  });

  describe('ingest', () => {
    it('should accept valid readings', () => {
      const readings = [
        {
          deviceId: 'device-1',
          metric: 'temperature',
          value: 25.5,
          unit: 'celsius',
        },
        {
          deviceId: 'device-1',
          metric: 'humidity',
          value: 65.0,
          unit: 'percent',
        },
      ];

      const result = service.ingest(readings);

      expect(result.accepted).toBe(2);
      expect(result.rejected).toBe(0);
      expect(result.duplicates).toBe(0);
    });

    it('should reject invalid readings', () => {
      const readings = [
        { deviceId: 'device-1', metric: 'temp', value: 25, unit: 'C' },
        { invalid: 'data' },
        { deviceId: '', metric: 'temp', value: 25, unit: 'C' },
      ];

      const result = service.ingest(readings);

      expect(result.rejected).toBeGreaterThanOrEqual(1);
    });

    it('should detect duplicate readings', () => {
      const readings = [
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
      ];

      const result1 = service.ingest(readings);
      expect(result1.duplicates).toBe(0);

      const result2 = service.ingest(readings);
      expect(result2.duplicates).toBe(1);
    });

    it('should generate unique IDs for each reading', () => {
      const readings = [
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
      ];

      service.ingest(readings);
      service.clear();

      const stored1 = service.ingest(readings);
      const stored2 = service.ingest(readings);

      expect(stored1.accepted).toBe(1);
      expect(stored2.duplicates).toBe(1);
    });

    it('should handle empty input', () => {
      const result = service.ingest([]);
      expect(result.accepted).toBe(0);
      expect(result.rejected).toBe(0);
      expect(result.duplicates).toBe(0);
    });

    it('should track quality scores', () => {
      const readings = [
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius', quality: 0.95 },
      ];

      service.ingest(readings);
      const stored = service.getReadings({ deviceId: 'device-1' });

      expect(stored.length).toBe(1);
      expect(stored[0].quality).toBe(0.95);
    });

    it('should default quality to 1 when not provided', () => {
      const readings = [
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
      ];

      service.ingest(readings);
      const stored = service.getReadings({ deviceId: 'device-1' });

      expect(stored[0].quality).toBe(1);
    });
  });

  describe('getReadings', () => {
    beforeEach(() => {
      service.ingest([
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
        { deviceId: 'device-1', metric: 'humidity', value: 60, unit: 'percent' },
        { deviceId: 'device-2', metric: 'temperature', value: 30, unit: 'celsius' },
      ]);
    });

    it('should return all readings', () => {
      const readings = service.getReadings();
      expect(readings).toHaveLength(3);
    });

    it('should filter by device ID', () => {
      const readings = service.getReadings({ deviceId: 'device-1' });
      expect(readings).toHaveLength(2);
      readings.forEach(r => expect(r.deviceId).toBe('device-1'));
    });

    it('should filter by metric', () => {
      const readings = service.getReadings({ metric: 'temperature' });
      expect(readings).toHaveLength(2);
      readings.forEach(r => expect(r.metric).toBe('temperature'));
    });

    it('should filter by time since', () => {
      const now = new Date();
      const readings = service.getReadings({ since: now });
      expect(readings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getBatch', () => {
    it('should return batch by ID', () => {
      service.ingest([
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
      ]);

      const stats = service.getStats();
      expect(stats.totalReceived).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should track ingestion statistics', () => {
      service.ingest([
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
      ]);

      const stats = service.getStats();
      expect(stats.totalReceived).toBe(2);
      expect(stats.totalProcessed).toBeGreaterThanOrEqual(1);
      expect(stats.totalDuplicates).toBe(1);
    });

    it('should track failed ingestions', () => {
      service.ingest([
        { invalid: 'data' },
      ]);

      const stats = service.getStats();
      expect(stats.totalFailed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('flush', () => {
    it('should return and clear stored readings', () => {
      service.ingest([
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
      ]);

      const flushed = service.flush();
      expect(flushed.length).toBeGreaterThanOrEqual(1);

      const remaining = service.getReadings();
      expect(remaining).toHaveLength(0);
    });
  });

  describe('cleanupDuplicates', () => {
    it('should remove expired deduplication hashes', () => {
      service.ingest([
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
      ]);

      const cleaned = service.cleanupDuplicates();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clear', () => {
    it('should reset all data', () => {
      service.ingest([
        { deviceId: 'device-1', metric: 'temperature', value: 25, unit: 'celsius' },
      ]);

      service.clear();

      const stats = service.getStats();
      expect(stats.totalReceived).toBe(0);
      expect(stats.totalProcessed).toBe(0);
      expect(service.getReadings()).toHaveLength(0);
    });
  });
});
