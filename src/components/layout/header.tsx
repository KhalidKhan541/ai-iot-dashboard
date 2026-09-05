"use client";

import * as React from "react";
import { Bell, Search, Moon, Sun, Menu, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  notifications?: number;
  onSearch?: (query: string) => void;
  onNotificationClick?: () => void;
  onThemeToggle?: () => void;
  theme?: "light" | "dark";
  onMenuClick?: () => void;
  className?: string;
}

function Header({
  user,
  notifications = 0,
  onSearch,
  onNotificationClick,
  onThemeToggle,
  theme = "light",
  onMenuClick,
  className,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  return (
    <header
      className={cn(
        "flex h-14 items-center border-b bg-background px-4 lg:px-6",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onMenuClick}
        className="mr-4 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search devices, rules, alerts..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            className="pl-10 h-9 bg-muted/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onThemeToggle}
          className="hidden sm:flex"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNotificationClick}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {notifications > 0 && (
            <Badge
              variant="destructive"
              size="sm"
              className="absolute -right-1 -top-1 h-4 min-w-[16px] justify-center rounded-full px-1 text-[10px]"
            >
              {notifications > 99 ? "99+" : notifications}
            </Badge>
          )}
        </Button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hidden gap-2 sm:flex"
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
                <span className="hidden lg:inline-flex">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

interface CommandHeaderProps {
  onCommandOpen?: () => void;
}

function CommandHeader({ onCommandOpen }: CommandHeaderProps) {
  return (
    <button
      onClick={onCommandOpen}
      className="flex h-9 w-full items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

export { Header, CommandHeader };
