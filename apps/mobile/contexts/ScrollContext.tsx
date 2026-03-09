import React, { createContext, useContext, useRef, useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface ScrollContextValue {
  /** Call from onScroll to auto-detect direction */
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Subscribe to scroll direction changes */
  onDirectionChange: (cb: (direction: 'down' | 'up' | 'idle') => void) => () => void;
}

const ScrollContext = createContext<ScrollContextValue | null>(null);

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const lastOffsetY = useRef(0);
  const lastDirection = useRef<'down' | 'up' | 'idle'>('idle');
  const listeners = useRef<Set<(d: 'down' | 'up' | 'idle') => void>>(new Set());
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((dir: 'down' | 'up' | 'idle') => {
    if (dir === lastDirection.current) return;
    lastDirection.current = dir;
    listeners.current.forEach((cb) => cb(dir));
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const diff = y - lastOffsetY.current;

      // Only trigger on meaningful scroll (>8px threshold to avoid thrashing)
      if (diff > 8) {
        notify('down');
      } else if (diff < -8) {
        notify('up');
      }

      lastOffsetY.current = y;

      // Reset to idle after 1.5s of no scroll
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        notify('idle');
      }, 1500);
    },
    [notify]
  );

  const onDirectionChange = useCallback(
    (cb: (direction: 'down' | 'up' | 'idle') => void) => {
      listeners.current.add(cb);
      return () => {
        listeners.current.delete(cb);
      };
    },
    []
  );

  return (
    <ScrollContext.Provider value={{ handleScroll, onDirectionChange }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollContext() {
  return useContext(ScrollContext);
}
