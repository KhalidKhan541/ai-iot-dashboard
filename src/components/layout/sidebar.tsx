'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import {
  LayoutDashboard,
  Cpu,
  Bell,
  BarChart3,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  BellRing,
  Shield,
  TrendingUp,
  Activity,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: Home },
  {
    label: 'Dashboards',
    href: '/dashboard/dashboards',
    icon: LayoutDashboard,
    children: [
      { label: 'All Dashboards', href: '/dashboard/dashboards', icon: LayoutDashboard },
      { label: 'Create New', href: '/dashboard/dashboards/create', icon: FileText },
    ],
  },
  {
    label: 'Devices',
    href: '/dashboard/devices',
    icon: Cpu,
    children: [
      { label: 'All Devices', href: '/dashboard/devices', icon: Cpu },
    ],
  },
  {
    label: 'Alerts',
    href: '/dashboard/alerts',
    icon: Bell,
    badge: 3,
    children: [
      { label: 'Active Alerts', href: '/dashboard/alerts', icon: Bell },
      { label: 'Alert Rules', href: '/dashboard/alerts/rules', icon: Shield },
    ],
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    children: [
      { label: 'AI Insights', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'Predictions', href: '/dashboard/analytics/predictions', icon: TrendingUp },
    ],
  },
  {
    label: 'Rules',
    href: '/dashboard/rules',
    icon: Zap,
    children: [
      { label: 'Rule Engine', href: '/dashboard/rules', icon: Zap },
      { label: 'Create Rule', href: '/dashboard/rules/create', icon: FileText },
    ],
  },
  { label: 'Notifications', href: '/dashboard/notifications', icon: BellRing },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, alerts, notifications } = useAppStore();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">IoT Hub</span>
            </div>
          )}
          {!sidebarOpen && <Activity className="h-6 w-6 mx-auto text-primary" />}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn('h-8 w-8', !sidebarOpen && 'hidden')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                              {item.badge}
                            </span>
                          )}
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              expandedItems[item.label] && 'rotate-180'
                            )}
                          />
                        </>
                      )}
                    </button>
                    {sidebarOpen && expandedItems[item.label] && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                              pathname === child.href
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.label === 'Alerts' && unreadAlerts > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                            {unreadAlerts}
                          </span>
                        )}
                        {item.label === 'Notifications' && unreadNotifications > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                            {unreadNotifications}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t p-4">
          {!sidebarOpen ? (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 mx-auto">
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">john@example.com</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
