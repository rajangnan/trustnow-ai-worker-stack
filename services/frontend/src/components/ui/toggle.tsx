'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  badge?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, badge }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5 min-w-0">
        {label && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/85">{label}</span>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#00D4FF]/12 text-[#00D4FF] border border-[#00D4FF]/20">
                {badge}
              </span>
            )}
          </div>
        )}
        {description && <span className="text-xs text-white/45 leading-relaxed">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative flex-shrink-0 h-5 w-9 rounded-full transition-colors duration-200',
          'focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
          checked ? 'bg-[#00D4FF]' : 'bg-white/15'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
