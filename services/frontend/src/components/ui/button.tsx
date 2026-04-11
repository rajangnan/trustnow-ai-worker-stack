'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#00D4FF] text-[#0E0620] hover:bg-[#00B8E0] font-semibold',
      secondary: 'bg-white/8 text-white/80 hover:bg-white/12 border border-white/10',
      ghost: 'text-white/60 hover:text-white/90 hover:bg-white/6',
      destructive: 'bg-[#E03E3E] text-white hover:bg-[#C73535]',
      outline: 'border border-white/15 text-white/70 hover:bg-white/6 hover:text-white/90',
    };
    const sizes = {
      sm: 'h-7 px-3 text-xs rounded-md',
      md: 'h-8 px-4 text-sm rounded-md',
      lg: 'h-10 px-5 text-sm rounded-md',
      icon: 'h-8 w-8 rounded-md',
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
