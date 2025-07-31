"use client";

import React, { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
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

    return () => {
      clearTimeout(showTimer);
    };
  }, [toast.id]);

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
          align-items: flex-start;
          gap: 12px;
          padding: 16px 18px;
          margin-bottom: 10px;
          border-radius: 10px;
          backdrop-filter: blur(20px);
          border: 2px solid;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          transform: translateX(${isVisible ? "0" : "100%"});
          opacity: ${isVisible ? "1" : "0"};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 320px;
          max-width: 450px;
          position: relative;
          overflow: hidden;
        }

        .toast-success {
          background: rgba(76, 175, 80, 0.2);
          border-color: rgba(76, 175, 80, 0.5);
          color: #66bb6a;
        }

        .toast-error {
          background: rgba(244, 67, 54, 0.2);
          border-color: rgba(244, 67, 54, 0.5);
          color: #ef5350;
        }

        .toast-warning {
          background: rgba(255, 193, 7, 0.2);
          border-color: rgba(255, 193, 7, 0.5);
          color: #ffca28;
        }

        .toast-info {
          background: rgba(33, 150, 243, 0.2);
          border-color: rgba(33, 150, 243, 0.5);
          color: #42a5f5;
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
          line-height: 1.4;
          padding-top: 2px;
          white-space: pre-line;
        }

        .toast-close {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          padding: 4px 6px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
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
