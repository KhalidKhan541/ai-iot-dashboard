'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { AlertCard } from '@/components/alerts/alert-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';

export default function AlertsPage() {
  const { alerts, acknowledgeAlert } = useAppStore();

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);
  const criticalAlerts = alerts.filter((a) => a.type === 'critical' && !a.acknowledged);
  const warningAlerts = alerts.filter((a) => a.type === 'warning' && !a.acknowledged);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage system alerts and notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Alert Rule
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {unacknowledgedAlerts.length} unacknowledged
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{criticalAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{acknowledgedAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Resolved alerts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Bell className="h-4 w-4" />
            All Alerts
          </TabsTrigger>
          <TabsTrigger value="unacknowledged" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Active ({unacknowledgedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Resolved ({acknowledgedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onAcknowledge={acknowledgeAlert} />
          ))}
        </TabsContent>

        <TabsContent value="unacknowledged" className="space-y-4">
          {unacknowledgedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All Clear!</h3>
                <p className="text-muted-foreground">No active alerts at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            unacknowledgedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAcknowledge={acknowledgeAlert} />
            ))
          )}
        </TabsContent>

        <TabsContent value="acknowledged" className="space-y-4">
          {acknowledgedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Resolved Alerts</h3>
                <p className="text-muted-foreground">Acknowledged alerts will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            acknowledgedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAcknowledge={acknowledgeAlert} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
