'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { DeviceCard } from '@/components/devices/device-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function DevicesPage() {
  const { devices } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: devices.length,
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    warning: devices.filter((d) => d.status === 'warning').length,
    error: devices.filter((d) => d.status === 'error').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">
            Manage and monitor all your IoT devices.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Device
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Cpu className="h-4 w-4" />
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="online" className="gap-2">
            <Wifi className="h-4 w-4" />
            Online ({statusCounts.online})
          </TabsTrigger>
          <TabsTrigger value="offline" className="gap-2">
            <WifiOff className="h-4 w-4" />
            Offline ({statusCounts.offline})
          </TabsTrigger>
          <TabsTrigger value="warning" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Warning ({statusCounts.warning})
          </TabsTrigger>
          <TabsTrigger value="error" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Error ({statusCounts.error})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredDevices.map((device) => (
                <Link
                  key={device.id}
                  href={`/dashboard/devices/${device.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
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
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-muted-foreground">{device.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{device.type}</Badge>
                    <Badge
                      variant={
                        device.status === 'online'
                          ? 'success'
                          : device.status === 'warning'
                          ? 'warning'
                          : device.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {device.status}
                    </Badge>
                    {device.batteryLevel !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        {device.batteryLevel}%
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <Cpu className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No devices found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
