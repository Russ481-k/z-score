"use client";

import React, { useState, useCallback } from "react";
import Toast, { ToastMessage } from "./Toast";

interface ToastContainerProps {
  children: React.ReactNode;
}

export interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastMessage["type"],
    duration?: number
  ) => void;
}

export const ToastContext = React.createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastContainer");
  }
  return context;
};

const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastMessage["type"] = "info",
      duration: number = 3000
    ) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newToast: ToastMessage = {
        id,
        type,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <>
      <style jsx>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          pointer-events: none;
        }

        .toast-container > :global(div) {
          pointer-events: auto;
        }
      `}</style>
      <ToastContext.Provider value={{ showToast }}>
        {children}
        <div className="toast-container">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </div>
      </ToastContext.Provider>
    </>
  );
};

export default ToastContainer;
