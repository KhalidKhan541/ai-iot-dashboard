'use client';

import { Dashboard, DashboardWidget } from '@/lib/types';
import { WidgetWrapper } from './widget-wrapper';
import { LineChartWidget } from './widgets/line-chart-widget';
import { BarChartWidget } from './widgets/bar-chart-widget';
import { GaugeWidget } from './widgets/gauge-widget';
import { TableWidget } from './widgets/table-widget';
import { StatusWidget } from './widgets/status-widget';
import { KPIWidget } from './widgets/kpi-widget';
import { HeatmapWidget } from './widgets/heatmap-widget';
import { TextWidget } from './widgets/text-widget';

interface DashboardGridProps {
  dashboard: Dashboard;
  editable?: boolean;
  onWidgetUpdate?: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  onWidgetRemove?: (widgetId: string) => void;
}

function getWidgetComponent(widget: DashboardWidget) {
  switch (widget.type) {
    case 'line-chart':
      return <LineChartWidget data={widget.config} />;
    case 'bar-chart':
      return <BarChartWidget data={widget.config} />;
    case 'gauge':
      return <GaugeWidget data={widget.config} />;
    case 'table':
      return <TableWidget data={widget.config} />;
    case 'status':
      return <StatusWidget data={widget.config} />;
    case 'kpi':
      return <KPIWidget data={widget.config} />;
    case 'heatmap':
      return <HeatmapWidget data={widget.config} />;
    case 'text':
      return <TextWidget data={widget.config} />;
    default:
      return <div className="p-4 text-muted-foreground">Unknown widget type</div>;
  }
}

export function DashboardGrid({ dashboard, editable = false, onWidgetUpdate, onWidgetRemove }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {dashboard.widgets.map((widget) => (
        <div
          key={widget.id}
          className={`col-span-${widget.position.w} row-span-${widget.position.h}`}
          style={{
            gridColumn: `span ${widget.position.w}`,
            gridRow: `span ${widget.position.h}`,
          }}
        >
          <WidgetWrapper
            title={widget.title}
            editable={editable}
            onEdit={() => onWidgetUpdate?.(widget.id, {})}
            onRemove={() => onWidgetRemove?.(widget.id)}
          >
            {getWidgetComponent(widget)}
          </WidgetWrapper>
        </div>
      ))}
    </div>
  );
}
