import React, { createContext, useContext, useState } from "react";
import "../../styles/toast.scss";

type ToastType = "success" | "error";
interface Toast { id: number; type: ToastType; message: string; hiding?: boolean; }

const ToastContext = createContext({ showToast: (t: ToastType, m: string) => {} });

export function useToast() {
  return useContext(ToastContext) as { showToast: (t: ToastType, m: string) => void };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, type, message }]);
    setTimeout(() => setToasts((s) => s.map(t => t.id === id ? { ...t, hiding: true } : t)), 2600);
    setTimeout(() => setToasts((s) => s.filter(t => t.id !== id)), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-root" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type} ${t.hiding ? "hiding" : ""}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}