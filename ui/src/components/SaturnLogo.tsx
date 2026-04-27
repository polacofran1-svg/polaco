import { cn } from "@/lib/utils";

export function SaturnLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("text-foreground", className)}
    >
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.4"
        transform="rotate(-20 12 12)"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.4" cy="7.6" r="1.1" fill="currentColor" />
    </svg>
  );
}
