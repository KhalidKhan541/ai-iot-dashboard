import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  location: string;
  batteryLevel?: number;
  lastSeen: Date;
  firmware: string;
}

interface DeviceCardProps {
  device: Device;
  onSelect?: (id: string) => void;
  onConfigure?: (id: string) => void;
  onRemove?: (id: string) => void;
  selected?: boolean;
}

function DeviceCard({
  device,
  onSelect,
  onConfigure,
  onRemove,
  selected = false,
}: DeviceCardProps) {
  const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div
      data-testid={`device-card-${device.id}`}
      className={`device-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect?.(device.id)}
    >
      <div className="device-header">
        <h3 data-testid={`device-name-${device.id}`}>{device.name}</h3>
        <span
          data-testid={`device-status-${device.id}`}
          className={`status-indicator ${statusColors[device.status]}`}
        >
          {device.status}
        </span>
      </div>

      <div className="device-info">
        <div data-testid={`device-type-${device.id}`}>Type: {device.type}</div>
        <div data-testid={`device-location-${device.id}`}>Location: {device.location}</div>
        <div data-testid={`device-firmware-${device.id}`}>Firmware: {device.firmware}</div>
        {device.batteryLevel !== undefined && (
          <div data-testid={`device-battery-${device.id}`}>
            Battery: {device.batteryLevel}%
            <div className="battery-bar">
              <div
                className="battery-fill"
                style={{ width: `${device.batteryLevel}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="device-footer">
        <div data-testid={`device-lastSeen-${device.id}`}>
          Last seen: {device.lastSeen.toLocaleString()}
        </div>
        <div className="device-actions">
          <button
            data-testid={`configure-device-${device.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onConfigure?.(device.id);
            }}
          >
            Configure
          </button>
          <button
            data-testid={`remove-device-${device.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(device.id);
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

describe('DeviceCard', () => {
  const defaultDevice: Device = {
    id: 'dev-1',
    name: 'Temperature Sensor',
    type: 'sensor',
    status: 'online',
    location: 'Building A - Floor 1',
    batteryLevel: 85,
    lastSeen: new Date('2024-01-01T12:00:00'),
    firmware: '1.0.0',
  };

  it('should render device name', () => {
    render(<DeviceCard device={defaultDevice} />);
    expect(screen.getByTestId('device-name-dev-1')).toHaveTextContent('Temperature Sensor');
  });

  it('should display device status', () => {
    render(<DeviceCard device={defaultDevice} />);
    expect(screen.getByTestId('device-status-dev-1')).toHaveTextContent('online');
  });

  it('should display device type', () => {
    render(<DeviceCard device={defaultDevice} />);
    expect(screen.getByTestId('device-type-dev-1')).toHaveTextContent('Type: sensor');
  });

  it('should display device location', () => {
    render(<DeviceCard device={defaultDevice} />);
    expect(screen.getByTestId('device-location-dev-1')).toHaveTextContent(
      'Location: Building A - Floor 1'
    );
  });

  it('should display firmware version', () => {
    render(<DeviceCard device={defaultDevice} />);
    expect(screen.getByTestId('device-firmware-dev-1')).toHaveTextContent('Firmware: 1.0.0');
  });

  it('should display battery level when provided', () => {
    render(<DeviceCard device={defaultDevice} />);
    expect(screen.getByTestId('device-battery-dev-1')).toHaveTextContent('Battery: 85%');
  });

  it('should not display battery level when not provided', () => {
    const device = { ...defaultDevice, batteryLevel: undefined };
    render(<DeviceCard device={device} />);
    expect(screen.queryByTestId('device-battery-dev-1')).not.toBeInTheDocument();
  });

  it('should display last seen time', () => {
    render(<DeviceCard device={defaultDevice} />);
    expect(screen.getByTestId('device-lastSeen-dev-1')).toBeInTheDocument();
  });

  describe('status indicators', () => {
    it('should show online status', () => {
      render(<DeviceCard device={defaultDevice} />);
      const status = screen.getByTestId('device-status-dev-1');
      expect(status).toHaveTextContent('online');
      expect(status.className).toContain('bg-green-500');
    });

    it('should show offline status', () => {
      const device = { ...defaultDevice, status: 'offline' as const };
      render(<DeviceCard device={device} />);
      expect(screen.getByTestId('device-status-dev-1')).toHaveTextContent('offline');
    });

    it('should show warning status', () => {
      const device = { ...defaultDevice, status: 'warning' as const };
      render(<DeviceCard device={device} />);
      expect(screen.getByTestId('device-status-dev-1')).toHaveTextContent('warning');
    });

    it('should show error status', () => {
      const device = { ...defaultDevice, status: 'error' as const };
      render(<DeviceCard device={device} />);
      expect(screen.getByTestId('device-status-dev-1')).toHaveTextContent('error');
    });
  });

  describe('interactions', () => {
    it('should call onSelect when card clicked', () => {
      const onSelect = jest.fn();
      render(<DeviceCard device={defaultDevice} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('device-card-dev-1'));

      expect(onSelect).toHaveBeenCalledWith('dev-1');
    });

    it('should call onConfigure when configure button clicked', () => {
      const onConfigure = jest.fn();
      render(<DeviceCard device={defaultDevice} onConfigure={onConfigure} />);

      fireEvent.click(screen.getByTestId('configure-device-dev-1'));

      expect(onConfigure).toHaveBeenCalledWith('dev-1');
    });

    it('should call onRemove when remove button clicked', () => {
      const onRemove = jest.fn();
      render(<DeviceCard device={defaultDevice} onRemove={onRemove} />);

      fireEvent.click(screen.getByTestId('remove-device-dev-1'));

      expect(onRemove).toHaveBeenCalledWith('dev-1');
    });

    it('should not propagate click when action button clicked', () => {
      const onSelect = jest.fn();
      const onConfigure = jest.fn();
      render(
        <DeviceCard device={defaultDevice} onSelect={onSelect} onConfigure={onConfigure} />
      );

      fireEvent.click(screen.getByTestId('configure-device-dev-1'));

      expect(onConfigure).toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('selection state', () => {
    it('should apply selected class when selected', () => {
      render(<DeviceCard device={defaultDevice} selected />);
      const card = screen.getByTestId('device-card-dev-1');
      expect(card.className).toContain('selected');
    });

    it('should not apply selected class when not selected', () => {
      render(<DeviceCard device={defaultDevice} selected={false} />);
      const card = screen.getByTestId('device-card-dev-1');
      expect(card.className).not.toContain('selected');
    });
  });

  describe('device types', () => {
    it('should render sensor device', () => {
      render(<DeviceCard device={defaultDevice} />);
      expect(screen.getByText('Type: sensor')).toBeInTheDocument();
    });

    it('should render actuator device', () => {
      const device = { ...defaultDevice, type: 'actuator' };
      render(<DeviceCard device={device} />);
      expect(screen.getByText('Type: actuator')).toBeInTheDocument();
    });

    it('should render gateway device', () => {
      const device = { ...defaultDevice, type: 'gateway' };
      render(<DeviceCard device={device} />);
      expect(screen.getByText('Type: gateway')).toBeInTheDocument();
    });
  });
});
