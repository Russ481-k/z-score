"use client";

import React, { useState, useCallback } from "react";
import Toast, { ToastMessage } from "./Toast";

interface ToastContainerProps {
  children: React.ReactNode;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastMessage["type"]) => void;
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
    (message: string, type: ToastMessage["type"] = "info") => {
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newToast: ToastMessage = {
        id,
        type,
        message,
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
          top: 0;
          right: 0;
          bottom: 0;
          width: 480px;
          z-index: 9999;
          pointer-events: none;
          padding: 20px;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .toast-container > :global(div) {
          pointer-events: auto;
        }

        .toast-container::-webkit-scrollbar {
          width: 8px;
        }

        .toast-container::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }

        .toast-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .toast-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
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
