"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, XCircle, AlertTriangle, Info, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        success: "border-iot-success/20 bg-iot-success/10 text-iot-success",
        destructive: "border-iot-danger/20 bg-iot-danger/10 text-iot-danger",
        warning: "border-iot-warning/20 bg-iot-warning/10 text-iot-warning",
        info: "border-iot-info/20 bg-iot-info/10 text-iot-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconMap = {
  default: Info,
  success: CheckCircle,
  destructive: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "destructive" | "warning" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

function ToastProvider({
  children,
  maxToasts = 5,
  position = "top-right",
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 15);
      const newToast = { ...toast, id };
      setToasts((prev) => {
        const updated = [newToast, ...prev].slice(0, maxToasts);
        return updated;
      });
      const duration = toast.duration || 5000;
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
      return id;
    },
    [maxToasts]
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAllToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, removeAllToasts }}
    >
      {children}
      <div
        className={cn(
          "fixed z-[100] flex flex-col gap-2",
          positionClasses[position]
        )}
      >
        {toasts.map((toast) => {
          const variant = toast.variant || "default";
          const IconComponent = iconMap[variant];
          return (
            <div
              key={toast.id}
              className={cn(
                toastVariants({ variant }),
                "animate-in slide-in-from-right-full fade-in-0 duration-300"
              )}
            >
              <IconComponent className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                {toast.title && (
                  <p className="text-sm font-semibold">{toast.title}</p>
                )}
                {toast.description && (
                  <p className="mt-1 text-sm opacity-90">
                    {toast.description}
                  </p>
                )}
              </div>
              {toast.action && (
                <button
                  type="button"
                  onClick={toast.action.onClick}
                  className="inline-flex shrink-0 rounded-md border border-current/20 px-3 py-1 text-sm font-medium transition-colors hover:bg-current/10"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  toast.onDismiss?.();
                  removeToast(toast.id);
                }}
                className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastNotificationProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastNotification({ toast, onDismiss }: ToastNotificationProps) {
  const variant = toast.variant || "default";
  const IconComponent = iconMap[variant];

  return (
    <div
      className={cn(
        toastVariants({ variant }),
        "animate-in slide-in-from-right-full fade-in-0 duration-300"
      )}
    >
      <IconComponent className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        {toast.title && (
          <p className="text-sm font-semibold">{toast.title}</p>
        )}
        {toast.description && (
          <p className="mt-1 text-sm opacity-90">{toast.description}</p>
        )}
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className="inline-flex shrink-0 rounded-md border border-current/20 px-3 py-1 text-sm font-medium transition-colors hover:bg-current/10"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          toast.onDismiss?.();
          onDismiss(toast.id);
        }}
        className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export { ToastProvider, toastVariants, ToastNotification };
