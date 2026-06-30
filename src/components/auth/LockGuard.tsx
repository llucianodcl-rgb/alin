import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { LockScreen } from './LockScreen';

export function LockGuard({ children }: { children: React.ReactNode }) {
  const settings = useLiveQuery(() => db.systemSettings.toCollection().first());
  const [isLocked, setIsLocked] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings !== undefined) {
      const isLockActive = settings?.isLockEnabled && settings?.appPin;
      const sessionLock = sessionStorage.getItem('alin_app_locked');
      
      if (isLockActive) {
        if (sessionLock === 'false') {
          setIsLocked(false);
        } else {
          setIsLocked(true);
        }
      } else {
        setIsLocked(false);
      }
      setInitialized(true);
    }
  }, [settings]);

  if (!initialized) return null;

  if (isLocked) {
    return (
      <LockScreen 
        onUnlock={() => {
          setIsLocked(false);
          sessionStorage.setItem('alin_app_locked', 'false');
        }} 
      />
    );
  }

  return <>{children}</>;
}
