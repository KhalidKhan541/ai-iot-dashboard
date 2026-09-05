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
} from 'recharts';
import { generateTimeSeriesData } from '@/lib/mock-data';

interface LineChartWidgetProps {
  data: {
    title?: string;
    deviceId?: string;
    metric?: string;
    timeRange?: string;
  };
}

export function LineChartWidget({ data }: LineChartWidgetProps) {
  const chartData = useMemo(() => {
    return generateTimeSeriesData(24).map((item) => ({
      ...item,
      value: Number(item.value.toFixed(1)),
      predicted: Number((item.value + (Math.random() - 0.5) * 2).toFixed(1)),
    }));
  }, []);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            formatter={(value: number, name: string) => [value.toFixed(1), name]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(221.2, 83.2%, 53.3%)"
            strokeWidth={2}
            dot={false}
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="hsl(142.1, 76.2%, 36.3%)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Predicted"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
