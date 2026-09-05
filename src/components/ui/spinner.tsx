import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "default" | "lg" | "xl";
  color?: "primary" | "secondary" | "destructive" | "muted" | "iot";
}

function Spinner({
  size = "default",
  color = "primary",
  className,
  ...props
}: SpinnerProps) {
  const sizes = {
    xs: "h-3 w-3 border",
    sm: "h-4 w-4 border-[1.5px]",
    default: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-2",
    xl: "h-12 w-12 border-[3px]",
  };

  const colors = {
    primary: "border-primary border-t-transparent",
    secondary: "border-secondary border-t-transparent",
    destructive: "border-destructive border-t-transparent",
    muted: "border-muted-foreground border-t-transparent",
    iot: "border-iot-teal border-t-transparent",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizes[size],
        colors[color],
        className
      )}
      {...props}
    />
  );
}

interface LoadingOverlayProps {
  loading: boolean;
  text?: string;
  size?: "xs" | "sm" | "default" | "lg" | "xl";
  className?: string;
}

function LoadingOverlay({
  loading,
  text,
  size = "default",
  className,
}: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <Spinner size={size} color="iot" />
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  size?: "xs" | "sm" | "default" | "lg" | "xl";
}

function LoadingButton({ loading, children, size = "sm" }: LoadingButtonProps) {
  return (
    <span className="inline-flex items-center gap-2">
      {loading && <Spinner size={size} className="text-current" />}
      {children}
    </span>
  );
}

export { Spinner, LoadingOverlay, LoadingButton };
