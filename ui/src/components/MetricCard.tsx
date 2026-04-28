import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/lib/router";

interface MetricCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  description?: ReactNode;
  to?: string;
  onClick?: () => void;
}

export function MetricCard({ icon: Icon, value, label, description, to, onClick }: MetricCardProps) {
  const isClickable = !!(to || onClick);

  const inner = (
    <div
      className={`h-full rounded-3xl border border-border bg-card px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-[background-color,transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 sm:py-5${
        isClickable ? " cursor-pointer hover:-translate-y-[2px] hover:border-foreground/10 hover:bg-secondary/70 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-semibold tracking-[-0.03em] tabular-nums sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
            {label}
          </p>
          {description && (
            <div className="mt-2 hidden text-xs leading-5 text-muted-foreground/80 sm:block">{description}</div>
          )}
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground/75">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="no-underline text-inherit h-full" onClick={onClick}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div className="h-full" onClick={onClick}>
        {inner}
      </div>
    );
  }

  return inner;
}
