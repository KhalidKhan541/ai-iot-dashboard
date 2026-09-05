'use client';

import { use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Settings,
  Power,
  RefreshCw,
  Download,
  Trash2,
  Wifi,
  WifiOff,
  Battery,
  Clock,
  MapPin,
  Cpu,
  HardDrive,
  Thermometer,
  Activity,
} from 'lucide-react';

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { devices, updateDevice } = useAppStore();

  const device = devices.find((d) => d.id === id);

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-bold">Device Not Found</h2>
        <p className="text-muted-foreground">The device you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/devices">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Devices
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/devices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{device.name}</h1>
              <Badge variant={getStatusColor(device.status)}>{device.status}</Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {device.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
          <Button
            variant={device.status === 'online' ? 'destructive' : 'default'}
            size="sm"
          >
            <Power className="mr-2 h-4 w-4" />
            {device.status === 'online' ? 'Restart' : 'Power On'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {device.status === 'online' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{device.status}</div>
            <p className="text-xs text-muted-foreground">
              Last seen {new Date(device.lastSeen).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battery</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{device.batteryLevel ?? 'N/A'}%</div>
            {device.batteryLevel !== undefined && (
              <Progress value={device.batteryLevel} className="mt-2" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firmware</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{device.firmware}</div>
            <p className="text-xs text-muted-foreground">Latest version</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sensors</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{device.sensors.length}</div>
            <p className="text-xs text-muted-foreground">Active readings</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sensors">
        <TabsList>
          <TabsTrigger value="sensors">Sensor Readings</TabsTrigger>
          <TabsTrigger value="info">Device Info</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sensors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {device.sensors.map((sensor) => (
              <Card key={sensor.id}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{sensor.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {sensor.value}
                    <span className="text-lg font-normal text-muted-foreground ml-1">
                      {sensor.unit}
                    </span>
                  </div>
                  {sensor.min !== undefined && sensor.max !== undefined && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{sensor.min}</span>
                        <span>{sensor.max}</span>
                      </div>
                      <Progress
                        value={((sensor.value - sensor.min) / (sensor.max - sensor.min)) * 100}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {new Date(sensor.timestamp).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Link href={`/dashboard/devices/${device.id}/data`}>
            <Button variant="outline" className="gap-2">
              <Activity className="h-4 w-4" />
              View Historical Data
            </Button>
          </Link>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Device ID</dt>
                  <dd className="font-mono text-sm">{device.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Type</dt>
                  <dd className="capitalize">{device.type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">IP Address</dt>
                  <dd className="font-mono text-sm">{device.ipAddress}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">MAC Address</dt>
                  <dd className="font-mono text-sm">{device.macAddress}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Firmware</dt>
                  <dd>{device.firmware}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Location</dt>
                  <dd>{device.location}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: '10:30 AM', event: 'Sensor reading updated', type: 'info' },
                  { time: '10:15 AM', event: 'Firmware check completed', type: 'success' },
                  { time: '9:45 AM', event: 'Connection established', type: 'success' },
                  { time: '9:30 AM', event: 'Device restarted', type: 'warning' },
                  { time: '9:00 AM', event: 'Scheduled maintenance', type: 'info' },
                ].map((log, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-2 w-2 rounded-full ${
                        log.type === 'success'
                          ? 'bg-green-500'
                          : log.type === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{log.event}</p>
                      <p className="text-xs text-muted-foreground">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
