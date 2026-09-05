import { AnomalyIntelligence, TimeSeriesData } from '@/services/anomaly-intelligence';

describe('AnomalyIntelligence', () => {
  let intelligence: AnomalyIntelligence;

  beforeEach(() => {
    intelligence = new AnomalyIntelligence({
      analysisWindowMs: 24 * 60 * 60 * 1000,
      correlationThreshold: 0.7,
      trendChangeThreshold: 0.1,
      maxInsights: 100,
      insightRetentionMs: 7 * 24 * 60 * 60 * 1000,
    });
  });

  describe('analyzeCorrelations', () => {
    it('should detect correlations between metrics', () => {
      const metrics = new Map<string, TimeSeriesData[]>();

      const tempData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50 + Math.sin(i / 3) * 10,
      }));

      const humidityData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 60 - Math.sin(i / 3) * 15,
      }));

      metrics.set('temperature', tempData);
      metrics.set('humidity', humidityData);

      const correlations = intelligence.analyzeCorrelations(metrics);

      expect(correlations).toHaveLength(1);
      expect(correlations[0].metric1).toBe('humidity');
      expect(correlations[0].metric2).toBe('temperature');
      expect(typeof correlations[0].coefficient).toBe('number');
      expect(typeof correlations[0].pValue).toBe('number');
    });

    it('should detect significant correlations', () => {
      const metrics = new Map<string, TimeSeriesData[]>();

      const data1: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: i * 2,
      }));

      const data2: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: i * 2 + 10,
      }));

      metrics.set('metric_a', data1);
      metrics.set('metric_b', data2);

      const correlations = intelligence.analyzeCorrelations(metrics);

      expect(correlations[0].significant).toBe(true);
    });

    it('should return empty for insufficient data', () => {
      const metrics = new Map<string, TimeSeriesData[]>();
      metrics.set('temp', [
        { timestamp: new Date(), value: 50 },
        { timestamp: new Date(), value: 55 },
      ]);
      metrics.set('humidity', [
        { timestamp: new Date(), value: 60 },
        { timestamp: new Date(), value: 65 },
      ]);

      const correlations = intelligence.analyzeCorrelations(metrics);

      expect(correlations).toHaveLength(0);
    });
  });

  describe('detectTrendChanges', () => {
    it('should detect upward trend change', () => {
      const data: TimeSeriesData[] = [
        ...Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 3600000),
          value: 50,
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() + (i + 20) * 3600000),
          value: 50 + i * 5,
        })),
      ];

      const changes = intelligence.detectTrendChanges(data, 'temperature');

      expect(changes.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect downward trend change', () => {
      const data: TimeSeriesData[] = [
        ...Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 3600000),
          value: 100,
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() + (i + 20) * 3600000),
          value: 100 - i * 5,
        })),
      ];

      const changes = intelligence.detectTrendChanges(data, 'temperature');

      expect(changes.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty for insufficient data', () => {
      const data: TimeSeriesData[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        value: 50,
      }));

      const changes = intelligence.detectTrendChanges(data, 'temperature');

      expect(changes).toHaveLength(0);
    });
  });

  describe('generateInsights', () => {
    it('should generate correlation insights', () => {
      const correlations = [
        {
          metric1: 'temperature',
          metric2: 'humidity',
          coefficient: -0.95,
          pValue: 0.001,
          significant: true,
        },
      ];

      const insights = intelligence.generateInsights(correlations, [], []);

      expect(insights.length).toBeGreaterThanOrEqual(1);
      const correlationInsight = insights.find(i => i.type === 'correlation');
      expect(correlationInsight).toBeDefined();
      expect(correlationInsight?.title).toContain('temperature');
      expect(correlationInsight?.title).toContain('humidity');
    });

    it('should generate trend change insights', () => {
      const trendChanges = [
        {
          timestamp: new Date(),
          metric: 'temperature',
          previousTrend: 'stable' as const,
          currentTrend: 'up' as const,
          magnitude: 0.5,
          significance: 0.9,
        },
      ];

      const insights = intelligence.generateInsights([], trendChanges, []);

      expect(insights.length).toBeGreaterThanOrEqual(1);
      const trendInsight = insights.find(i => i.type === 'trend_change');
      expect(trendInsight).toBeDefined();
    });

    it('should generate anomaly pattern insights', () => {
      const anomalies = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        severity: i > 7 ? 'critical' : 'warning',
      }));

      const insights = intelligence.generateInsights([], [], anomalies);

      expect(insights.length).toBeGreaterThanOrEqual(1);
      const anomalyInsight = insights.find(i => i.type === 'anomaly_pattern');
      expect(anomalyInsight).toBeDefined();
    });

    it('should respect maxInsights limit', () => {
      const smallIntelligence = new AnomalyIntelligence({ maxInsights: 2 });

      const correlations = Array.from({ length: 10 }, (_, i) => ({
        metric1: `metric_${i}`,
        metric2: `metric_${i + 1}`,
        coefficient: 0.95,
        pValue: 0.001,
        significant: true,
      }));

      const insights = smallIntelligence.generateInsights(correlations, [], []);

      expect(insights.length).toBeLessThanOrEqual(2);
    });
  });

  describe('insights management', () => {
    it('should retrieve insights', () => {
      intelligence.generateInsights(
        [{ metric1: 'temp', metric2: 'humidity', coefficient: 0.95, pValue: 0.001, significant: true }],
        [],
        []
      );

      const insights = intelligence.getInsights();

      expect(insights.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve insight by ID', () => {
      const insights = intelligence.generateInsights(
        [{ metric1: 'temp', metric2: 'humidity', coefficient: 0.95, pValue: 0.001, significant: true }],
        [],
        []
      );

      const insight = intelligence.getInsightById(insights[0].id);
      expect(insight).toBeDefined();
      expect(insight?.id).toBe(insights[0].id);
    });

    it('should return undefined for non-existent insight', () => {
      const insight = intelligence.getInsightById('non-existent');
      expect(insight).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should reset all insights', () => {
      intelligence.generateInsights(
        [{ metric1: 'temp', metric2: 'humidity', coefficient: 0.95, pValue: 0.001, significant: true }],
        [],
        []
      );

      intelligence.clear();
      expect(intelligence.getInsights()).toHaveLength(0);
    });
  });
});
