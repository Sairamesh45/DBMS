import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(({ type, title, message, duration = 4000 }: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none p-2 sm:p-0">
        {toasts.map(toast => {
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isSuccess = toast.type === 'success';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-[0_8px_30px_rgba(112,91,66,0.12)] backdrop-blur-md transition-all duration-200 transform translate-y-0 ${
                isError
                  ? 'bg-[#FFFCF7]/95 border-[#B85C4A]/30 text-[#30291F]'
                  : isWarning
                  ? 'bg-[#FFFCF7]/95 border-[#B78343]/30 text-[#30291F]'
                  : isSuccess
                  ? 'bg-[#FFFCF7]/95 border-[#47765B]/30 text-[#30291F]'
                  : 'bg-[#FFFCF7]/95 border-[rgba(112,91,66,0.18)] text-[#30291F]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isError && (
                  <div className="w-8 h-8 rounded-full bg-[#B85C4A]/10 border border-[#B85C4A]/20 flex items-center justify-center text-[#B85C4A]">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                )}
                {isWarning && (
                  <div className="w-8 h-8 rounded-full bg-[#B78343]/10 border border-[#B78343]/20 flex items-center justify-center text-[#B78343]">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {isSuccess && (
                  <div className="w-8 h-8 rounded-full bg-[#47765B]/10 border border-[#47765B]/20 flex items-center justify-center text-[#47765B]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {!isError && !isWarning && !isSuccess && (
                  <div className="w-8 h-8 rounded-full bg-[#72583F]/10 border border-[#72583F]/20 flex items-center justify-center text-[#72583F]">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-sm font-semibold tracking-wide text-[#30291F]">{toast.title}</div>
                <div className="text-xs text-[#82776A] mt-1 leading-relaxed break-words">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-[#82776A] hover:text-[#30291F] p-1.5 rounded-full hover:bg-[#EFE5D6]/70 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
