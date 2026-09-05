"use client";

import * as React from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  home?: boolean;
  homeHref?: string;
  maxItems?: number;
  collapsed?: boolean;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      items,
      separator,
      home = true,
      homeHref = "/",
      maxItems = 5,
      collapsed = true,
      className,
      ...props
    },
    ref
  ) => {
    const SeparatorIcon = separator || (
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    );

    const allItems: BreadcrumbItem[] = home
      ? [{ label: "Home", href: homeHref, icon: <Home className="h-4 w-4" /> }, ...items]
      : items;

    const displayItems =
      collapsed && allItems.length > maxItems
        ? [
            ...allItems.slice(0, 1),
            { label: "...", current: false },
            ...allItems.slice(-maxItems + 1),
          ]
        : allItems;

    return (
      <nav ref={ref} aria-label="Breadcrumb" className={cn("", className)} {...props}>
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          {displayItems.map((item, index) => {
            const isLast = index === displayItems.length - 1;
            const isCollapsed = item.label === "...";

            return (
              <li
                key={index}
                className="flex items-center gap-1"
              >
                {index > 0 && (
                  <span className="flex-shrink-0" aria-hidden="true">
                    {SeparatorIcon}
                  </span>
                )}
                {isCollapsed ? (
                  <span className="text-muted-foreground">...</span>
                ) : isLast || item.current ? (
                  <span
                    className="font-medium text-foreground"
                    aria-current="page"
                  >
                    {item.icon && (
                      <span className="mr-1 inline-flex items-center">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href || "#"}
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.icon && (
                      <span className="inline-flex items-center">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);
Breadcrumb.displayName = "Breadcrumb";

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  return (
    <Breadcrumb
      items={items}
      className={cn("mb-4", className)}
    />
  );
}

export { Breadcrumb, PageBreadcrumb };
