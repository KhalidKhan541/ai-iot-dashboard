'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Device } from '@/lib/types';
import {
  Wifi,
  WifiOff,
  Battery,
  Clock,
  MapPin,
  ArrowRight,
  Thermometer,
  Droplets,
  Wind,
  Activity,
} from 'lucide-react';

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="h-4 w-4 text-green-500" />;
      case 'warning': return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'error': return <WifiOff className="h-4 w-4 text-red-500" />;
      default: return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSensorIcon = (name: string) => {
    if (name.toLowerCase().includes('temperature')) return <Thermometer className="h-3 w-3" />;
    if (name.toLowerCase().includes('humidity')) return <Droplets className="h-3 w-3" />;
    if (name.toLowerCase().includes('pressure')) return <Wind className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  return (
    <Link href={`/dashboard/devices/${device.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(device.status)}
              <h3 className="font-semibold truncate">{device.name}</h3>
            </div>
            <Badge variant={getStatusColor(device.status) as any}>
              {device.status}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{device.location}</span>
          </div>

          <div className="space-y-2 mb-3">
            {device.sensors.slice(0, 3).map((sensor) => (
              <div key={sensor.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  {getSensorIcon(sensor.name)}
                  <span>{sensor.name}</span>
                </div>
                <span className="font-medium">
                  {sensor.value}
                  <span className="text-muted-foreground ml-0.5">{sensor.unit}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Battery className="h-3 w-3" />
              <span>{device.batteryLevel ?? 'N/A'}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(device.lastSeen).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{device.firmware}</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
