import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-white/60 font-medium">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'h-8 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/90',
          'placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50 focus:bg-white/8',
          'disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
          error && 'border-[#E03E3E]/50',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
      {error && <p className="text-xs text-[#E03E3E]">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
