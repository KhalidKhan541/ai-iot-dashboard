"use client";

import { useEffect, useRef, RefObject } from "react";

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void,
  options?: {
    enabled?: boolean;
    ignoreClass?: string;
  }
): RefObject<T> {
  const ref = useRef<T>(null);
  const enabled = options?.enabled ?? true;
  const ignoreClass = options?.ignoreClass;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!ref.current || ref.current.contains(target)) {
        return;
      }
      if (ignoreClass && target instanceof Element && target.closest(ignoreClass)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler, enabled, ignoreClass]);

  return ref;
}

export function useClickOutsideMultiple<T extends HTMLElement = HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled?: boolean
): RefObject<T>[] {
  const refs = useRef<RefObject<T>[]>([]);

  const addRef = () => {
    const ref = { current: null as T | null };
    refs.current.push(ref);
    return ref;
  };

  useEffect(() => {
    if (enabled === false) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const isInside = refs.current.some(
        (ref) => ref.current && ref.current.contains(target)
      );
      if (!isInside) {
        handler(event);
      }
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler, enabled]);

  return refs.current;
}
