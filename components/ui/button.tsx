import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#111827] text-white hover:bg-[#1F2937] active:bg-[#111827] focus-visible:ring-[#111827]",
        outline:
          "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] focus-visible:ring-[#111827]",
        ghost:
          "text-[#374151] hover:bg-[#F3F4F6] focus-visible:ring-[#111827]",
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#DC2626] focus-visible:ring-[#EF4444]",
        success:
          "bg-[#10B981] text-white hover:bg-[#059669] focus-visible:ring-[#10B981]",
        link: "text-[#111827] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-5 text-[14px] rounded-[8px]",
        sm:      "h-8  px-3 text-[13px] rounded-[6px]",
        lg:      "h-12 px-8 text-[15px] rounded-[8px]",
        icon:    "h-10 w-10 rounded-[8px]",
        "icon-sm": "h-8 w-8 rounded-[6px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
