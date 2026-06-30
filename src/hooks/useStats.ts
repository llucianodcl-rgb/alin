import { useEffect, useState } from 'react';
import { db as firestoreDb } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { GlobalStats } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useStats() {
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const isSuperAdmin = user?.email === 'llucianodcl@gmail.com';
    const isApproved = profile?.status === 'approved' || isSuperAdmin;

    if (authLoading || !user || !isApproved) {
      if (!authLoading && !user) {
        setLoading(false);
      }
      return;
    }

    const statsDocRef = doc(firestoreDb, 'statistics', 'global');
    
    const unsubscribe = onSnapshot(statsDocRef, (snap) => {
      if (snap.exists()) {
        setStats(snap.data() as GlobalStats);
      }
      setLoading(false);
      setError(null);
    }, (err) => {
      // Don't show permission error to the user if they are just logging in
      if (err.code !== 'permission-denied') {
        console.error('Error listening to stats:', err);
        setError(err);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile, authLoading]);

  return { stats, loading: loading || authLoading, error };
}
