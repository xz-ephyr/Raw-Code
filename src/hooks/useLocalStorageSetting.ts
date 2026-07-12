import { useState, useCallback } from 'react';

function readValue<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch {
    return defaultValue;
  }
}

export function useLocalStorageSetting<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setStored] = useState<T>(() => readValue(key, defaultValue));

  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* quota exceeded or other error — swallow */
      }
      setStored(next);
    },
    [key]
  );

  return [value, setValue];
}
