import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox, Search, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "teal";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "default" | "lg";
}

function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
  size = "default",
}: EmptyStateProps) {
  const sizes = {
    sm: "py-8",
    default: "py-12",
    lg: "py-16",
  };

  const iconSizes = {
    sm: "h-10 w-10",
    default: "h-14 w-14",
    lg: "h-20 w-20",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizes[size],
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          iconSizes[size]
        )}
      >
        {icon || <Inbox className="h-1/2 w-1/2" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <Button
              variant={action.variant || "default"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function NoSearchResults({
  onClear,
}: {
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-10 w-10" />}
      title="No results found"
      description="Try adjusting your search or filter criteria"
      action={
        onClear
          ? {
              label: "Clear search",
              onClick: onClear,
              variant: "outline",
            }
          : undefined
      }
    />
  );
}

function NoData({
  message,
  onRefresh,
}: {
  message?: string;
  onRefresh?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-10 w-10" />}
      title="No data available"
      description={message || "There's no data to display at the moment"}
      action={
        onRefresh
          ? {
              label: "Refresh",
              onClick: onRefresh,
              variant: "outline",
            }
          : undefined
      }
    />
  );
}

function ConnectionState({
  connected,
  onReconnect,
}: {
  connected: boolean;
  onReconnect?: () => void;
}) {
  return (
    <EmptyState
      icon={
        connected ? (
          <Wifi className="h-10 w-10 text-iot-success" />
        ) : (
          <WifiOff className="h-10 w-10 text-iot-danger" />
        )
      }
      title={connected ? "Connected" : "Disconnected"}
      description={
        connected
          ? "You are connected to the IoT network"
          : "Unable to connect to the IoT network. Check your connection."
      }
      action={
        !connected && onReconnect
          ? {
              label: "Reconnect",
              onClick: onReconnect,
            }
          : undefined
      }
    />
  );
}

export { EmptyState, NoSearchResults, NoData, ConnectionState };
