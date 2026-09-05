"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  color?: "primary" | "success" | "warning" | "danger" | "iot";
  size?: "sm" | "default" | "lg";
}

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value,
      indicatorClassName,
      showValue = false,
      formatValue,
      color = "primary",
      size = "default",
      ...props
    },
    ref
  ) => {
    const sizes = {
      sm: "h-1.5",
      default: "h-2.5",
      lg: "h-4",
    };

    const colors = {
      primary: "bg-primary",
      success: "bg-iot-success",
      warning: "bg-iot-warning",
      danger: "bg-iot-danger",
      iot: "bg-iot-teal",
    };

    const displayValue = formatValue
      ? formatValue(value || 0)
      : `${Math.round(value || 0)}%`;

    return (
      <div className="w-full">
        {showValue && (
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">{displayValue}</span>
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-secondary",
            sizes[size],
            className
          )}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              "h-full w-full flex-1 rounded-full transition-all duration-500 ease-in-out",
              colors[color],
              indicatorClassName
            )}
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

interface CircularProgressProps {
  value: number;
  size?: "sm" | "default" | "lg" | "xl";
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
  children?: React.ReactNode;
}

function CircularProgress({
  value,
  size = "default",
  strokeWidth,
  color = "currentColor",
  bgColor = "currentColor",
  showValue = false,
  formatValue,
  className,
  children,
}: CircularProgressProps) {
  const sizes = {
    sm: 32,
    default: 48,
    lg: 64,
    xl: 96,
  };

  const strokeWidths = {
    sm: 3,
    default: 4,
    lg: 5,
    xl: 6,
  };

  const s = sizes[size];
  const sw = strokeWidth || strokeWidths[size];
  const radius = (s - sw) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const displayValue = formatValue
    ? formatValue(value)
    : `${Math.round(value)}%`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: s, height: s }}
    >
      <svg className="h-full w-full -rotate-90">
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={sw}
          className="opacity-20"
        />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <span className="text-xs font-medium">{displayValue}</span>
        )}
      </div>
    </div>
  );
}

export { Progress, CircularProgress };
