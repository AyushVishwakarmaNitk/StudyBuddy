import React, { createContext, useContext, useState, useCallback } from "react";
import styles from "../components/common/ToastContainer.module.css";
import { sanitizeErrorMessage } from "../utils/errorSanitizer";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: {
    type?: ToastType;
    title?: string;
    message: string;
    duration?: number;
  }) => void;
  success: (message: string, title?: string) => void;
  error: (err: unknown, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type = "info",
      title,
      message,
      duration = 4500,
    }: {
      type?: ToastType;
      title?: string;
      message: string;
      duration?: number;
    }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback(
    (message: string, title = "Success") => {
      showToast({ type: "success", title, message });
    },
    [showToast]
  );

  const error = useCallback(
    (err: unknown, title = "Notice") => {
      const friendlyMsg = sanitizeErrorMessage(err);
      showToast({ type: "error", title, message: friendlyMsg });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title = "Info") => {
      showToast({ type: "info", title, message });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title = "Warning") => {
      showToast({ type: "warning", title, message });
    },
    [showToast]
  );

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "⚠️";
      case "warning":
        return "🔔";
      case "info":
      default:
        return "✨";
    }
  };

  const getTypeClass = (type: ToastType) => {
    switch (type) {
      case "success":
        return styles.toastSuccess;
      case "error":
        return styles.toastError;
      case "warning":
        return styles.toastWarning;
      case "info":
      default:
        return styles.toastInfo;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, dismissToast }}>
      {children}
      {/* Toast Render Portal */}
      <div className={styles.toastWrapper} aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toastItem} ${getTypeClass(t.type)}`}
            role="alert"
          >
            <span className={styles.toastIcon}>{getIcon(t.type)}</span>
            <div className={styles.toastContent}>
              {t.title && <span className={styles.toastTitle}>{t.title}</span>}
              <span className={styles.toastMessage}>{t.message}</span>
            </div>
            <button
              type="button"
              className={styles.toastCloseBtn}
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
