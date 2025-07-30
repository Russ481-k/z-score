"use client";

import React, { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 마운트 시 애니메이션을 위해 약간의 지연
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // 자동 제거 타이머
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300); // 애니메이션 후 제거
    }, toast.duration || 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ⓘ";
      default:
        return "ⓘ";
    }
  };

  const getTypeClass = () => {
    switch (toast.type) {
      case "success":
        return "toast-success";
      case "error":
        return "toast-error";
      case "warning":
        return "toast-warning";
      case "info":
        return "toast-info";
      default:
        return "toast-info";
    }
  };

  return (
    <>
      <style jsx>{`
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          margin-bottom: 8px;
          border-radius: 8px;
          backdrop-filter: blur(20px);
          border: 1px solid;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transform: translateX(${isVisible ? "0" : "100%"});
          opacity: ${isVisible ? "1" : "0"};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 300px;
          max-width: 400px;
          position: relative;
          overflow: hidden;
        }

        .toast-success {
          background: rgba(76, 175, 80, 0.15);
          border-color: rgba(76, 175, 80, 0.3);
          color: #4caf50;
        }

        .toast-error {
          background: rgba(244, 67, 54, 0.15);
          border-color: rgba(244, 67, 54, 0.3);
          color: #f44336;
        }

        .toast-warning {
          background: rgba(255, 193, 7, 0.15);
          border-color: rgba(255, 193, 7, 0.3);
          color: #ffc107;
        }

        .toast-info {
          background: rgba(33, 150, 243, 0.15);
          border-color: rgba(33, 150, 243, 0.3);
          color: #2196f3;
        }

        .toast-icon {
          font-size: 16px;
          font-weight: bold;
          min-width: 20px;
          text-align: center;
        }

        .toast-message {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: #e0e0e0;
        }

        .toast-close {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
      <div className={`toast ${getTypeClass()}`}>
        <div className="toast-icon">{getIcon()}</div>
        <div className="toast-message">{toast.message}</div>
        <button
          className="toast-close"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onRemove(toast.id), 300);
          }}
        >
          ✕
        </button>
      </div>
    </>
  );
};

export default Toast;
