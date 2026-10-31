import React, { useEffect, useRef } from "react";
import styles from "./SessionWarningDialog.module.css";

interface SessionWarningDialogProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
  isExtending?: boolean;
}

export const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogout,
  isExtending = false,
}) => {
  const logoutBtnRef = useRef<HTMLButtonElement>(null);

  // Focus default button (Logout) when modal opens as requested
  useEffect(() => {
    if (isOpen) {
      logoutBtnRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.dialogOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
    >
      <div className={styles.dialogCard}>
        <div className={styles.warningIcon}>⏳</div>
        <h2 id="session-warning-title" className={styles.title}>
          Your session is about to expire
        </h2>
        <p className={styles.message}>
          For your security, you'll be logged out soon because of inactivity.
        </p>

        <div className={styles.countdownBadge}>
          Auto-logout in {secondsRemaining}s
        </div>

        <div className={styles.actions}>
          {/* Default action is Logout as requested */}
          <button
            ref={logoutBtnRef}
            type="button"
            className={styles.logoutBtn}
            onClick={onLogout}
          >
            Logout
          </button>

          <button
            type="button"
            className={styles.stayLoggedInBtn}
            onClick={onStayLoggedIn}
            disabled={isExtending}
          >
            {isExtending ? "Extending session..." : "Stay Logged In"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningDialog;

