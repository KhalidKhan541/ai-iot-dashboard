import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

interface WidgetConfig {
  deviceId?: string;
  metric?: string;
  chartType?: string;
  timeRange?: string;
}

interface WidgetWrapperProps {
  id: string;
  title: string;
  type: string;
  config: WidgetConfig;
  refreshIntervalMs?: number;
  onRefresh?: (id: string) => void;
  onConfigure?: (id: string) => void;
  onRemove?: (id: string) => void;
  isRefreshing?: boolean;
  error?: string;
  lastUpdated?: Date;
}

function WidgetWrapper({
  id,
  title,
  type,
  config,
  refreshIntervalMs = 30000,
  onRefresh,
  onConfigure,
  onRemove,
  isRefreshing = false,
  error,
  lastUpdated,
}: WidgetWrapperProps) {
  return (
    <div data-testid={`widget-wrapper-${id}`} className="widget-wrapper">
      <div className="widget-header">
        <h3 data-testid={`widget-title-${id}`}>{title}</h3>
        <div className="widget-actions">
          <button
            data-testid={`refresh-${id}`}
            onClick={() => onRefresh?.(id)}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            data-testid={`configure-${id}`}
            onClick={() => onConfigure?.(id)}
          >
            Configure
          </button>
          <button
            data-testid={`remove-widget-${id}`}
            onClick={() => onRemove?.(id)}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="widget-content" data-testid={`widget-content-${id}`}>
        <div data-testid={`widget-type-display-${id}`}>Type: {type}</div>
        <div data-testid={`widget-device-${id}`}>
          Device: {config.deviceId || 'All'}
        </div>
        <div data-testid={`widget-metric-${id}`}>
          Metric: {config.metric || 'N/A'}
        </div>
        {config.timeRange && (
          <div data-testid={`widget-timeRange-${id}`}>
            Time Range: {config.timeRange}
          </div>
        )}
      </div>

      {error && (
        <div className="widget-error" data-testid={`widget-error-${id}`}>
          Error: {error}
        </div>
      )}

      {lastUpdated && (
        <div className="widget-footer" data-testid={`widget-footer-${id}`}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      <div className="widget-meta" data-testid={`widget-meta-${id}`}>
        Refresh every {refreshIntervalMs / 1000}s
      </div>
    </div>
  );
}

describe('WidgetWrapper', () => {
  const defaultProps = {
    id: 'w1',
    title: 'Temperature Chart',
    type: 'chart',
    config: {
      deviceId: 'device-1',
      metric: 'temperature',
      chartType: 'line',
      timeRange: '24h',
    },
  };

  it('should render widget title', () => {
    render(<WidgetWrapper {...defaultProps} />);
    expect(screen.getByTestId('widget-title-w1')).toHaveTextContent('Temperature Chart');
  });

  it('should display widget type', () => {
    render(<WidgetWrapper {...defaultProps} />);
    expect(screen.getByTestId('widget-type-display-w1')).toHaveTextContent('Type: chart');
  });

  it('should display device information', () => {
    render(<WidgetWrapper {...defaultProps} />);
    expect(screen.getByTestId('widget-device-w1')).toHaveTextContent('Device: device-1');
  });

  it('should display metric information', () => {
    render(<WidgetWrapper {...defaultProps} />);
    expect(screen.getByTestId('widget-metric-w1')).toHaveTextContent('Metric: temperature');
  });

  it('should display time range when provided', () => {
    render(<WidgetWrapper {...defaultProps} />);
    expect(screen.getByTestId('widget-timeRange-w1')).toHaveTextContent('Time Range: 24h');
  });

  it('should not display time range when not provided', () => {
    const props = { ...defaultProps, config: { deviceId: 'd1', metric: 'temp' } };
    render(<WidgetWrapper {...props} />);
    expect(screen.queryByTestId('widget-timeRange-w1')).not.toBeInTheDocument();
  });

  it('should display refresh interval', () => {
    render(<WidgetWrapper {...defaultProps} refreshIntervalMs={60000} />);
    expect(screen.getByTestId('widget-meta-w1')).toHaveTextContent('Refresh every 60s');
  });

  describe('actions', () => {
    it('should call onRefresh when refresh button clicked', () => {
      const onRefresh = jest.fn();
      render(<WidgetWrapper {...defaultProps} onRefresh={onRefresh} />);

      fireEvent.click(screen.getByTestId('refresh-w1'));

      expect(onRefresh).toHaveBeenCalledWith('w1');
    });

    it('should call onConfigure when configure button clicked', () => {
      const onConfigure = jest.fn();
      render(<WidgetWrapper {...defaultProps} onConfigure={onConfigure} />);

      fireEvent.click(screen.getByTestId('configure-w1'));

      expect(onConfigure).toHaveBeenCalledWith('w1');
    });

    it('should call onRemove when remove button clicked', () => {
      const onRemove = jest.fn();
      render(<WidgetWrapper {...defaultProps} onRemove={onRemove} />);

      fireEvent.click(screen.getByTestId('remove-widget-w1'));

      expect(onRemove).toHaveBeenCalledWith('w1');
    });

    it('should disable refresh button when refreshing', () => {
      render(<WidgetWrapper {...defaultProps} isRefreshing />);

      const refreshBtn = screen.getByTestId('refresh-w1');
      expect(refreshBtn).toBeDisabled();
      expect(refreshBtn).toHaveTextContent('Refreshing...');
    });
  });

  describe('error state', () => {
    it('should display error message when provided', () => {
      render(<WidgetWrapper {...defaultProps} error="Failed to load data" />);

      expect(screen.getByTestId('widget-error-w1')).toHaveTextContent(
        'Error: Failed to load data'
      );
    });

    it('should not display error when not provided', () => {
      render(<WidgetWrapper {...defaultProps} />);
      expect(screen.queryByTestId('widget-error-w1')).not.toBeInTheDocument();
    });
  });

  describe('last updated', () => {
    it('should display last updated time', () => {
      const lastUpdated = new Date('2024-01-01T12:00:00');
      render(<WidgetWrapper {...defaultProps} lastUpdated={lastUpdated} />);

      expect(screen.getByTestId('widget-footer-w1')).toBeInTheDocument();
    });

    it('should not display footer when no lastUpdated', () => {
      render(<WidgetWrapper {...defaultProps} />);
      expect(screen.queryByTestId('widget-footer-w1')).not.toBeInTheDocument();
    });
  });

  describe('different widget types', () => {
    it('should render gauge widget', () => {
      render(
        <WidgetWrapper
          {...defaultProps}
          type="gauge"
          title="CPU Usage"
          config={{ deviceId: 'server-1', metric: 'cpu' }}
        />
      );

      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Type: gauge')).toBeInTheDocument();
    });

    it('should render table widget', () => {
      render(
        <WidgetWrapper
          {...defaultProps}
          type="table"
          title="Device List"
          config={{}}
        />
      );

      expect(screen.getByText('Device List')).toBeInTheDocument();
      expect(screen.getByText('Device: All')).toBeInTheDocument();
    });

    it('should render KPI widget', () => {
      render(
        <WidgetWrapper
          {...defaultProps}
          type="kpi"
          title="Total Devices"
          config={{ metric: 'count' }}
        />
      );

      expect(screen.getByText('Total Devices')).toBeInTheDocument();
    });
  });
});
