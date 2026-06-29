import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useListState<T>(key: string, initialState: T) {
  const location = useLocation();
  const storageKey = `list_state_${location.pathname}_${key}`;

  const [state, setState] = useState<T>(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialState;
      }
    }
    return initialState;
  });

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  return [state, setState] as const;
}

export function useScrollPreservation() {
  const location = useLocation();
  const storageKey = `scroll_pos_${location.pathname}`;

  useEffect(() => {
    const savedScroll = sessionStorage.getItem(storageKey);
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll, 10));
    }

    const handleScroll = () => {
      sessionStorage.setItem(storageKey, window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, storageKey]);
}
