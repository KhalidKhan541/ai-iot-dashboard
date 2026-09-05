'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import {
  Cpu,
  Bell,
  Thermometer,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
  const { devices, alerts, dashboards } = useAppStore();

  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const offlineDevices = devices.filter((d) => d.status === 'offline').length;
  const warningDevices = devices.filter((d) => d.status === 'warning').length;
  const errorDevices = devices.filter((d) => d.status === 'error').length;
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;

  const kpis = [
    {
      title: 'Total Devices',
      value: devices.length,
      change: '+2',
      trend: 'up' as const,
      icon: Cpu,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Alerts',
      value: unacknowledgedAlerts,
      change: '+1',
      trend: 'up' as const,
      icon: Bell,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Avg Temperature',
      value: '22.5°C',
      change: '-0.5°',
      trend: 'down' as const,
      icon: Thermometer,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'System Uptime',
      value: '99.97%',
      change: '+0.02%',
      trend: 'up' as const,
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  const statusDistribution = [
    { label: 'Online', count: onlineDevices, color: 'bg-green-500', icon: CheckCircle2 },
    { label: 'Warning', count: warningDevices, color: 'bg-yellow-500', icon: AlertTriangle },
    { label: 'Error', count: errorDevices, color: 'bg-red-500', icon: XCircle },
    { label: 'Offline', count: offlineDevices, color: 'bg-gray-500', icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your IoT devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/dashboards/create">
            <Button>Create Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <div className={`rounded-lg p-2 ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {kpi.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                  {kpi.change}
                </span>
                <span>from last hour</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Device Status Distribution</CardTitle>
              <Link href="/dashboard/devices">
                <Button variant="ghost" size="sm" className="gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusDistribution.map((status) => (
                <div key={status.label} className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${status.color} mr-3`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{status.label}</span>
                      <span className="text-sm text-muted-foreground">{status.count} devices</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${status.color}`}
                        style={{ width: `${(status.count / devices.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Alerts</CardTitle>
              <Link href="/dashboard/alerts">
                <Button variant="ghost" size="sm" className="gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div
                    className={`mt-0.5 rounded-full p-1 ${
                      alert.type === 'critical'
                        ? 'bg-red-500/10 text-red-500'
                        : alert.type === 'warning'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {alert.type === 'critical' ? (
                      <XCircle className="h-3 w-3" />
                    ) : alert.type === 'warning' ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.deviceName}</p>
                  </div>
                  <Badge
                    variant={
                      alert.type === 'critical'
                        ? 'destructive'
                        : alert.type === 'warning'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="shrink-0"
                  >
                    {alert.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Dashboards</CardTitle>
              <Link href="/dashboard/dashboards">
                <Button variant="ghost" size="sm" className="gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboards.slice(0, 3).map((dashboard) => (
                <Link
                  key={dashboard.id}
                  href={`/dashboard/dashboards/${dashboard.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{dashboard.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.widgets.length} widgets
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/devices">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <Cpu className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Manage Devices</p>
                    <p className="text-xs text-muted-foreground">View all devices</p>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/alerts/rules">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <Bell className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Alert Rules</p>
                    <p className="text-xs text-muted-foreground">Configure alerts</p>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <Activity className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">AI Analytics</p>
                    <p className="text-xs text-muted-foreground">View insights</p>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/rules/create">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <TrendingUp className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Create Rule</p>
                    <p className="text-xs text-muted-foreground">Build automation</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
