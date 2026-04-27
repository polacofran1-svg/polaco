import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-2xl border bg-background px-3.5 py-2 text-base shadow-[0_1px_0_rgba(255,255,255,0.75)_inset] transition-[color,box-shadow,border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/25 focus-visible:ring-[3px] focus-visible:shadow-[0_0_0_1px_var(--ring),0_10px_24px_rgba(15,23,42,0.07)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
