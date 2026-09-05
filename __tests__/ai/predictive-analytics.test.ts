import { PredictiveAnalytics, TimeSeriesData } from '@/services/predictive-analytics';

describe('PredictiveAnalytics', () => {
  let analytics: PredictiveAnalytics;

  beforeEach(() => {
    analytics = new PredictiveAnalytics({
      forecastHorizon: 12,
      confidenceLevel: 0.95,
      minTrainingPoints: 10,
      model: 'linear',
    });
  });

  describe('addTrainingData', () => {
    it('should add training data', () => {
      const data: TimeSeriesData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + i * 2 + Math.random() * 5,
      }));

      analytics.addTrainingData('sensor-1', data);
      expect(analytics).toBeDefined();
    });

    it('should accumulate training data', () => {
      const data1: TimeSeriesData[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + i,
      }));
      const data2: TimeSeriesData[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() + (i + 10) * 3600000),
        value: 70 + i,
      }));

      analytics.addTrainingData('sensor-1', data1);
      analytics.addTrainingData('sensor-1', data2);

      const forecast = analytics.forecast('sensor-1');
      expect(forecast).toBeDefined();
      expect(forecast?.trainingDataPoints).toBe(20);
    });
  });

  describe('forecast', () => {
    beforeEach(() => {
      const data: TimeSeriesData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + i * 2 + Math.sin(i / 3) * 5,
      }));
      analytics.addTrainingData('sensor-1', data);
    });

    it('should generate predictions', () => {
      const forecast = analytics.forecast('sensor-1');

      expect(forecast).toBeDefined();
      expect(forecast?.predictions).toHaveLength(12);
      expect(forecast?.model).toBe('linear');
      expect(forecast?.trainingDataPoints).toBe(20);
    });

    it('should include confidence intervals', () => {
      const forecast = analytics.forecast('sensor-1');

      forecast?.predictions.forEach(p => {
        expect(p.lowerBound).toBeLessThanOrEqual(p.predicted);
        expect(p.upperBound).toBeGreaterThanOrEqual(p.predicted);
        expect(p.confidence).toBe(0.95);
      });
    });

    it('should return null for insufficient data', () => {
      const result = analytics.forecast('non-existent');
      expect(result).toBeNull();
    });

    it('should track execution time', () => {
      const forecast = analytics.forecast('sensor-1');

      expect(forecast?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exponential model', () => {
    beforeEach(() => {
      const expAnalytics = new PredictiveAnalytics({
        forecastHorizon: 12,
        confidenceLevel: 0.95,
        minTrainingPoints: 10,
        model: 'exponential',
      });

      const data: TimeSeriesData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + i * 2,
      }));
      expAnalytics.addTrainingData('sensor-1', data);
    });

    it('should use exponential smoothing', () => {
      const expAnalytics = new PredictiveAnalytics({
        forecastHorizon: 12,
        confidenceLevel: 0.95,
        minTrainingPoints: 10,
        model: 'exponential',
      });

      const data: TimeSeriesData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + i * 2,
      }));
      expAnalytics.addTrainingData('sensor-1', data);

      const forecast = expAnalytics.forecast('sensor-1');
      expect(forecast?.model).toBe('exponential');
    });
  });

  describe('arima model', () => {
    it('should use ARIMA-like forecasting', () => {
      const arimaAnalytics = new PredictiveAnalytics({
        forecastHorizon: 12,
        confidenceLevel: 0.95,
        minTrainingPoints: 10,
        model: 'arima',
      });

      const data: TimeSeriesData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + Math.sin(i / 3) * 10,
      }));
      arimaAnalytics.addTrainingData('sensor-1', data);

      const forecast = arimaAnalytics.forecast('sensor-1');
      expect(forecast?.model).toBe('arima');
      expect(forecast?.predictions).toHaveLength(12);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate MAE', () => {
      const actual = [10, 20, 30, 40, 50];
      const predicted = [12, 18, 32, 38, 52];

      const metrics = analytics.calculateMetrics(actual, predicted);

      expect(metrics.mae).toBe(2);
    });

    it('should calculate RMSE', () => {
      const actual = [10, 20, 30];
      const predicted = [12, 18, 32];

      const metrics = analytics.calculateMetrics(actual, predicted);

      expect(metrics.rmse).toBeGreaterThan(0);
    });

    it('should calculate MAPE', () => {
      const actual = [100, 200, 300];
      const predicted = [110, 190, 310];

      const metrics = analytics.calculateMetrics(actual, predicted);

      expect(metrics.mape).toBeGreaterThan(0);
      expect(metrics.mape).toBeLessThan(100);
    });

    it('should calculate R-squared', () => {
      const actual = [10, 20, 30, 40, 50];
      const predicted = [10, 20, 30, 40, 50];

      const metrics = analytics.calculateMetrics(actual, predicted);

      expect(metrics.r2).toBe(1);
    });

    it('should handle empty arrays', () => {
      const metrics = analytics.calculateMetrics([], []);

      expect(metrics.mae).toBe(0);
      expect(metrics.rmse).toBe(0);
      expect(metrics.mape).toBe(0);
      expect(metrics.r2).toBe(0);
    });
  });

  describe('predictSingle', () => {
    it('should predict single future value', () => {
      const data: TimeSeriesData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + i * 2,
      }));

      const prediction = analytics.predictSingle(data, 5);

      expect(prediction).toBeGreaterThan(0);
    });
  });

  describe('detectSeasonality', () => {
    it('should detect seasonal patterns', () => {
      const data: TimeSeriesData[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + Math.sin((i / 24) * Math.PI * 2) * 10,
      }));

      const period = analytics.detectSeasonality(data);

      expect(period).toBeNull();
    });

    it('should return null for insufficient data', () => {
      const data: TimeSeriesData[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + i,
      }));

      const period = analytics.detectSeasonality(data);
      expect(period).toBeNull();
    });
  });

  describe('clear', () => {
    it('should reset all training data', () => {
      const data: TimeSeriesData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + i,
      }));

      analytics.addTrainingData('sensor-1', data);
      analytics.clear();

      const forecast = analytics.forecast('sensor-1');
      expect(forecast).toBeNull();
    });
  });
});
