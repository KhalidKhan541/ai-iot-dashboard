"use client";

import { useState, useCallback, useMemo } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
  siblingsCount?: number;
}

interface UsePaginationResult {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  pages: number[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  goToPage: (page: number) => void;
}

export function usePagination(options: UsePaginationOptions): UsePaginationResult {
  const {
    initialPage = 1,
    initialPageSize = 10,
    totalItems,
    siblingsCount = 1,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  const clampedPage = useMemo(
    () => Math.min(Math.max(1, page), totalPages),
    [page, totalPages]
  );

  const startIndex = useMemo(
    () => (clampedPage - 1) * pageSize,
    [clampedPage, pageSize]
  );

  const endIndex = useMemo(
    () => Math.min(startIndex + pageSize - 1, totalItems - 1),
    [startIndex, pageSize, totalItems]
  );

  const isFirstPage = clampedPage === 1;
  const isLastPage = clampedPage === totalPages;
  const hasPreviousPage = clampedPage > 1;
  const hasNextPage = clampedPage < totalPages;

  const pages = useMemo(() => {
    const range = [];
    const left = Math.max(2, clampedPage - siblingsCount);
    const right = Math.min(totalPages - 1, clampedPage + siblingsCount);

    range.push(1);

    if (left > 2) {
      range.push(-1);
    }

    for (let i = left; i <= right; i++) {
      range.push(i);
    }

    if (right < totalPages - 1) {
      range.push(-2);
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }, [clampedPage, totalPages, siblingsCount]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const firstPage = useCallback(() => setPage(1), []);

  const lastPage = useCallback(() => setPage(totalPages), [totalPages]);

  const goToPage = useCallback(
    (p: number) => {
      setPage(Math.min(Math.max(1, p), totalPages));
    },
    [totalPages]
  );

  return {
    page: clampedPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    isFirstPage,
    isLastPage,
    hasPreviousPage,
    hasNextPage,
    pages,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    goToPage,
  };
}

export function useCursorPagination<T>(
  items: T[],
  pageSize: number = 10
): {
  currentItems: T[];
  cursor: number;
  hasNext: boolean;
  hasPrevious: boolean;
  next: () => void;
  previous: () => void;
  goTo: (index: number) => void;
  reset: () => void;
} {
  const [cursor, setCursor] = useState(0);

  const hasNext = cursor + pageSize < items.length;
  const hasPrevious = cursor > 0;

  const currentItems = items.slice(cursor, cursor + pageSize);

  const next = useCallback(() => {
    setCursor((c) => Math.min(c + pageSize, items.length));
  }, [pageSize, items.length]);

  const previous = useCallback(() => {
    setCursor((c) => Math.max(c - pageSize, 0));
  }, [pageSize]);

  const goTo = useCallback(
    (index: number) => {
      setCursor(Math.min(Math.max(0, index), items.length));
    },
    [items.length]
  );

  const reset = useCallback(() => setCursor(0), []);

  return {
    currentItems,
    cursor,
    hasNext,
    hasPrevious,
    next,
    previous,
    goTo,
    reset,
  };
}
