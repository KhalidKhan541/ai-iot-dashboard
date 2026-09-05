"use client";

import { useEffect, useRef, useCallback } from "react";

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  options?: {
    enabled?: boolean;
    ignoreClicksOn?: string[];
  }
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (options?.enabled === false) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!ref.current) return;

      const target = event.target as Node;

      if (ref.current.contains(target)) return;

      if (options?.ignoreClicksOn) {
        for (const selector of options.ignoreClicksOn) {
          const ignoredElement = (target as Element)?.closest?.(selector);
          if (ignoredElement) return;
        }
      }

      handlerRef.current();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [options?.enabled, options?.ignoreClicksOn]);

  return ref;
}

export function useClickOutsideMultiple(
  handler: () => void,
  refs: React.RefObject<HTMLElement>[],
  options?: { enabled?: boolean }
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (options?.enabled === false) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      for (const ref of refs) {
        if (ref.current?.contains(target)) return;
      }

      handlerRef.current();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [refs, options?.enabled]);
}

export function useOutsideClickAlert(ref: React.RefObject<HTMLElement | null>): boolean {
  const isOutside = useRef(true);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        isOutside.current = true;
      } else {
        isOutside.current = false;
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref]);

  return isOutside.current;
}
