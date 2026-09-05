'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface TableWidgetProps {
  data: {
    title?: string;
    columns?: string[];
    deviceId?: string;
  };
}

export function TableWidget({ data }: TableWidgetProps) {
  const columns = data.columns || ['Time', 'Device', 'Event', 'Severity'];
  
  const rows = [
    { time: '10:30 AM', device: 'Temperature Sensor A1', event: 'Reading updated', severity: 'info' },
    { time: '10:28 AM', device: 'Humidity Sensor B2', event: 'Threshold exceeded', severity: 'warning' },
    { time: '10:25 AM', device: 'Pressure Sensor C3', event: 'Battery low', severity: 'warning' },
    { time: '10:15 AM', device: 'Motion Sensor D4', event: 'Device offline', severity: 'critical' },
    { time: '10:00 AM', device: 'Smart Light E5', event: 'Brightness adjusted', severity: 'info' },
    { time: '09:45 AM', device: 'Camera H8', event: 'Feed interrupted', severity: 'critical' },
    { time: '09:30 AM', device: 'Air Quality Monitor F6', event: 'CO2 elevated', severity: 'warning' },
    { time: '09:00 AM', device: 'Gateway Hub G7', event: 'System restart', severity: 'info' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <ScrollArea className="h-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map((col) => (
              <th key={col} className="text-left py-2 px-3 font-medium text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2 px-3">{row.time}</td>
              <td className="py-2 px-3">{row.device}</td>
              <td className="py-2 px-3">{row.event}</td>
              <td className="py-2 px-3">
                <Badge variant={getSeverityColor(row.severity) as any}>
                  {row.severity}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}
