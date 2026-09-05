"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseFetchOptions extends RequestInit {
  immediate?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

interface UseFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  execute: (url?: string, options?: RequestInit) => Promise<T | null>;
  reset: () => void;
  abort: () => void;
}

export function useFetch<T = unknown>(
  url: string | null,
  options?: UseFetchOptions
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { immediate = true, onSuccess, onError, onFinally, ...fetchOptions } = options ?? {};

  const execute = useCallback(
    async (overrideUrl?: string, overrideOptions?: RequestInit): Promise<T | null> => {
      const targetUrl = overrideUrl ?? url;
      if (!targetUrl) return null;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(targetUrl, {
          ...fetchOptions,
          ...overrideOptions,
          signal: abortControllerRef.current.signal,
          headers: {
            "Content-Type": "application/json",
            ...fetchOptions.headers,
            ...overrideOptions?.headers,
          },
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
          );
        }

        const result = await response.json();
        setData(result);
        setIsLoading(false);
        onSuccess?.(result);
        onFinally?.();
        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return null;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);
        onError?.(error);
        onFinally?.();
        return null;
      }
    },
    [url, fetchOptions, onSuccess, onError, onFinally]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (immediate && url) {
      execute();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [immediate, url, execute]);

  return {
    data,
    error,
    isLoading,
    isSuccess: data !== null && error === null,
    isError: error !== null,
    execute,
    reset,
    abort,
  };
}

export function useFetchMutation<TData = unknown, TVariables = unknown>(
  url: string | ((variables: TVariables) => string),
  options?: {
    method?: "POST" | "PUT" | "PATCH" | "DELETE";
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  }
): {
  mutate: (variables: TVariables) => Promise<TData | null>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
} {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      const targetUrl = typeof url === "function" ? url(variables) : url;

      try {
        const response = await fetch(targetUrl, {
          method: options?.method ?? "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variables),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
        setIsLoading(false);
        options?.onSuccess?.(result, variables);
        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return null;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);
        options?.onError?.(error, variables);
        return null;
      }
    },
    [url, options]
  );

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      const result = await mutate(variables);
      if (result === null) {
        throw new Error("Mutation failed");
      }
      return result;
    },
    [mutate]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    isSuccess: data !== null && error === null,
    isError: error !== null,
    reset,
  };
}
