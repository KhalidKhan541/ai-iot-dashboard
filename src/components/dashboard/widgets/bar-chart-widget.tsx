'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface BarChartWidgetProps {
  data: {
    title?: string;
    deviceId?: string;
    metric?: string;
  };
}

export function BarChartWidget({ data }: BarChartWidgetProps) {
  const chartData = useMemo(() => [
    { name: 'Mon', value: 85, target: 90 },
    { name: 'Tue', value: 72, target: 90 },
    { name: 'Wed', value: 95, target: 90 },
    { name: 'Thu', value: 88, target: 90 },
    { name: 'Fri', value: 79, target: 90 },
    { name: 'Sat', value: 65, target: 90 },
    { name: 'Sun', value: 58, target: 90 },
  ], []);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="value"
            fill="hsl(221.2, 83.2%, 53.3%)"
            radius={[4, 4, 0, 0]}
            name="Actual"
          />
          <Bar
            dataKey="target"
            fill="hsl(210, 40%, 96.1%)"
            radius={[4, 4, 0, 0]}
            name="Target"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
