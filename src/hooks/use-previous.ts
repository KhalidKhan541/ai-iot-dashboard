"use client";

import { useRef, useEffect } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function usePreviousDistinct<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const prevValue = useRef<T | undefined>(undefined);

  useEffect(() => {
    if (ref.current !== value) {
      prevValue.current = ref.current;
      ref.current = value;
    }
  }, [value]);

  return prevValue.current;
}

export function usePreviousArray<T>(value: T[], maxHistory: number = 5): T[][] {
  const ref = useRef<T[][]>([]);

  useEffect(() => {
    ref.current = [value, ...ref.current].slice(0, maxHistory);
  }, [value, maxHistory]);

  return ref.current;
}

export function usePreviousWithTimestamp<T>(
  value: T
): { value: T | undefined; timestamp: number | undefined } {
  const ref = useRef<{ value: T | undefined; timestamp: number | undefined }>({
    value: undefined,
    timestamp: undefined,
  });

  useEffect(() => {
    ref.current = { value, timestamp: Date.now() };
  }, [value]);

  return ref.current;
}
