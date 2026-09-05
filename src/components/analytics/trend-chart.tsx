'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { generateTimeSeriesData } from '@/lib/mock-data';

interface TrendChartProps {
  metric: string;
}

export function TrendChart({ metric }: TrendChartProps) {
  const chartData = useMemo(() => {
    const baseData = generateTimeSeriesData(48);
    return baseData.map((item, index) => ({
      ...item,
      value: Number(item.value.toFixed(1)),
      predicted: index > 36 ? Number((item.value + (Math.random() - 0.5) * 3).toFixed(1)) : null,
      lower: index > 36 ? Number((item.value - 2).toFixed(1)) : null,
      upper: index > 36 ? Number((item.value + 2).toFixed(1)) : null,
    }));
  }, [metric]);

  const getMetricColor = () => {
    switch (metric.toLowerCase()) {
      case 'temperature':
        return 'hsl(0, 84.2%, 60.2%)';
      case 'humidity':
        return 'hsl(221.2, 83.2%, 53.3%)';
      case 'energy':
        return 'hsl(142.1, 76.2%, 36.3%)';
      default:
        return 'hsl(221.2, 83.2%, 53.3%)';
    }
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getMetricColor()} stopOpacity={0.3} />
              <stop offset="95%" stopColor={getMetricColor()} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getHours()}:00`;
            }}
            fontSize={12}
          />
          <YAxis fontSize={12} />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value: number, name: string) => [value?.toFixed(1), name]}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="value"
            stroke={getMetricColor()}
            fill={`url(#gradient-${metric})`}
            strokeWidth={2}
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke={getMetricColor()}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Predicted"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
