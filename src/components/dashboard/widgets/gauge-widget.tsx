'use client';

import { useMemo } from 'react';

interface GaugeWidgetProps {
  data: {
    title?: string;
    value?: number;
    max?: number;
    unit?: string;
    min?: number;
  };
}

export function GaugeWidget({ data }: GaugeWidgetProps) {
  const value = data.value ?? 45;
  const max = data.max ?? 100;
  const min = data.min ?? 0;
  const unit = data.unit ?? '%';

  const percentage = ((value - min) / (max - min)) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75;

  const getColor = (pct: number) => {
    if (pct < 30) return 'hsl(142.1, 76.2%, 36.3%)';
    if (pct < 70) return 'hsl(47.9, 95.8%, 53.1%)';
    return 'hsl(0, 84.2%, 60.2%)';
  };

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="relative">
        <svg width="120" height="100" viewBox="0 0 120 100">
          <circle
            cx="60"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            transform="rotate(135 60 50)"
          />
          <circle
            cx="60"
            cy="50"
            r="45"
            fill="none"
            stroke={getColor(percentage)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(135 60 50)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </div>
    </div>
  );
}
