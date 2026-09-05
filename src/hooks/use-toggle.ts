"use client";

import { useState, useCallback } from "react";

export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, () => void, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return [value, toggle, setTrue, setFalse];
}

export function useSwitch(
  initialValue: boolean = false
): {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  set: (value: boolean) => void;
} {
  const [value, setValue] = useState(initialValue);

  return {
    value,
    toggle: () => setValue((v) => !v),
    setTrue: () => setValue(true),
    setFalse: () => setValue(false),
    set: (value: boolean) => setValue(value),
  };
}
