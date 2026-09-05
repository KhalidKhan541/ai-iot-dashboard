'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Device } from '@/lib/types';
import { MapPin, Wifi, WifiOff } from 'lucide-react';

interface DeviceMapProps {
  devices: Device[];
}

export function DeviceMap({ devices }: DeviceMapProps) {
  const locations = [
    { id: 'building-a', name: 'Building A', x: 20, y: 30, width: 35, height: 40 },
    { id: 'building-b', name: 'Building B', x: 60, y: 20, width: 30, height: 35 },
    { id: 'building-c', name: 'Building C', x: 40, y: 65, width: 25, height: 30 },
  ];

  const getDevicePosition = (device: Device) => {
    const buildingIndex = device.location.includes('A')
      ? 0
      : device.location.includes('B')
      ? 1
      : 2;
    const building = locations[buildingIndex];
    return {
      x: building.x + Math.random() * (building.width - 5),
      y: building.y + Math.random() * (building.height - 5),
    };
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full">
        <div className="relative w-full h-full min-h-[300px] bg-muted/30 rounded-lg overflow-hidden">
          {locations.map((building) => (
            <div
              key={building.id}
              className="absolute border-2 border-dashed border-muted-foreground/30 rounded-lg"
              style={{
                left: `${building.x}%`,
                top: `${building.y}%`,
                width: `${building.width}%`,
                height: `${building.height}%`,
              }}
            >
              <span className="absolute top-1 left-2 text-xs text-muted-foreground">
                {building.name}
              </span>
            </div>
          ))}

          {devices.map((device) => {
            const position = getDevicePosition(device);
            return (
              <div
                key={device.id}
                className="absolute group"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                }}
              >
                <div
                  className={`h-3 w-3 rounded-full cursor-pointer transition-transform hover:scale-150 ${
                    device.status === 'online'
                      ? 'bg-green-500'
                      : device.status === 'warning'
                      ? 'bg-yellow-500'
                      : device.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                  }`}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground rounded-lg shadow-lg p-2 whitespace-nowrap text-xs">
                    <p className="font-medium">{device.name}</p>
                    <p className="text-muted-foreground">{device.location}</p>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Online</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span>Error</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-gray-500" />
              <span>Offline</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
