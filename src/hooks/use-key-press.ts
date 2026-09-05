"use client";

import { useEffect, useCallback, useRef } from "react";

interface UseKeyPressOptions {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  enabled?: boolean;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
}

export function useKeyPress({
  key,
  ctrl = false,
  meta = false,
  shift = false,
  alt = false,
  enabled = true,
  onKeyDown,
  onKeyUp,
}: UseKeyPressOptions) {
  const onKeyDownRef = useRef(onKeyDown);
  const onKeyUpRef = useRef(onKeyUp);

  onKeyDownRef.current = onKeyDown;
  onKeyUpRef.current = onKeyUp;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      if (
        event.key === key &&
        event.ctrlKey === ctrl &&
        event.metaKey === meta &&
        event.shiftKey === shift &&
        event.altKey === alt
      ) {
        onKeyDownRef.current?.(event);
      }
    },
    [key, ctrl, meta, shift, alt, enabled]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      if (
        event.key === key &&
        event.ctrlKey === ctrl &&
        event.metaKey === meta &&
        event.shiftKey === shift &&
        event.altKey === alt
      ) {
        onKeyUpRef.current?.(event);
      }
    },
    [key, ctrl, meta, shift, alt, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}

export function useEscapeKey(
  handler: () => void,
  enabled = true
) {
  useKeyPress({
    key: "Escape",
    enabled,
    onKeyDown: handler,
  });
}

export function useKeyCombo(
  keys: string[],
  handler: () => void,
  enabled = true
) {
  const pressedKeys = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.current.add(event.key);
      if (keys.every((k) => pressedKeys.current.has(k))) {
        handler();
        pressedKeys.current.clear();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [keys, handler, enabled]);
}
