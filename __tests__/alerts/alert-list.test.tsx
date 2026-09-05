import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  deviceId: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  createdAt: Date;
}

interface AlertListProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onSuppress?: (id: string) => void;
  onSelect?: (id: string) => void;
  filter?: {
    severity?: string[];
    status?: string[];
  };
  sortBy?: 'createdAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

function AlertList({
  alerts,
  onAcknowledge,
  onResolve,
  onSuppress,
  onSelect,
  filter,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}: AlertListProps) {
  let filteredAlerts = [...alerts];

  if (filter?.severity?.length) {
    filteredAlerts = filteredAlerts.filter(a =>
      filter.severity!.includes(a.severity)
    );
  }
  if (filter?.status?.length) {
    filteredAlerts = filteredAlerts.filter(a =>
      filter.status!.includes(a.status)
    );
  }

  filteredAlerts.sort((a, b) => {
    if (sortBy === 'severity') {
      const severityOrder = { emergency: 0, critical: 1, warning: 2, info: 3 };
      const diff = severityOrder[a.severity] - severityOrder[b.severity];
      return sortOrder === 'asc' ? diff : -diff;
    }
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    return sortOrder === 'asc' ? diff : -diff;
  });

  const severityColors: Record<string, string> = {
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    critical: 'bg-orange-500',
    emergency: 'bg-red-600',
  };

  return (
    <div data-testid="alert-list">
      <div data-testid="alert-count">{filteredAlerts.length} alerts</div>

      {filteredAlerts.length === 0 ? (
        <div data-testid="no-alerts">No alerts to display</div>
      ) : (
        <div className="alerts-container">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              data-testid={`alert-${alert.id}`}
              className={`alert-item ${alert.severity}`}
              onClick={() => onSelect?.(alert.id)}
            >
              <div className="alert-header">
                <span
                  data-testid={`alert-severity-${alert.id}`}
                  className={`severity-badge ${severityColors[alert.severity]}`}
                >
                  {alert.severity}
                </span>
                <h4 data-testid={`alert-title-${alert.id}`}>{alert.title}</h4>
                <span
                  data-testid={`alert-status-${alert.id}`}
                  className="status-badge"
                >
                  {alert.status}
                </span>
              </div>

              <p data-testid={`alert-message-${alert.id}`}>{alert.message}</p>

              {alert.metric && (
                <div data-testid={`alert-metric-${alert.id}`}>
                  Metric: {alert.metric} | Value: {alert.currentValue} | Threshold: {alert.threshold}
                </div>
              )}

              <div className="alert-footer">
                <span data-testid={`alert-time-${alert.id}`}>
                  {alert.createdAt.toLocaleString()}
                </span>

                <div className="alert-actions">
                  {alert.status === 'active' && (
                    <>
                      <button
                        data-testid={`acknowledge-${alert.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcknowledge?.(alert.id);
                        }}
                      >
                        Acknowledge
                      </button>
                      <button
                        data-testid={`resolve-${alert.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve?.(alert.id);
                        }}
                      >
                        Resolve
                      </button>
                      <button
                        data-testid={`suppress-${alert.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSuppress?.(alert.id);
                        }}
                      >
                        Suppress
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

describe('AlertList', () => {
  const defaultAlerts: Alert[] = [
    {
      id: 'a1',
      title: 'High Temperature',
      message: 'Temperature exceeded threshold',
      severity: 'warning',
      status: 'active',
      deviceId: 'd1',
      metric: 'temperature',
      currentValue: 85,
      threshold: 75,
      createdAt: new Date('2024-01-01T12:00:00'),
    },
    {
      id: 'a2',
      title: 'Low Battery',
      message: 'Battery level is critical',
      severity: 'critical',
      status: 'active',
      deviceId: 'd2',
      metric: 'battery',
      currentValue: 5,
      threshold: 10,
      createdAt: new Date('2024-01-01T13:00:00'),
    },
    {
      id: 'a3',
      title: 'System Update',
      message: 'Firmware update available',
      severity: 'info',
      status: 'acknowledged',
      deviceId: 'd1',
      createdAt: new Date('2024-01-01T14:00:00'),
    },
  ];

  it('should render all alerts', () => {
    render(<AlertList alerts={defaultAlerts} />);
    expect(screen.getByTestId('alert-count')).toHaveTextContent('3 alerts');
  });

  it('should display alert titles', () => {
    render(<AlertList alerts={defaultAlerts} />);
    expect(screen.getByText('High Temperature')).toBeInTheDocument();
    expect(screen.getByText('Low Battery')).toBeInTheDocument();
    expect(screen.getByText('System Update')).toBeInTheDocument();
  });

  it('should display alert messages', () => {
    render(<AlertList alerts={defaultAlerts} />);
    expect(screen.getByText('Temperature exceeded threshold')).toBeInTheDocument();
    expect(screen.getByText('Battery level is critical')).toBeInTheDocument();
  });

  it('should display severity badges', () => {
    render(<AlertList alerts={defaultAlerts} />);
    expect(screen.getByTestId('alert-severity-a1')).toHaveTextContent('warning');
    expect(screen.getByTestId('alert-severity-a2')).toHaveTextContent('critical');
    expect(screen.getByTestId('alert-severity-a3')).toHaveTextContent('info');
  });

  it('should display status badges', () => {
    render(<AlertList alerts={defaultAlerts} />);
    expect(screen.getByTestId('alert-status-a1')).toHaveTextContent('active');
    expect(screen.getByTestId('alert-status-a3')).toHaveTextContent('acknowledged');
  });

  it('should display metric information when available', () => {
    render(<AlertList alerts={defaultAlerts} />);
    expect(screen.getByTestId('alert-metric-a1')).toHaveTextContent(
      'Metric: temperature | Value: 85 | Threshold: 75'
    );
  });

  it('should show no alerts message when list is empty', () => {
    render(<AlertList alerts={[]} />);
    expect(screen.getByTestId('no-alerts')).toBeInTheDocument();
    expect(screen.getByTestId('alert-count')).toHaveTextContent('0 alerts');
  });

  describe('filtering', () => {
    it('should filter by severity', () => {
      render(
        <AlertList alerts={defaultAlerts} filter={{ severity: ['critical'] }} />
      );
      expect(screen.getByTestId('alert-count')).toHaveTextContent('1 alerts');
      expect(screen.getByTestId('alert-a2')).toBeInTheDocument();
    });

    it('should filter by status', () => {
      render(
        <AlertList alerts={defaultAlerts} filter={{ status: ['active'] }} />
      );
      expect(screen.getByTestId('alert-count')).toHaveTextContent('2 alerts');
    });

    it('should combine filters', () => {
      render(
        <AlertList
          alerts={defaultAlerts}
          filter={{ severity: ['warning'], status: ['active'] }}
        />
      );
      expect(screen.getByTestId('alert-count')).toHaveTextContent('1 alerts');
    });
  });

  describe('sorting', () => {
    it('should sort by severity (emergency first)', () => {
      const alerts: Alert[] = [
        { ...defaultAlerts[0], id: 'a1', severity: 'info' },
        { ...defaultAlerts[0], id: 'a2', severity: 'emergency' },
        { ...defaultAlerts[0], id: 'a3', severity: 'warning' },
      ];

      render(<AlertList alerts={alerts} sortBy="severity" sortOrder="asc" />);

      const alertElements = screen.getAllByTestId(/^alert-a/);
      expect(alertElements[0]).toHaveAttribute('data-testid', 'alert-a2');
    });

    it('should sort by creation time', () => {
      render(<AlertList alerts={defaultAlerts} sortBy="createdAt" sortOrder="desc" />);

      const alertElements = screen.getAllByTestId(/^alert-a/);
      expect(alertElements).toHaveLength(3);
    });
  });

  describe('actions', () => {
    it('should call onAcknowledge when button clicked', () => {
      const onAcknowledge = jest.fn();
      render(<AlertList alerts={defaultAlerts} onAcknowledge={onAcknowledge} />);

      fireEvent.click(screen.getByTestId('acknowledge-a1'));

      expect(onAcknowledge).toHaveBeenCalledWith('a1');
    });

    it('should call onResolve when button clicked', () => {
      const onResolve = jest.fn();
      render(<AlertList alerts={defaultAlerts} onResolve={onResolve} />);

      fireEvent.click(screen.getByTestId('resolve-a1'));

      expect(onResolve).toHaveBeenCalledWith('a1');
    });

    it('should call onSuppress when button clicked', () => {
      const onSuppress = jest.fn();
      render(<AlertList alerts={defaultAlerts} onSuppress={onSuppress} />);

      fireEvent.click(screen.getByTestId('suppress-a1'));

      expect(onSuppress).toHaveBeenCalledWith('a1');
    });

    it('should not show action buttons for non-active alerts', () => {
      render(<AlertList alerts={defaultAlerts} />);

      expect(screen.queryByTestId('acknowledge-a3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('resolve-a3')).not.toBeInTheDocument();
    });

    it('should call onSelect when alert clicked', () => {
      const onSelect = jest.fn();
      render(<AlertList alerts={defaultAlerts} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('alert-a1'));

      expect(onSelect).toHaveBeenCalledWith('a1');
    });
  });
});
