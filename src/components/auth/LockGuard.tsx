import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { LockScreen } from './LockScreen';

export function LockGuard({ children }: { children: React.ReactNode }) {
  const settingsArray = useLiveQuery(() => db.systemSettings.toArray());
  const settings = settingsArray?.[0];
  const [isLocked, setIsLocked] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initTimeout = setTimeout(() => {
      if (!initialized) {
        setInitialized(true);
      }
    }, 5000);

    if (settingsArray !== undefined) {
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
      clearTimeout(initTimeout);
    }

    return () => clearTimeout(initTimeout);
  }, [settingsArray, settings, initialized]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Iniciando sistema de segurança...</p>
        </div>
      </div>
    );
  }

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
