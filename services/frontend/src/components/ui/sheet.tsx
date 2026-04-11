'use client';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;

export function SheetContent({
  className,
  children,
  title,
  side = 'right',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title?: string;
  side?: 'left' | 'right';
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-0 z-50 h-full w-[420px] bg-[#130726] border-l border-white/10 shadow-2xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          'duration-300',
          side === 'left' ? 'left-0' : 'right-0',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          {title && <DialogPrimitive.Title className="text-base font-semibold text-white">{title}</DialogPrimitive.Title>}
          <DialogPrimitive.Close className="ml-auto rounded-md p-1 text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="flex flex-col h-[calc(100%-56px)] overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
