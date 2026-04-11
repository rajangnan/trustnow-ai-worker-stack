'use client';
import { Phone, Bell, ChevronDown, Circle } from 'lucide-react';
import { useAppStore } from '@/store';

export function TopBar() {
  const { liveCallsCount } = useAppStore();

  return (
    <header
      style={{ height: 56 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-[#0A0418] border-b border-white/6"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#00D4FF]/15 flex items-center justify-center">
            <span className="text-[#00D4FF] font-bold text-sm">T</span>
          </div>
          <span className="font-semibold text-white/90 text-sm tracking-tight">TRUSTNOW</span>
          <span className="text-white/25 text-sm">AI Worker Stack</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Live calls counter */}
        {liveCallsCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#22C55E]/10 border border-[#22C55E]/20">
            <Circle className="h-2 w-2 fill-[#22C55E] text-[#22C55E] animate-pulse" />
            <span className="text-xs font-medium text-[#22C55E]">
              {liveCallsCount} live call{liveCallsCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative h-8 w-8 flex items-center justify-center rounded-md text-white/50 hover:text-white/90 hover:bg-white/6 transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        {/* Account */}
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-md text-white/60 hover:text-white/90 hover:bg-white/6 transition-colors">
          <div className="h-6 w-6 rounded-full bg-[#7C3AED]/40 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-purple-300">R</span>
          </div>
          <span className="text-xs text-white/70 hidden sm:block">Raj</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/40" />
        </button>
      </div>
    </header>
  );
}
