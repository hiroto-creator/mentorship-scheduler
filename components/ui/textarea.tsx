import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-[#374151]">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            "w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] resize-none",
            "transition-colors duration-150",
            "hover:border-[#D1D5DB]",
            "focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]",
            "disabled:bg-[#F9FAFB] disabled:cursor-not-allowed",
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
Textarea.displayName = "Textarea";

export { Textarea };
