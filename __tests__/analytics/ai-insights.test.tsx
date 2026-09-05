import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

interface Insight {
  id: string;
  type: 'anomaly_pattern' | 'correlation' | 'trend_change' | 'forecast_alert' | 'optimization';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  affectedMetrics: string[];
  recommendation: string;
  createdAt: Date;
}

interface AIInsightsProps {
  insights: Insight[];
  onSelect?: (id: string) => void;
  onDismiss?: (id: string) => string;
  onApplyRecommendation?: (id: string) => void;
  isLoading?: boolean;
  error?: string;
  refreshInterval?: number;
  lastRefresh?: Date;
}

function AIInsights({
  insights,
  onSelect,
  onDismiss,
  onApplyRecommendation,
  isLoading = false,
  error,
  refreshInterval = 300000,
  lastRefresh,
}: AIInsightsProps) {
  const severityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const typeIcons: Record<string, string> = {
    anomaly_pattern: 'warning',
    correlation: 'link',
    trend_change: 'trending-up',
    forecast_alert: 'clock',
    optimization: 'zap',
  };

  return (
    <div data-testid="ai-insights">
      <div className="insights-header">
        <h2>AI Insights</h2>
        {lastRefresh && (
          <span data-testid="last-refresh">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </span>
        )}
        <span data-testid="refresh-interval">
          Auto-refresh every {refreshInterval / 60000} min
        </span>
      </div>

      {isLoading && (
        <div data-testid="loading-state" className="loading">
          Loading insights...
        </div>
      )}

      {error && (
        <div data-testid="error-state" className="error">
          Error: {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div data-testid="insight-count">{insights.length} insights</div>

          {insights.length === 0 ? (
            <div data-testid="no-insights">No insights available</div>
          ) : (
            <div className="insights-list">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  data-testid={`insight-${insight.id}`}
                  className={`insight-card ${insight.severity}`}
                  onClick={() => onSelect?.(insight.id)}
                >
                  <div className="insight-header">
                    <span
                      data-testid={`insight-type-${insight.id}`}
                      className="type-icon"
                    >
                      {typeIcons[insight.type]}
                    </span>
                    <h3 data-testid={`insight-title-${insight.id}`}>
                      {insight.title}
                    </h3>
                    <span
                      data-testid={`insight-severity-${insight.id}`}
                      className={`severity-badge ${severityColors[insight.severity]}`}
                    >
                      {insight.severity}
                    </span>
                  </div>

                  <p data-testid={`insight-description-${insight.id}`}>
                    {insight.description}
                  </p>

                  <div className="insight-meta">
                    <div
                      data-testid={`insight-confidence-${insight.id}`}
                      className="confidence"
                    >
                      Confidence: {Math.round(insight.confidence * 100)}%
                      <div className="confidence-bar">
                        <div
                          className="confidence-fill"
                          style={{ width: `${insight.confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    {insight.affectedMetrics.length > 0 && (
                      <div
                        data-testid={`insight-metrics-${insight.id}`}
                        className="affected-metrics"
                      >
                        Metrics: {insight.affectedMetrics.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="insight-recommendation">
                    <h4>Recommendation</h4>
                    <p data-testid={`insight-recommendation-${insight.id}`}>
                      {insight.recommendation}
                    </p>
                  </div>

                  <div className="insight-actions">
                    <button
                      data-testid={`apply-${insight.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyRecommendation?.(insight.id);
                      }}
                    >
                      Apply Recommendation
                    </button>
                    <button
                      data-testid={`dismiss-${insight.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss?.(insight.id);
                      }}
                    >
                      Dismiss
                    </button>
                  </div>

                  <div
                    data-testid={`insight-time-${insight.id}`}
                    className="insight-time"
                  >
                    {insight.createdAt.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

describe('AIInsights', () => {
  const defaultInsights: Insight[] = [
    {
      id: 'i1',
      type: 'correlation',
      title: 'Strong correlation between temperature and humidity',
      description: 'Temperature and humidity show a strong negative correlation (r=-0.85)',
      severity: 'medium',
      confidence: 0.92,
      affectedMetrics: ['temperature', 'humidity'],
      recommendation: 'Consider monitoring these metrics together for predictive insights',
      createdAt: new Date('2024-01-01T12:00:00'),
    },
    {
      id: 'i2',
      type: 'anomaly_pattern',
      title: 'Elevated anomaly activity detected',
      description: '15 anomalies detected in the last 24 hours',
      severity: 'high',
      confidence: 0.88,
      affectedMetrics: [],
      recommendation: 'Review system health and check for cascading failures',
      createdAt: new Date('2024-01-01T13:00:00'),
    },
    {
      id: 'i3',
      type: 'trend_change',
      title: 'Trend change in CPU usage',
      description: 'CPU usage trend changed from stable to increasing',
      severity: 'critical',
      confidence: 0.95,
      affectedMetrics: ['cpu_usage'],
      recommendation: 'Investigate potential root cause of trend change',
      createdAt: new Date('2024-01-01T14:00:00'),
    },
  ];

  it('should render insights header', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
  });

  it('should display insight count', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(screen.getByTestId('insight-count')).toHaveTextContent('3 insights');
  });

  it('should render all insights', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(screen.getByTestId('insight-i1')).toBeInTheDocument();
    expect(screen.getByTestId('insight-i2')).toBeInTheDocument();
    expect(screen.getByTestId('insight-i3')).toBeInTheDocument();
  });

  it('should display insight titles', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(
      screen.getByText('Strong correlation between temperature and humidity')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Elevated anomaly activity detected')
    ).toBeInTheDocument();
  });

  it('should display insight descriptions', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(
      screen.getByText('Temperature and humidity show a strong negative correlation (r=-0.85)')
    ).toBeInTheDocument();
  });

  it('should display severity badges', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(screen.getByTestId('insight-severity-i1')).toHaveTextContent('medium');
    expect(screen.getByTestId('insight-severity-i2')).toHaveTextContent('high');
    expect(screen.getByTestId('insight-severity-i3')).toHaveTextContent('critical');
  });

  it('should display confidence scores', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(screen.getByTestId('insight-confidence-i1')).toHaveTextContent('Confidence: 92%');
    expect(screen.getByTestId('insight-confidence-i2')).toHaveTextContent('Confidence: 88%');
  });

  it('should display affected metrics', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(screen.getByTestId('insight-metrics-i1')).toHaveTextContent(
      'Metrics: temperature, humidity'
    );
  });

  it('should display recommendations', () => {
    render(<AIInsights insights={defaultInsights} />);
    expect(screen.getByTestId('insight-recommendation-i1')).toHaveTextContent(
      'Consider monitoring these metrics together for predictive insights'
    );
  });

  it('should show no insights message when empty', () => {
    render(<AIInsights insights={[]} />);
    expect(screen.getByTestId('no-insights')).toBeInTheDocument();
  });

  describe('loading state', () => {
    it('should show loading indicator', () => {
      render(<AIInsights insights={[]} isLoading />);
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('should not show insights list when loading', () => {
      render(<AIInsights insights={defaultInsights} isLoading />);
      expect(screen.queryByTestId('insight-count')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      render(<AIInsights insights={[]} error="Failed to load insights" />);
      expect(screen.getByTestId('error-state')).toHaveTextContent(
        'Error: Failed to load insights'
      );
    });
  });

  describe('refresh information', () => {
    it('should display last refresh time', () => {
      const lastRefresh = new Date('2024-01-01T12:30:00');
      render(<AIInsights insights={defaultInsights} lastRefresh={lastRefresh} />);
      expect(screen.getByTestId('last-refresh')).toBeInTheDocument();
    });

    it('should display refresh interval', () => {
      render(<AIInsights insights={defaultInsights} refreshInterval={600000} />);
      expect(screen.getByTestId('refresh-interval')).toHaveTextContent(
        'Auto-refresh every 10 min'
      );
    });
  });

  describe('actions', () => {
    it('should call onSelect when insight clicked', () => {
      const onSelect = jest.fn();
      render(<AIInsights insights={defaultInsights} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('insight-i1'));

      expect(onSelect).toHaveBeenCalledWith('i1');
    });

    it('should call onApplyRecommendation when apply button clicked', () => {
      const onApplyRecommendation = jest.fn();
      render(
        <AIInsights
          insights={defaultInsights}
          onApplyRecommendation={onApplyRecommendation}
        />
      );

      fireEvent.click(screen.getByTestId('apply-i1'));

      expect(onApplyRecommendation).toHaveBeenCalledWith('i1');
    });

    it('should call onDismiss when dismiss button clicked', () => {
      const onDismiss = jest.fn();
      render(<AIInsights insights={defaultInsights} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByTestId('dismiss-i1'));

      expect(onDismiss).toHaveBeenCalledWith('i1');
    });
  });

  describe('insight types', () => {
    it('should display correlation type', () => {
      render(<AIInsights insights={defaultInsights} />);
      expect(screen.getByTestId('insight-type-i1')).toHaveTextContent('link');
    });

    it('should display anomaly_pattern type', () => {
      render(<AIInsights insights={defaultInsights} />);
      expect(screen.getByTestId('insight-type-i2')).toHaveTextContent('warning');
    });

    it('should display trend_change type', () => {
      render(<AIInsights insights={defaultInsights} />);
      expect(screen.getByTestId('insight-type-i3')).toHaveTextContent('trending-up');
    });
  });
});
