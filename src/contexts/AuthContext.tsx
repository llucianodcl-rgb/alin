import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

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

  const isReadOnly = profile?.role === 'reader';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const isSuperAdmin = user.email === 'llucianodcl@gmail.com';
        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            let data = snapshot.data() as UserProfile;
            
            // Auto-promote super admin if status is not correct in DB
            if (isSuperAdmin && (data.role !== 'admin' || data.status !== 'approved')) {
              await setDoc(userDocRef, { 
                ...data, 
                role: 'admin', 
                status: 'approved' 
              }, { merge: true });
              data = { ...data, role: 'admin', status: 'approved' };
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
              console.error("Error creating initial profile:", error);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error in profile listener:", error);
          setLoading(false);
        });

        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
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
