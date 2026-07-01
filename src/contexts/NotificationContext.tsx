import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';

type ActionType = 'delete' | 'save' | 'edit';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  type?: 'default' | 'danger';
  onConfirm: () => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
}

interface UnsavedChangesOptions {
  onContinue: () => void;
  onSaveDraft: () => void;
  onDiscard: () => void;
}

interface UndoOptions {
  message: string;
  onUndo: () => Promise<void> | void;
}

interface NotificationContextType {
  confirm: (options: ConfirmOptions) => void;
  showUndo: (options: UndoOptions) => void;
  showUnsavedChanges: (options: UnsavedChangesOptions) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const [unsavedOptions, setUnsavedOptions] = useState<UnsavedChangesOptions | null>(null);
  const [undoOptions, setUndoOptions] = useState<UndoOptions | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: string } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    const standardizedOptions = {
      ...options,
      confirmLabel: options.confirmLabel || options.confirmText || 'Confirmar',
      cancelLabel: options.cancelLabel || options.cancelText || 'Cancelar',
      variant: options.variant || (options.type === 'danger' ? 'destructive' : 'default')
    };
    setConfirmOptions(standardizedOptions);
  }, []);

  const showUnsavedChanges = useCallback((options: UnsavedChangesOptions) => {
    setUnsavedOptions(options);
  }, []);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setNotification({ message, type });
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  const showUndo = useCallback((options: UndoOptions) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoOptions(options);
    undoTimerRef.current = setTimeout(() => {
      setUndoOptions(null);
    }, 5000);
  }, []);

  const handleConfirm = async () => {
    if (confirmOptions) {
      await confirmOptions.onConfirm();
      setConfirmOptions(null);
    }
  };

  const handleCancel = async () => {
    if (confirmOptions) {
      if (confirmOptions.onCancel) await confirmOptions.onCancel();
      setConfirmOptions(null);
    }
  };

  const handleUndo = async () => {
    if (undoOptions) {
      await undoOptions.onUndo();
      setUndoOptions(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      // Small feedback that it was undone
      alert('Ação desfeita com sucesso.');
    }
  };

  return (
    <NotificationContext.Provider value={{ confirm, showUndo, showUnsavedChanges, showNotification }}>
      {children}

      {/* Standard Notification SnackBar */}
      <AnimatePresence>
        {notification && (
          <div className="fixed top-24 right-8 z-[110] w-full max-w-sm px-4">
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className={`rounded-2xl shadow-2xl p-4 flex items-center gap-4 border ${
                notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                'bg-white border-slate-100 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-600' :
                  notification.type === 'error' ? 'bg-red-500/20 text-red-600' :
                  'bg-blue-500/20 text-blue-600'
                }`}>
                  {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              
              <button
                onClick={() => setNotification(null)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors ml-auto"
              >
                <X className="w-4 h-4 opacity-50" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmOptions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmOptions(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${confirmOptions.variant === 'destructive' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{confirmOptions.title}</h3>
                </div>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  {confirmOptions.message}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 order-2 sm:order-1"
                    onClick={handleCancel}
                  >
                    {confirmOptions.cancelLabel || 'Cancelar'}
                  </Button>
                  <Button
                    variant={confirmOptions.variant === 'destructive' ? 'destructive' : 'default'}
                    className="flex-1 order-1 sm:order-2"
                    onClick={handleConfirm}
                  >
                    {confirmOptions.confirmLabel || 'Confirmar'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {unsavedOptions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUnsavedOptions(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Alterações não salvas</h3>
                </div>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  Você realizou alterações que ainda não foram salvas. O que deseja fazer?
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      unsavedOptions.onContinue();
                      setUnsavedOptions(null);
                    }}
                    className="w-full"
                  >
                    Continuar editando
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      unsavedOptions.onSaveDraft();
                      setUnsavedOptions(null);
                    }}
                    className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Salvar rascunho
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      unsavedOptions.onDiscard();
                      setUnsavedOptions(null);
                    }}
                    className="w-full text-red-600 hover:bg-red-50"
                  >
                    Descartar alterações
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setUnsavedOptions(null)}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Undo SnackBar */}
      <AnimatePresence>
        {undoOptions && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] w-full max-w-md px-4">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">{undoOptions.message}</p>
              </div>
              
              <button
                onClick={handleUndo}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors text-blue-400"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                DESFAZER
              </button>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 w-full overflow-hidden rounded-b-2xl">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="h-full bg-blue-500"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
