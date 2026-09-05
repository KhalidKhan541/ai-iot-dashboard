'use client';

import { use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { LineChartWidget } from '@/components/dashboard/widgets/line-chart-widget';
import { BarChartWidget } from '@/components/dashboard/widgets/bar-chart-widget';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function DeviceDataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { devices } = useAppStore();
  const [timeRange, setTimeRange] = useState('24h');

  const device = devices.find((d) => d.id === id);

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-bold">Device Not Found</h2>
        <Link href="/dashboard/devices">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Devices
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/devices/${device.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Device Data</h1>
            <p className="text-muted-foreground">{device.name} - Historical sensor readings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {device.sensors.map((sensor) => (
          <Card key={sensor.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{sensor.name}</CardTitle>
                <div className="text-right">
                  <span className="text-2xl font-bold">{sensor.value}</span>
                  <span className="text-muted-foreground ml-1">{sensor.unit}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {sensor.name.toLowerCase().includes('temperature') ||
                sensor.name.toLowerCase().includes('humidity') ? (
                  <LineChartWidget
                    data={{
                      title: sensor.name,
                      deviceId: device.id,
                      metric: sensor.name,
                    }}
                  />
                ) : (
                  <BarChartWidget
                    data={{
                      title: sensor.name,
                      deviceId: device.id,
                      metric: sensor.name,
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
