import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Clock, XCircle, LogOut } from 'lucide-react';
import { db as firestoreDb, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
  const { user, profile, loading, signIn, logout } = useAuth();
  const location = useLocation();
  const [appLogo, setAppLogo] = useState<string | null>(null);

  useEffect(() => {
    const docRef = doc(firestoreDb, 'settings', 'appLogo');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setAppLogo(snapshot.data().value || null);
      } else {
        setAppLogo(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/appLogo');
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200 p-8 text-center space-y-6">
          <div className="flex justify-center">
            <img 
              src={appLogo || "/icon-192.png"} 
              alt="Logo GEIN" 
              className="w-24 h-24 object-contain rounded-2xl shadow-lg shadow-blue-100"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Bem-vindo ao GEIN</h1>
            <p className="text-slate-500">Acesse o sistema de gestão inteligente do seu almoxarifado.</p>
          </div>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.email === 'llucianodcl@gmail.com';

  if (!profile && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200 p-8 text-center space-y-6">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (profile?.status === 'pending' && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
            <Clock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Acesso Pendente</h1>
            <p className="text-slate-500">Sua solicitação foi enviada. Um administrador revisará seu acesso em breve.</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-sm text-amber-800">
              Você será notificado assim que seu acesso for aprovado.
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sair da conta
          </button>
        </div>
      </div>
    );
  }

  if (profile?.status === 'rejected' && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600">
            <XCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Acesso Rejeitado</h1>
            <p className="text-slate-500">Infelizmente sua solicitação de acesso não foi aprovada.</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sair da conta
          </button>
        </div>
      </div>
    );
  }

  if (requireAdmin && profile?.role !== 'admin' && !isSuperAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
