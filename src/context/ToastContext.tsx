import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function cleanErrorMessage(msg: string): string {
  if (!msg) return 'An unexpected issue occurred';
  const str = String(msg).trim();

  // Try parsing JSON error info (such as FirestoreErrorInfo)
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.error) {
        return cleanErrorMessage(parsed.error);
      }
    } catch {}
  }

  // Common pattern replacements
  const lower = str.toLowerCase();
  if (lower.includes('client is offline')) {
    return 'Database is currently offline. Working from local cache until reconnected.';
  }
  if (lower.includes('insufficient permissions') || lower.includes('permission-denied')) {
    return 'Permission denied. Please verify your administrative or student login.';
  }
  if (lower.includes('quota exceeded') || lower.includes('quota-exceeded')) {
    return 'Cloud request quota reached for today. Changes are safely preserved.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return 'Network connection issue. Please check your internet connection.';
  }
  if (lower.includes('transaction could not be verified')) {
    return 'Transaction reference could not be verified. Please check the ID and try again.';
  }

  // Remove technical prefixes if present
  return str.replace(/^FirebaseError:\s*/i, '').replace(/^Error:\s*/i, '');
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((rawMessage: string, type: 'success' | 'error' | 'info' = 'info') => {
    const message = type === 'error' ? cleanErrorMessage(rawMessage) : rawMessage;
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={18} color="var(--accent-green)" />}
            {toast.type === 'error' && <AlertCircle size={18} color="var(--accent-red)" />}
            {toast.type === 'info' && <Info size={18} color="var(--primary)" />}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ color: 'var(--text-muted)', display: 'flex', padding: 2 }}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
