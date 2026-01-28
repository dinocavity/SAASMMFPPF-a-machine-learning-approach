import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const progressVariants = cva(
  "h-full transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--primary))]",
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        destructive: "bg-red-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Progress = React.forwardRef(
  ({ className, value = 0, variant, showLabel = false, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div className="relative w-full">
        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn(
            "h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]",
            className
          )}
          {...props}
        >
          <div
            className={cn(progressVariants({ variant }))}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
        {showLabel && (
          <span className="absolute right-0 top-full mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {clampedValue}%
          </span>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress, progressVariants };
