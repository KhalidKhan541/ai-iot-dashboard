"use client";

import * as React from "react";
import { Search, Command as CommandIcon, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandContextType {
  query: string;
  setQuery: (query: string) => void;
  selected: string;
  setSelected: (selected: string) => void;
}

const CommandContext = React.createContext<CommandContextType>({
  query: "",
  setQuery: () => {},
  selected: "",
  setSelected: () => {},
});

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  groups: Array<{
    label: string;
    items: Array<{
      id: string;
      label: string;
      description?: string;
      icon?: React.ReactNode;
      shortcut?: string;
      onSelect?: () => void;
    }>;
  }>;
  onSelect?: (id: string) => void;
  emptyMessage?: string;
  className?: string;
}

function CommandPalette({
  open,
  onOpenChange,
  placeholder = "Type a command or search...",
  searchPlaceholder = "Search...",
  groups,
  onSelect,
  emptyMessage = "No results found.",
  className,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelected("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const filteredGroups = React.useMemo(() => {
    if (!query) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.description?.toLowerCase().includes(query.toLowerCase())
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const allItems = filteredGroups.flatMap((g) => g.items);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = allItems.findIndex((item) => item.id === selected);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < allItems.length - 1 ? currentIndex + 1 : 0;
      setSelected(allItems[nextIndex]?.id || "");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : allItems.length - 1;
      setSelected(allItems[prevIndex]?.id || "");
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = allItems.find((i) => i.id === selected);
      if (item) {
        item.onSelect?.();
        onSelect?.(item.id);
        onOpenChange(false);
      }
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh]">
        <div
          className={cn(
            "w-full max-w-lg rounded-lg border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95",
            className
          )}
        >
          <div className="flex items-center border-b px-4">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              ESC
            </kbd>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            <CommandContext.Provider value={{ query, setQuery, selected, setSelected }}>
              {filteredGroups.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.label} className="mb-2">
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </p>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          item.onSelect?.();
                          onSelect?.(item.id);
                          onOpenChange(false);
                        }}
                        onMouseEnter={() => setSelected(item.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors",
                          selected === item.id
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {item.icon && (
                          <span className="flex h-5 w-5 items-center justify-center">
                            {item.icon}
                          </span>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.shortcut && (
                          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </CommandContext.Provider>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                to select
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1">↑</kbd>
                <kbd className="rounded border bg-muted px-1">↓</kbd>
                to navigate
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function CommandItem({
  id,
  label,
  description,
  icon,
  shortcut,
  onSelect,
}: {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect?: () => void;
}) {
  const { selected, setSelected } = React.useContext(CommandContext);

  return (
    <button
      type="button"
      onClick={() => onSelect?.()}
      onMouseEnter={() => setSelected(id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors",
        selected === id
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {icon && (
        <span className="flex h-5 w-5 items-center justify-center">
          {icon}
        </span>
      )}
      <div className="flex-1 text-left">
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {shortcut && (
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

export { CommandPalette, CommandGroup, CommandItem };
