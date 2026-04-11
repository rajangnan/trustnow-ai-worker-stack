'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Bot, Phone, BookOpen, Wrench, BarChart2,
  Webhook, FlaskConical, Mic2, Globe2, Shield, Settings,
  PhoneCall, Activity, ChevronRight, Users, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CONFIGURE = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/agents', icon: Bot, label: 'Agents' },
  { href: '/phone-numbers', icon: Phone, label: 'Phone Numbers' },
  { href: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
  { href: '/tools', icon: Wrench, label: 'Tools' },
  { href: '/voices', icon: Mic2, label: 'Voice Library' },
];

const MONITOR = [
  { href: '/conversations', icon: BarChart2, label: 'Conversations' },
  { href: '/analytics', icon: Activity, label: 'Analytics' },
  { href: '/batch-calls', icon: PhoneCall, label: 'Batch Calls' },
  { href: '/workflow', icon: Layers, label: 'Workflows' },
];

const DEPLOY = [
  { href: '/widget', icon: Globe2, label: 'Web Widget' },
  { href: '/webhooks', icon: Webhook, label: 'Webhooks' },
  { href: '/api-keys', icon: Shield, label: 'API Keys' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

function NavGroup({ label, items }: { label: string; items: typeof CONFIGURE }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/25">{label}</p>
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn('sidebar-item', active && 'active')}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside
      style={{ width: 240 }}
      className="fixed left-0 top-14 bottom-0 z-40 flex flex-col bg-[#0A0418] border-r border-white/6 overflow-y-auto"
    >
      <div className="flex flex-col gap-4 p-3 pt-4 flex-1">
        <NavGroup label="Configure" items={CONFIGURE} />
        <NavGroup label="Monitor" items={MONITOR} />
        <NavGroup label="Deploy" items={DEPLOY} />
      </div>

      <div className="p-3 border-t border-white/6">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-white/4">
          <div className="h-7 w-7 rounded-full bg-[#00D4FF]/20 flex items-center justify-center flex-shrink-0">
            <Users className="h-3.5 w-3.5 text-[#00D4FF]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/80 truncate">Free Plan</p>
            <p className="text-[10px] text-white/40">0 / 100 calls</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
