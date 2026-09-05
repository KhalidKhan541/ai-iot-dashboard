"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  Activity,
  Bell,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Zap,
  BookOpen,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: "default" | "success" | "warning" | "destructive";
}

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  notifications?: number;
  className?: string;
}

const defaultNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboards",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Devices",
    href: "/devices",
    icon: <Cpu className="h-5 w-5" />,
    badge: "12",
    badgeVariant: "default",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    label: "Rules",
    href: "/rules",
    icon: <Zap className="h-5 w-5" />,
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: <Bell className="h-5 w-5" />,
    badge: "3",
    badgeVariant: "destructive",
  },
  {
    label: "Activity",
    href: "/notifications",
    icon: <Activity className="h-5 w-5" />,
  },
];

const bottomNavItems: NavItem[] = [
  {
    label: "Documentation",
    href: "/docs",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: "Help & Support",
    href: "/help",
    icon: <HelpCircle className="h-5 w-5" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

function Sidebar({
  collapsed = false,
  onCollapsedChange,
  user,
  notifications = 0,
  className,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[260px]",
          className
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-iot-teal text-white">
              <Cpu className="h-4 w-4" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold">IoT Dashboard</span>
            )}
          </div>
          {onCollapsedChange && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onCollapsedChange(!collapsed)}
              className="ml-auto"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {defaultNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-iot-teal/10 text-iot-teal"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    {item.icon}
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant={item.badgeVariant || "default"}
                            size="sm"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-iot-danger" />
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        <Separator className="my-1" />

        <nav className="space-y-1 p-2">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-iot-teal/10 text-iot-teal"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {user && (
          <>
            <Separator className="my-1" />
            <div
              className={cn(
                "flex items-center gap-3 p-4",
                collapsed && "justify-center px-2"
              )}
            >
              <Avatar size="sm">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              )}
              {!collapsed && (
                <Button variant="ghost" size="icon-sm">
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function MobileSidebar({
  open,
  onOpenChange,
  children,
}: MobileSidebarProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed left-4 top-3 z-50 rounded-md p-2 text-foreground hover:bg-accent md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[260px]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-md p-2 text-foreground hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

export { Sidebar, MobileSidebar, defaultNavItems, bottomNavItems };
export type { NavItem, SidebarProps, MobileSidebarProps };
