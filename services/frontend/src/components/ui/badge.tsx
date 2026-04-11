import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'live' | 'draft' | 'cyan' | 'red' | 'yellow' | 'purple';
}

export function Badge({ variant = 'draft', className, children, ...props }: BadgeProps) {
  const variants = {
    live: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30',
    draft: 'bg-white/6 text-white/50 border border-white/12',
    cyan: 'bg-[#00D4FF]/12 text-[#00D4FF] border border-[#00D4FF]/25',
    red: 'bg-[#E03E3E]/15 text-[#E03E3E] border border-[#E03E3E]/30',
    yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
