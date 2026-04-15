import { useRef, useCallback } from "react";

/**
 * Returns a throttled version of `fn` that fires at most once per `limitMs`.
 */
export function useThrottle<T extends unknown[]>(
  fn: (...args: T) => void,
  limitMs: number
) {
  const lastRun = useRef(0);

  return useCallback(
    (...args: T) => {
      const now = Date.now();
      if (now - lastRun.current >= limitMs) {
        lastRun.current = now;
        fn(...args);
      }
    },
    [fn, limitMs]
  );
}
