"use client";

import { useRef, useEffect } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function usePreviousDistinct<T>(
  value: T,
  equalityFn?: (prev: T, next: T) => boolean
): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const currentRef = useRef<T>(value);

  useEffect(() => {
    if (equalityFn) {
      if (!equalityFn(currentRef.current, value)) {
        ref.current = currentRef.current;
        currentRef.current = value;
      }
    } else {
      if (currentRef.current !== value) {
        ref.current = currentRef.current;
        currentRef.current = value;
      }
    }
  }, [value, equalityFn]);

  return ref.current;
}
