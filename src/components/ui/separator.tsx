"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & {
    label?: string;
    icon?: React.ReactNode;
  }
>(
  (
    {
      className,
      orientation = "horizontal",
      decorative = true,
      label,
      icon,
      ...props
    },
    ref
  ) => {
    if (label || icon) {
      return (
        <div className="relative flex items-center py-4">
          <SeparatorPrimitive.Root
            ref={ref}
            decorative={decorative}
            orientation={orientation}
            className={cn(
              "shrink-0 bg-border",
              orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
              className
            )}
            {...props}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2">
            {icon ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {icon}
                {label && <span>{label}</span>}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{label}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          "shrink-0 bg-border",
          orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
          className
        )}
        {...props}
      />
    );
  }
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

function Divider({ orientation = "horizontal", label, icon, className }: DividerProps) {
  return (
    <Separator
      orientation={orientation}
      label={label}
      icon={icon}
      className={className}
    />
  );
}

export { Separator, Divider };
