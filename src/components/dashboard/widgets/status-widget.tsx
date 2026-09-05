'use client';

import { Device } from '@/lib/types';
import { mockDevices } from '@/lib/mock-data';

interface StatusWidgetProps {
  data: {
    title?: string;
    devices?: Device[];
  };
}

export function StatusWidget({ data }: StatusWidgetProps) {
  const devices = data.devices || mockDevices;

  const statusCounts = {
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    warning: devices.filter((d) => d.status === 'warning').length,
    error: devices.filter((d) => d.status === 'error').length,
  };

  const total = devices.length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-sm">
            <span className="font-medium">{statusCounts.online}</span>{' '}
            <span className="text-muted-foreground">Online</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-sm">
            <span className="font-medium">{statusCounts.warning}</span>{' '}
            <span className="text-muted-foreground">Warning</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-sm">
            <span className="font-medium">{statusCounts.error + statusCounts.offline}</span>{' '}
            <span className="text-muted-foreground">Issues</span>
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-auto">
        {devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between rounded-lg border p-2"
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  device.status === 'online'
                    ? 'bg-green-500'
                    : device.status === 'warning'
                    ? 'bg-yellow-500'
                    : device.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                }`}
              />
              <span className="text-sm font-medium truncate max-w-[120px]">{device.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{device.type}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
        <div
          className="bg-green-500 h-full"
          style={{ width: `${(statusCounts.online / total) * 100}%` }}
        />
        <div
          className="bg-yellow-500 h-full"
          style={{ width: `${(statusCounts.warning / total) * 100}%` }}
        />
        <div
          className="bg-red-500 h-full"
          style={{ width: `${((statusCounts.error + statusCounts.offline) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
