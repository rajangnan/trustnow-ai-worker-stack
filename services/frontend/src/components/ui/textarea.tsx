import * as React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-white/60 font-medium">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90',
          'placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50 focus:bg-white/8',
          'resize-y min-h-[80px] transition-colors',
          className
        )}
        {...props}
      />
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
