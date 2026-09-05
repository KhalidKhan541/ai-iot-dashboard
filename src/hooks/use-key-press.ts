"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Key = string | string[];

interface UseKeyPressOptions {
  target?: HTMLElement | Window | null;
  enabled?: boolean;
  useCapture?: boolean;
}

export function useKeyPress(
  targetKey: Key,
  callback: (event: KeyboardEvent) => void,
  options?: UseKeyPressOptions
): boolean {
  const [isPressed, setIsPressed] = useState(false);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (options?.enabled === false) return;

    const target = options?.target ?? window;
    const keys = Array.isArray(targetKey) ? targetKey : [targetKey];
    const useCapture = options?.useCapture ?? false;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (keys.includes(event.key)) {
        setIsPressed(true);
        callbackRef.current(event);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (keys.includes(event.key)) {
        setIsPressed(false);
      }
    };

    target.addEventListener("keydown", handleKeyDown, useCapture);
    target.addEventListener("keyup", handleKeyUp, useCapture);

    return () => {
      target.removeEventListener("keydown", handleKeyDown, useCapture);
      target.removeEventListener("keyup", handleKeyUp, useCapture);
    };
  }, [targetKey, options?.target, options?.enabled, options?.useCapture]);

  return isPressed;
}

export function useKeyPressCombo(
  keys: string[],
  callback: (event: KeyboardEvent) => void,
  options?: UseKeyPressOptions
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const pressedKeys = useRef(new Set<string>());

  useEffect(() => {
    if (options?.enabled === false) return;

    const target = options?.target ?? window;
    const useCapture = options?.useCapture ?? true;

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.current.add(event.key);

      if (keys.every((key) => pressedKeys.current.has(key))) {
        event.preventDefault();
        callbackRef.current(event);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key);
    };

    const handleBlur = () => {
      pressedKeys.current.clear();
    };

    target.addEventListener("keydown", handleKeyDown, useCapture);
    target.addEventListener("keyup", handleKeyUp, useCapture);
    window.addEventListener("blur", handleBlur);

    return () => {
      target.removeEventListener("keydown", handleKeyDown, useCapture);
      target.removeEventListener("keyup", handleKeyUp, useCapture);
      window.removeEventListener("blur", handleBlur);
    };
  }, [keys, options?.target, options?.enabled, options?.useCapture]);
}

export function useKeyboardNavigation(
  items: unknown[],
  onSelect: (index: number) => void,
  options?: {
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
    enabled?: boolean;
  }
): {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
} {
  const [activeIndex, setActiveIndex] = useState(0);
  const { orientation = "vertical", loop = true, enabled = true } = options ?? {};

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled) return;

      const count = items.length;
      if (count === 0) return;

      let nextIndex = activeIndex;

      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault();
          nextIndex = activeIndex + 1;
          if (nextIndex >= count) {
            nextIndex = loop ? 0 : count - 1;
          }
          break;
        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault();
          nextIndex = activeIndex - 1;
          if (nextIndex < 0) {
            nextIndex = loop ? count - 1 : 0;
          }
          break;
        case "Home":
          event.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          event.preventDefault();
          nextIndex = count - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onSelect(activeIndex);
          return;
        default:
          return;
      }

      setActiveIndex(nextIndex);
    },
    [activeIndex, items.length, loop, enabled, onSelect]
  );

  return { activeIndex, setActiveIndex, handleKeyDown };
}

export function useKeyHold(
  targetKey: string,
  onHold: () => void,
  onRelease?: () => void,
  options?: { holdDuration?: number; enabled?: boolean }
): { isHolding: boolean } {
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { holdDuration = 500, enabled = true } = options ?? {};

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === targetKey && !isHolding) {
        holdTimerRef.current = setTimeout(() => {
          setIsHolding(true);
          onHold();
        }, holdDuration);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        if (isHolding) {
          setIsHolding(false);
          onRelease?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [targetKey, holdDuration, enabled, isHolding, onHold, onRelease]);

  return { isHolding };
}
