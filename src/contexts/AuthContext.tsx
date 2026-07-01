import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { auditService } from '../services/AuditService';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'reader' | 'pending';
  status: 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isReadOnly: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);

  const isReadOnly = profile?.role === 'reader';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous profile listener if any
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }

      setUser(user);
      if (user) {
        const isSuperAdmin = user.email === 'llucianodcl@gmail.com';
        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            let data = snapshot.data() as UserProfile;
            
            // Auto-promote super admin if status is not correct in DB
            if (isSuperAdmin && (data.role !== 'admin' || data.status !== 'approved')) {
              try {
                await setDoc(userDocRef, { 
                  ...data, 
                  role: 'admin', 
                  status: 'approved' 
                }, { merge: true });
                data = { ...data, role: 'admin', status: 'approved' };
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
              }
            }
            
            setProfile(data);
          } else {
            const initialProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: isSuperAdmin ? 'admin' : 'pending',
              status: isSuperAdmin ? 'approved' : 'pending'
            };
            try {
              await setDoc(userDocRef, {
                ...initialProfile,
                requestedAt: serverTimestamp()
              });
              setProfile(initialProfile);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
            }
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });

        profileUnsubscribeRef.current = unsubProfile;
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
      }
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      await auditService.log({
        userId: result.user.uid,
        userName: result.user.displayName || result.user.email || 'Usuário',
        module: 'SISTEMA',
        action: 'LOGIN',
        details: 'Login efetuado com sucesso via Google'
      });
    }
  };

  const logout = async () => {
    if (user) {
      await auditService.log({
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuário',
        module: 'SISTEMA',
        action: 'LOGOUT',
        details: 'Logout efetuado'
      });
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isReadOnly, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
