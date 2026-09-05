import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/breadcrumb";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  icon,
  badge,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-iot-teal/10 text-iot-teal">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
}

interface PageHeaderActionProps {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline";
}

function PageHeaderAction({
  label,
  icon,
  onClick,
  variant = "default",
}: PageHeaderActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
        variant === "default" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" &&
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export { PageHeader, PageHeaderAction };
