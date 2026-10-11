import React, { useEffect } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  maxWidth?: string | number;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  maxWidth = 540,
  children,
  className = "",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${className}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.modalCloseBtn}
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {(title || subtitle || badge) && (
          <div className={styles.modalHeader}>
            {badge && <span className={styles.modalBadge}>{badge}</span>}
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default Modal;

