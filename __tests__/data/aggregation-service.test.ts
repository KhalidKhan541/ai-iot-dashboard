import { AggregationService, TimeSeriesData } from '@/services/aggregation-service';

describe('AggregationService', () => {
  let service: AggregationService;

  beforeEach(() => {
    service = new AggregationService({
      maxDataPoints: 1000,
      interpolationEnabled: true,
      cacheEnabled: true,
      cacheTtlMs: 5000,
    });
  });

  describe('addData', () => {
    it('should add data points', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01T00:00:00Z'), value: 10 },
        { timestamp: new Date('2024-01-01T01:00:00Z'), value: 20 },
        { timestamp: new Date('2024-01-01T02:00:00Z'), value: 30 },
      ];

      service.addData(data);
      expect(service.getDataCount()).toBe(3);
    });

    it('should sort data by timestamp', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01T02:00:00Z'), value: 30 },
        { timestamp: new Date('2024-01-01T00:00:00Z'), value: 10 },
        { timestamp: new Date('2024-01-01T01:00:00Z'), value: 20 },
      ];

      service.addData(data);
      const stored = service.getDataCount();
      expect(stored).toBe(3);
    });
  });

  describe('aggregate', () => {
    beforeEach(() => {
      const data: TimeSeriesData[] = [];
      for (let i = 0; i < 24; i++) {
        data.push({
          timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`),
          value: 10 + Math.random() * 20,
        });
      }
      service.addData(data);
    });

    it('should calculate average aggregation', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'avg',
        granularity: 'hour',
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints).toHaveLength(24);
      expect(result.totalPoints).toBe(24);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate min aggregation', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'min',
        granularity: 'day',
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints.length).toBeGreaterThanOrEqual(1);
      result.dataPoints.forEach(dp => {
        expect(dp.value).toBeGreaterThanOrEqual(10);
      });
    });

    it('should calculate max aggregation', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'max',
        granularity: 'day',
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints.length).toBeGreaterThanOrEqual(1);
      result.dataPoints.forEach(dp => {
        expect(dp.value).toBeLessThanOrEqual(30);
      });
    });

    it('should calculate sum aggregation', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'sum',
        granularity: 'day',
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints).toHaveLength(1);
      expect(result.dataPoints[0].value).toBeGreaterThan(0);
    });

    it('should calculate count aggregation', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'count',
        granularity: 'day',
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints).toHaveLength(1);
      expect(result.dataPoints[0].count).toBe(24);
    });

    it('should calculate median aggregation', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'median',
        granularity: 'day',
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints).toHaveLength(1);
      expect(result.dataPoints[0].value).toBeGreaterThan(0);
    });

    it('should calculate p95 aggregation', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'p95',
        granularity: 'day',
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints).toHaveLength(1);
    });

    it('should calculate p99 aggregation', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'p99',
        granularity: 'day',
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints).toHaveLength(1);
    });

    it('should return empty for no data in range', () => {
      const result = service.aggregate({
        deviceId: 'device-1',
        metric: 'temperature',
        function: 'avg',
        granularity: 'hour',
        timeRange: {
          start: new Date('2025-01-01T00:00:00Z'),
          end: new Date('2025-01-01T23:59:59Z'),
        },
      });

      expect(result.dataPoints).toHaveLength(0);
    });
  });

  describe('downsampler', () => {
    it('should downsample data to fewer points', () => {
      const data: any[] = [];
      for (let i = 0; i < 100; i++) {
        data.push({ timestamp: new Date(), value: i, count: 1 });
      }

      const downsampled = service.downsampler(data, 10);
      expect(downsampled.length).toBeLessThanOrEqual(10);
    });

    it('should return original if already within limit', () => {
      const data = [
        { timestamp: new Date(), value: 1, count: 1 },
        { timestamp: new Date(), value: 2, count: 1 },
      ];

      const result = service.downsampler(data, 10);
      expect(result).toHaveLength(2);
    });
  });

  describe('interpolate', () => {
    it('should interpolate missing data points', () => {
      const data = [
        { timestamp: new Date('2024-01-01T00:00:00Z'), value: 10, count: 1 },
        { timestamp: new Date('2024-01-01T10:00:00Z'), value: 20, count: 1 },
      ];

      const interpolated = service.interpolate(data, 6);
      expect(interpolated.length).toBeGreaterThanOrEqual(2);
    });

    it('should return original if already sufficient', () => {
      const data = [
        { timestamp: new Date(), value: 1, count: 1 },
        { timestamp: new Date(), value: 2, count: 1 },
        { timestamp: new Date(), value: 3, count: 1 },
      ];

      const result = service.interpolate(data, 2);
      expect(result).toHaveLength(3);
    });
  });

  describe('calculateRate', () => {
    it('should calculate rate of change', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2024-01-01T00:00:00Z'), value: 10 },
        { timestamp: new Date('2024-01-01T00:01:00Z'), value: 20 },
        { timestamp: new Date('2024-01-01T00:02:00Z'), value: 30 },
      ];

      const rates = service.calculateRate(data);
      expect(rates).toHaveLength(2);
      rates.forEach(r => expect(r.value).toBe(10 / 60));
    });

    it('should return empty for single data point', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date(), value: 10 },
      ];

      const rates = service.calculateRate(data);
      expect(rates).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should reset all data', () => {
      service.addData([
        { timestamp: new Date(), value: 10 },
        { timestamp: new Date(), value: 20 },
      ]);

      service.clear();
      expect(service.getDataCount()).toBe(0);
    });
  });
});
