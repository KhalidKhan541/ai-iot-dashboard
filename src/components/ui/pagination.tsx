"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  disabled?: boolean;
  className?: string;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  disabled = false,
  className,
}: PaginationProps) {
  const pages = React.useMemo(() => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "dots", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [1, "dots", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, "dots", ...middleRange, "dots", totalPages];
    }

    return [];
  }, [currentPage, totalPages, siblingCount]);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-md px-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          (disabled || currentPage === 1) && "pointer-events-none opacity-50"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous</span>
      </button>
      {pages.map((page, index) => {
        if (page === "dots") {
          return (
            <span
              key={`dots-${index}`}
              className="inline-flex h-9 w-9 items-center justify-center"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </span>
          );
        }

        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page as number)}
            disabled={disabled}
            className={cn(
              "inline-flex h-9 min-w-[36px] items-center justify-center rounded-md px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              currentPage === page &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            {page}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-md px-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          (disabled || currentPage === totalPages) &&
            "pointer-events-none opacity-50"
        )}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next</span>
      </button>
    </nav>
  );
}

interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  className?: string;
}

function PaginationInfo({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  className,
}: PaginationInfoProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Showing <span className="font-medium">{startItem}</span> to{" "}
      <span className="font-medium">{endItem}</span> of{" "}
      <span className="font-medium">{totalItems}</span> results
    </p>
  );
}

interface PaginationSelectProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

function PaginationSelect({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}: PaginationSelectProps) {
  return (
    <select
      value={currentPage}
      onChange={(e) => onPageChange(Number(e.target.value))}
      disabled={disabled}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {Array.from({ length: totalPages }, (_, i) => (
        <option key={i + 1} value={i + 1}>
          Page {i + 1}
        </option>
      ))}
    </select>
  );
}

export { Pagination, PaginationInfo, PaginationSelect };
