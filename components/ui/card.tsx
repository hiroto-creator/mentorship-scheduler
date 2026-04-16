import * as React from "react";
import { cn } from "@/lib/utils";

// ── Badge ──────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "destructive" | "outline";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeStyles: Record<BadgeVariant, string> = {
  default:     "bg-[#111827] text-white",
  success:     "bg-[#D1FAE5] text-[#065F46]",
  warning:     "bg-[#FEF3C7] text-[#92400E]",
  destructive: "bg-[#FEE2E2] text-[#991B1B]",
  outline:     "border border-[#E5E7EB] text-[#374151] bg-white",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        badgeStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ── Card ───────────────────────────────────────────────────
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[#E5E7EB] bg-white",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5 border-b border-[#F3F4F6]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 py-4 border-t border-[#F3F4F6] bg-[#F9FAFB] rounded-b-[12px]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
