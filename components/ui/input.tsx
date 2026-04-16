import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-[#374151]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3.5 text-[14px] text-[#111827] placeholder:text-[#9CA3AF]",
            "transition-colors duration-150",
            "hover:border-[#D1D5DB]",
            "focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]",
            "disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed",
            error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]",
            className
          )}
          {...props}
        />
        {error && <p className="text-[12px] text-[#EF4444]">{error}</p>}
        {hint && !error && <p className="text-[12px] text-[#9CA3AF]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
