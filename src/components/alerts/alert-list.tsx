'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/lib/types';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Bell,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface AlertListProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
}

export function AlertList({ alerts, onAcknowledge }: AlertListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Alerts
          </CardTitle>
          <Badge variant="outline">{alerts.length} total</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                !alert.acknowledged ? 'bg-primary/5' : ''
              }`}
            >
              <div className="mt-0.5">{getIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{alert.message}</p>
                  <Badge variant={getSeverityVariant(alert.type) as any}>
                    {alert.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{alert.deviceName}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  {alert.value !== undefined && alert.threshold !== undefined && (
                    <span>
                      • Value: {alert.value} (Threshold: {alert.threshold})
                    </span>
                  )}
                </div>
              </div>
              {!alert.acknowledged && onAcknowledge && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAcknowledge(alert.id)}
                  className="shrink-0"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Acknowledge
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
