'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/lib/types';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Clock,
  Check,
} from 'lucide-react';

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
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

  const getSeverityBg = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-500/10 text-red-500';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-blue-500/10 text-blue-500';
    }
  };

  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 ${
        !alert.acknowledged ? 'bg-primary/5' : 'opacity-70'
      }`}
    >
      <div className={`rounded-lg p-2 ${getSeverityBg(alert.type)}`}>
        {getIcon(alert.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold">{alert.message}</h3>
          <Badge variant={getSeverityVariant(alert.type) as any}>
            {alert.type}
          </Badge>
          {alert.acknowledged && (
            <Badge variant="outline" className="gap-1">
              <Check className="h-3 w-3" />
              Acknowledged
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-2">{alert.deviceName}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(alert.timestamp).toLocaleString()}
          </span>
          {alert.metric && (
            <span>
              {alert.metric}: {alert.value} ({alert.condition === 'greater' ? '>' : '<'}{' '}
              {alert.threshold})
            </span>
          )}
        </div>
      </div>
      {!alert.acknowledged && onAcknowledge && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAcknowledge(alert.id)}
          className="shrink-0"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Acknowledge
        </Button>
      )}
    </div>
  );
}
