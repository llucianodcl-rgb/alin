import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useNotification } from './NotificationContext';

interface NavigationContextType {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  saveDraft: (type: string, data: any) => Promise<void>;
  discardDraft: (type: string) => Promise<void>;
  getDraft: (type: string) => Promise<any | null>;
  goBack: () => void;
  navigateWithDirtyCheck: (to: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { showUnsavedChanges } = useNotification();

  const getParentPath = useCallback((path: string) => {
    // Standard hierarchy logic
    if (path === '/') return null;
    
    // Check specific custom flows
    if (path === '/financeiro/despesas' || path === '/financeiro/receitas' || path === '/financeiro/fluxo-caixa' || path === '/financeiro/dre') {
      return '/financeiro';
    }
    if (path === '/financeiro' || path === '/almoxarifado' || path === '/rh' || path === '/configuracoes' || path === '/dashboard' || path === '/historico-insights') {
      return '/';
    }
    
    // Stock related
    if (path === '/produtos' || path === '/categorias' || path === '/fornecedores' || path === '/entradas' || path === '/saidas' || path === '/historico') {
      return '/almoxarifado';
    }
    
    // RH related
    if (path === '/funcionarios') {
      return '/rh';
    }

    // Dynamic paths (forms)
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 1) {
      return '/' + segments.slice(0, -1).join('/');
    }
    
    return '/';
  }, []);

  const navigateWithDirtyCheck = useCallback((to: string) => {
    if (isDirty) {
      showUnsavedChanges({
        onContinue: () => {},
        onSaveDraft: () => {
          setIsDirty(false);
          navigate(to);
        },
        onDiscard: () => {
          setIsDirty(false);
          navigate(to);
        }
      });
      return;
    }
    navigate(to);
  }, [isDirty, navigate, showUnsavedChanges]);

  const goBack = useCallback(() => {
    const parent = getParentPath(location.pathname);
    const target = parent || -1;

    if (isDirty) {
      showUnsavedChanges({
        onContinue: () => {},
        onSaveDraft: () => {
          setIsDirty(false);
          if (typeof target === 'string') navigate(target);
          else navigate(target);
        },
        onDiscard: () => {
          setIsDirty(false);
          if (typeof target === 'string') navigate(target);
          else navigate(target);
        }
      });
      return;
    }

    if (typeof target === 'string') navigate(target);
    else navigate(target);
  }, [location.pathname, navigate, getParentPath, isDirty, showUnsavedChanges]);

  // Handle hardware back button and swipe back gestures
  useEffect(() => {
    if (isDirty) {
      // Add a dummy state to history to intercept the next back action
      window.history.pushState({ intercepted: true }, '');
      
      const handlePopState = (event: PopStateEvent) => {
        // If we are dirty and the user tried to go back
        showUnsavedChanges({
          onContinue: () => {
            // Put the dummy state back
            window.history.pushState({ intercepted: true }, '');
          },
          onSaveDraft: () => {
            setIsDirty(false);
            goBack();
          },
          onDiscard: () => {
            setIsDirty(false);
            goBack();
          }
        });
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isDirty, showUnsavedChanges, goBack]);

  const saveDraft = async (type: string, data: any) => {
    await db.table('drafts').put({
      id: type,
      type,
      data,
      updatedAt: new Date().toISOString()
    });
  };

  const discardDraft = async (type: string) => {
    await db.table('drafts').delete(type);
  };

  const getDraft = async (type: string) => {
    const draft = await db.table('drafts').get(type);
    return draft ? draft.data : null;
  };
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <NavigationContext.Provider value={{ 
      isDirty, 
      setIsDirty, 
      saveDraft, 
      discardDraft, 
      getDraft, 
      goBack,
      navigateWithDirtyCheck
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
