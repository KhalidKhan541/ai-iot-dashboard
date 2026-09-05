"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: string;
  showValue?: boolean;
  showMarks?: boolean;
  marks?: Array<{ value: number; label?: string }>;
  formatValue?: (value: number) => string;
}

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      label,
      showValue = false,
      showMarks = false,
      marks = [],
      formatValue,
      min = 0,
      max = 100,
      step = 1,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const sliderId = React.useId();
    const [currentValue, setCurrentValue] = React.useState<number[]>(
      value || defaultValue || [min]
    );

    React.useEffect(() => {
      if (value) setCurrentValue(value as number[]);
    }, [value]);

    const displayValue = currentValue[0] ?? min;
    const formattedValue = formatValue
      ? formatValue(displayValue)
      : displayValue.toString();

    return (
      <div className="w-full">
        {(label || showValue) && (
          <div className="mb-2 flex items-center justify-between">
            {label && (
              <label
                htmlFor={sliderId}
                className="text-sm font-medium text-foreground"
              >
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm font-medium text-muted-foreground">
                {formattedValue}
              </span>
            )}
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          id={sliderId}
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
          )}
          min={min}
          max={max}
          step={step}
          value={value || currentValue}
          onValueChange={(val) => {
            setCurrentValue(val);
            props.onValueChange?.(val);
          }}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </SliderPrimitive.Track>
          {(value || currentValue).map((_, index) => (
            <SliderPrimitive.Thumb
              key={index}
              className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            />
          ))}
        </SliderPrimitive.Root>
        {showMarks && marks.length > 0 && (
          <div className="relative mt-2">
            {marks.map((mark) => {
              const percentage =
                ((mark.value - min) / (max - min)) * 100;
              return (
                <div
                  key={mark.value}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${percentage}%`, transform: "translateX(-50%)" }}
                >
                  <div className="h-1 w-px bg-muted-foreground/50" />
                  {mark.label && (
                    <span className="mt-1 text-xs text-muted-foreground">
                      {mark.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
Slider.displayName = SliderPrimitive.Root.displayName;

interface RangeSliderProps {
  value?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

function RangeSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = false,
  formatValue,
  className,
}: RangeSliderProps) {
  const [localValue, setLocalValue] = React.useState<[number, number]>(
    value || [min, max]
  );

  React.useEffect(() => {
    if (value) setLocalValue(value);
  }, [value]);

  const displayMin = formatValue
    ? formatValue(localValue[0])
    : localValue[0].toString();
  const displayMax = formatValue
    ? formatValue(localValue[1])
    : localValue[1].toString();

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-foreground">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm text-muted-foreground">
              {displayMin} - {displayMax}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={value || localValue}
        onValueChange={(val) => {
          setLocalValue(val as [number, number]);
          onValueChange?.(val as [number, number]);
        }}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
    </div>
  );
}

export { Slider, RangeSlider };
