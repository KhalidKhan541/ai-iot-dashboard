"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
    label?: string;
    error?: string;
    orientation?: "horizontal" | "vertical";
  }
>(
  (
    {
      className,
      label,
      error,
      orientation = "vertical",
      ...props
    },
    ref
  ) => {
    const groupId = React.useId();
    const errorId = `${groupId}-error`;

    return (
      <div>
        {label && (
          <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
        )}
        <RadioGroupPrimitive.Root
          className={cn(
            "gap-2",
            orientation === "horizontal" && "flex flex-wrap",
            orientation === "vertical" && "flex flex-col",
            className
          )}
          aria-describedby={error ? errorId : undefined}
          {...props}
          ref={ref}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label?: string;
  description?: string;
}

const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, label, description, id, ...props }, ref) => {
  const itemId = id || React.useId();
  const descriptionId = `${itemId}-description`;

  return (
    <div className="flex items-start gap-2">
      <RadioGroupPrimitive.Item
        ref={ref}
        id={itemId}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        aria-describedby={description ? descriptionId : undefined}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="h-2.5 w-2.5 fill-current text-current" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {(label || description) && (
        <div className="grid gap-1">
          {label && (
            <label
              htmlFor={itemId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {description && (
            <p id={descriptionId} className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

interface RadioCardProps {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
}

function RadioCard({
  value,
  label,
  description,
  icon,
  selected,
  disabled,
}: RadioCardProps) {
  return (
    <RadioGroupItem
      value={value}
      id={`radio-card-${value}`}
      className="peer sr-only"
      disabled={disabled}
    />
  );
}

export { RadioGroup, RadioGroupItem, RadioCard };
