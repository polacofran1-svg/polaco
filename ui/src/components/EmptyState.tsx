import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, message, subtitle, action, onAction }: EmptyStateProps) {
  return (
    <div className="animate-scale-in flex flex-col items-center justify-center py-20 text-center">
      {/* Animated icon with gradient ring */}
      <div className="relative mb-6">
        {/* Pulsing outer ring */}
        <div
          className="animate-ring-pulse absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, color-mix(in oklch, var(--accent) 18%, transparent) 0%, transparent 70%)",
            transform: "scale(2.2)",
          }}
        />
        {/* Gradient container */}
        <div
          className="animate-empty-float relative flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 15%, var(--card)) 0%, color-mix(in oklch, var(--accent) 8%, var(--card)) 100%)",
            border: "1px solid color-mix(in oklch, var(--accent) 20%, var(--border))",
            boxShadow: "0 8px 32px color-mix(in oklch, var(--accent) 8%, transparent), 0 1px 0 color-mix(in oklch, white 12%, transparent) inset",
          }}
        >
          <Icon className="h-9 w-9 text-muted-foreground/60" strokeWidth={1.5} />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold tracking-tight text-foreground">{message}</h3>
      {subtitle && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      )}

      {/* CTA */}
      {action && onAction && (
        <Button
          onClick={onAction}
          className="mt-5"
          style={{
            background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 85%, var(--accent)) 100%)",
            boxShadow: "0 4px 14px color-mix(in oklch, var(--primary) 25%, transparent)",
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {action}
        </Button>
      )}
    </div>
  );
}
