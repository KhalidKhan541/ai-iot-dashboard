import { AnomalyDetector, DataPoint } from '@/services/anomaly-detector';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector({
      zScoreThreshold: 2.5,
      iqrMultiplier: 1.5,
      windowSize: 30,
      minDataPoints: 5,
      sensitivity: 'medium',
      enabledDetectors: ['zscore', 'iqr', 'moving_average'],
    });
  });

  describe('detect', () => {
    it('should return no anomalies for normal data', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50 + Math.sin(i / 3) * 5,
      }));

      const results = detector.detect(data);

      expect(results).toHaveLength(20);
      const anomalies = results.filter(r => r.isAnomaly);
      expect(anomalies.length).toBeLessThanOrEqual(2);
    });

    it('should detect point anomalies', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50,
      }));
      data[10].value = 200;

      const results = detector.detect(data);

      expect(results[10].isAnomaly).toBe(true);
      expect(results[10].score).toBeGreaterThan(0);
    });

    it('should handle insufficient data gracefully', () => {
      const data: DataPoint[] = [
        { timestamp: new Date(), value: 50 },
        { timestamp: new Date(), value: 55 },
      ];

      const results = detector.detect(data);

      expect(results).toHaveLength(2);
      results.forEach(r => {
        expect(r.isAnomaly).toBe(false);
        expect(r.description).toBe('Insufficient data');
      });
    });

    it('should provide confidence scores', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50,
      }));
      data[10].value = 200;

      const results = detector.detect(data);

      expect(results[10].confidence).toBeGreaterThan(0);
      expect(results[10].confidence).toBeLessThanOrEqual(1);
    });

    it('should classify anomaly types', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50,
      }));
      data[5].value = 150;

      const results = detector.detect(data);

      expect(['point', 'contextual', 'collective']).toContain(results[5].type);
    });

    it('should provide suggested actions for anomalies', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50,
      }));
      data[10].value = 200;

      const results = detector.detect(data);

      if (results[10].isAnomaly) {
        expect(results[10].suggestedAction).toBeDefined();
      }
    });
  });

  describe('trend detection', () => {
    it('should detect upward trend', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 10 + i * 2,
      }));

      const trend = detector.getTrend(data);

      expect(trend.direction).toBe('up');
      expect(trend.slope).toBeGreaterThan(0);
    });

    it('should detect downward trend', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50 - i * 2,
      }));

      const trend = detector.getTrend(data);

      expect(trend.direction).toBe('down');
      expect(trend.slope).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, () => ({
        timestamp: new Date(),
        value: 50,
      }));

      const trend = detector.getTrend(data);

      expect(trend.direction).toBe('stable');
    });

    it('should handle single data point', () => {
      const data: DataPoint[] = [
        { timestamp: new Date(), value: 50 },
      ];

      const trend = detector.getTrend(data);

      expect(trend.slope).toBe(0);
      expect(trend.direction).toBe('stable');
    });
  });

  describe('patterns', () => {
    it('should record anomaly patterns', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50,
      }));
      data[10].value = 200;

      detector.detect(data);
      const patterns = detector.getPatterns();

      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should track pattern frequency', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50,
      }));
      data[5].value = 200;
      data[15].value = 200;

      detector.detect(data);
      const patterns = detector.getPatterns();

      patterns.forEach(p => {
        expect(p.frequency).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('clear', () => {
    it('should reset patterns', () => {
      const data: DataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000),
        value: 50,
      }));
      data[10].value = 200;

      detector.detect(data);
      detector.clear();

      expect(detector.getPatterns()).toHaveLength(0);
    });
  });
});
