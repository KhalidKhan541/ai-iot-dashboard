'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIWidgetProps {
  data: {
    title?: string;
    value?: number | string;
    label?: string;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
    unit?: string;
  };
}

export function KPIWidget({ data }: KPIWidgetProps) {
  const value = data.value ?? 0;
  const change = data.change ?? 0;
  const trend = data.trend ?? 'stable';
  const unit = data.unit ?? '';

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  };

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="text-3xl font-bold">
        {formatValue(value)}
        {unit && <span className="text-lg font-normal text-muted-foreground ml-1">{unit}</span>}
      </div>
      {data.label && (
        <p className="text-sm text-muted-foreground mt-1">{data.label}</p>
      )}
      <div className="flex items-center gap-1 mt-2">
        {trend === 'up' ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : trend === 'down' ? (
          <TrendingDown className="h-4 w-4 text-red-500" />
        ) : (
          <Minus className="h-4 w-4 text-gray-500" />
        )}
        <span
          className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
          }`}
        >
          {change > 0 ? '+' : ''}{change}
        </span>
        <span className="text-xs text-muted-foreground">from last period</span>
      </div>
    </div>
  );
}
