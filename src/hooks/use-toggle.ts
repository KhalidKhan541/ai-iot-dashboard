"use client";

import { useState, useCallback } from "react";

export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((newValue: boolean) => setValue(newValue), []);

  return [value, toggle, set];
}

export function useToggleMultiple<T extends string>(
  options: T[],
  initial?: T
): [T | null, (option: T) => void, (option: T) => boolean, () => void] {
  const [selected, setSelected] = useState<T | null>(initial ?? null);

  const toggle = useCallback((option: T) => {
    setSelected((current) => (current === option ? null : option));
  }, []);

  const isActive = useCallback(
    (option: T) => selected === option,
    [selected]
  );

  const clear = useCallback(() => setSelected(null), []);

  return [selected, toggle, isActive, clear];
}

export function useToggleArray<T extends string>(
  initial: T[] = []
): [T[], (item: T) => void, (items: T[]) => void, (item: T) => boolean, () => void] {
  const [selected, setSelected] = useState<T[]>(initial);

  const toggle = useCallback((item: T) => {
    setSelected((current) =>
      current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item]
    );
  }, []);

  const setItems = useCallback((items: T[]) => {
    setSelected(items);
  }, []);

  const isActive = useCallback(
    (item: T) => selected.includes(item),
    [selected]
  );

  const clear = useCallback(() => setSelected([]), []);

  return [selected, toggle, setItems, isActive, clear];
}
