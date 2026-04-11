'use client';
import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}

export function Slider({ value, onChange, min = 0, max = 1, step = 0.01, label, leftLabel, rightLabel, disabled }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60 font-medium">{label}</span>
          <span className="text-xs text-white/40 tabular-nums">{value.toFixed(2)}</span>
        </div>
      )}
      <SliderPrimitive.Root
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="relative flex h-4 w-full touch-none items-center"
      >
        <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-white/10">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-[#00D4FF]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'block h-3.5 w-3.5 rounded-full border-2 border-[#00D4FF] bg-[#0E0620]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF]/50',
            'disabled:pointer-events-none disabled:opacity-50',
            'transition-transform hover:scale-110'
          )}
        />
      </SliderPrimitive.Root>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between">
          <span className="text-[10px] text-white/30">{leftLabel}</span>
          <span className="text-[10px] text-white/30">{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
