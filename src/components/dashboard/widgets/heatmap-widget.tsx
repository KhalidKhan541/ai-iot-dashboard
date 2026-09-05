'use client';

import { useMemo } from 'react';

interface HeatmapWidgetProps {
  data: {
    title?: string;
    metric?: string;
  };
}

export function HeatmapWidget({ data }: HeatmapWidgetProps) {
  const heatmapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    
    return days.map((day) =>
      hours.map((hour) => ({
        day,
        hour,
        value: Math.floor(Math.random() * 100),
      }))
    );
  }, []);

  const getColor = (value: number) => {
    if (value < 25) return 'bg-green-100 dark:bg-green-900/30';
    if (value < 50) return 'bg-green-200 dark:bg-green-800/40';
    if (value < 75) return 'bg-yellow-200 dark:bg-yellow-800/40';
    return 'bg-red-200 dark:bg-red-800/40';
  };

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[600px]">
        <div className="flex gap-1 mb-1">
          <div className="w-12" />
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-[10px] text-muted-foreground text-center">
              {i % 3 === 0 ? `${i}` : ''}
            </div>
          ))}
        </div>
        {heatmapData.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 mb-1">
            <div className="w-12 text-xs text-muted-foreground flex items-center">
              {row[0].day}
            </div>
            {row.map((cell, cellIndex) => (
              <div
                key={cellIndex}
                className={`flex-1 h-4 rounded-sm ${getColor(cell.value)} cursor-pointer hover:opacity-80`}
                title={`${cell.day} ${cell.hour}: ${cell.value}`}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Low</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm bg-green-100 dark:bg-green-900/30" />
            <div className="w-4 h-4 rounded-sm bg-green-200 dark:bg-green-800/40" />
            <div className="w-4 h-4 rounded-sm bg-yellow-200 dark:bg-yellow-800/40" />
            <div className="w-4 h-4 rounded-sm bg-red-200 dark:bg-red-800/40" />
          </div>
          <span className="text-xs text-muted-foreground">High</span>
        </div>
      </div>
    </div>
  );
}
