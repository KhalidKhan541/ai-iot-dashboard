"use client";

import * as React from "react";

interface QueryCacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
  staleTime: number;
}

interface QueryProviderState {
  cache: Map<string, QueryCacheEntry>;
  getQuery: <T = unknown>(key: string) => T | undefined;
  setQuery: <T = unknown>(key: string, data: T, staleTime?: number) => void;
  invalidateQuery: (key: string) => void;
  invalidateQueries: (predicate: (key: string) => boolean) => void;
  removeQuery: (key: string) => void;
  clearCache: () => void;
  isStale: (key: string) => boolean;
  refetchQuery: <T = unknown>(key: string) => Promise<T | undefined>;
  prefetchQuery: <T = unknown>(key: string, fetcher: () => Promise<T>, staleTime?: number) => Promise<T>;
  getQueryState: (key: string) => "fresh" | "stale" | "missing";
}

const QueryContext = React.createContext<QueryProviderState | undefined>(undefined);

interface QueryProviderProps {
  children: React.ReactNode;
  defaultStaleTime?: number;
  gcTime?: number;
  maxCacheSize?: number;
}

export function QueryProvider({
  children,
  defaultStaleTime = 300000,
  gcTime = 600000,
  maxCacheSize = 500,
}: QueryProviderProps) {
  const cacheRef = React.useRef<Map<string, QueryCacheEntry>>(new Map());
  const fetchersRef = React.useRef<Map<string, () => Promise<unknown>>>(new Map());
  const [cacheVersion, setCacheVersion] = React.useState(0);

  const bumpVersion = React.useCallback(() => setCacheVersion((v) => v + 1), []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of cacheRef.current) {
        if (now - entry.timestamp > gcTime) {
          cacheRef.current.delete(key);
          fetchersRef.current.delete(key);
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [gcTime]);

  const getQuery = React.useCallback(
    <T = unknown>(key: string): T | undefined => {
      const entry = cacheRef.current.get(key);
      return entry?.data as T | undefined;
    },
    []
  );

  const setQuery = React.useCallback(
    <T = unknown>(key: string, data: T, staleTime?: number) => {
      if (cacheRef.current.size >= maxCacheSize) {
        const oldestKey = cacheRef.current.keys().next().value;
        if (oldestKey) cacheRef.current.delete(oldestKey);
      }

      cacheRef.current.set(key, {
        key,
        data,
        timestamp: Date.now(),
        staleTime: staleTime ?? defaultStaleTime,
      });
      bumpVersion();
    },
    [maxCacheSize, defaultStaleTime, bumpVersion]
  );

  const invalidateQuery = React.useCallback(
    (key: string) => {
      const entry = cacheRef.current.get(key);
      if (entry) {
        entry.timestamp = 0;
        bumpVersion();
      }
    },
    [bumpVersion]
  );

  const invalidateQueries = React.useCallback(
    (predicate: (key: string) => boolean) => {
      for (const [key, entry] of cacheRef.current) {
        if (predicate(key)) {
          entry.timestamp = 0;
        }
      }
      bumpVersion();
    },
    [bumpVersion]
  );

  const removeQuery = React.useCallback(
    (key: string) => {
      cacheRef.current.delete(key);
      fetchersRef.current.delete(key);
      bumpVersion();
    },
    [bumpVersion]
  );

  const clearCache = React.useCallback(() => {
    cacheRef.current.clear();
    fetchersRef.current.clear();
    bumpVersion();
  }, [bumpVersion]);

  const isStale = React.useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.staleTime;
  }, []);

  const getQueryState = React.useCallback(
    (key: string): "fresh" | "stale" | "missing" => {
      const entry = cacheRef.current.get(key);
      if (!entry) return "missing";
      return isStale(key) ? "stale" : "fresh";
    },
    [isStale]
  );

  const refetchQuery = React.useCallback(
    async <T = unknown>(key: string): Promise<T | undefined> => {
      const fetcher = fetchersRef.current.get(key);
      if (!fetcher) return cacheRef.current.get(key)?.data as T | undefined;

      try {
        const data = (await fetcher()) as T;
        setQuery(key, data);
        return data;
      } catch {
        return undefined;
      }
    },
    [setQuery]
  );

  const prefetchQuery = React.useCallback(
    async <T = unknown>(
      key: string,
      fetcher: () => Promise<T>,
      staleTime?: number
    ): Promise<T> => {
      fetchersRef.current.set(key, fetcher);

      const existing = cacheRef.current.get(key);
      if (existing && !isStale(key)) {
        return existing.data as T;
      }

      const data = await fetcher();
      setQuery(key, data, staleTime);
      return data;
    },
    [setQuery, isStale]
  );

  const value = React.useMemo<QueryProviderState>(
    () => ({
      cache: cacheRef.current,
      getQuery,
      setQuery,
      invalidateQuery,
      invalidateQueries,
      removeQuery,
      clearCache,
      isStale,
      refetchQuery,
      prefetchQuery,
      getQueryState,
    }),
    [
      cacheVersion,
      getQuery,
      setQuery,
      invalidateQuery,
      invalidateQueries,
      removeQuery,
      clearCache,
      isStale,
      refetchQuery,
      prefetchQuery,
      getQueryState,
    ]
  );

  return (
    <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
  );
}

export function useQuery(): QueryProviderState {
  const context = React.useContext(QueryContext);
  if (context === undefined) {
    throw new Error("useQuery must be used within a QueryProvider");
  }
  return context;
}

export function useQueryData<T = unknown>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    staleTime?: number;
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { getQuery, setQuery, isStale, getQueryState } = useQuery();
  const [data, setData] = React.useState<T | undefined>(() => getQuery<T>(key));
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const { staleTime, enabled = true, onSuccess, onError } = options ?? {};

  const fetchData = React.useCallback(async () => {
    if (!enabled) return;

    const state = getQueryState(key);
    if (state === "fresh") {
      setData(getQuery<T>(key));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setQuery(key, result, staleTime);
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Fetch failed");
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, enabled, staleTime, getQuery, setQuery, getQueryState, onSuccess, onError]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetcher();
      setQuery(key, result, staleTime);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Refetch failed"));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, staleTime, setQuery]);

  return { data, isLoading, error, refetch };
}
