import { useState, useEffect, useCallback, useRef } from "react";
import { authApi } from "../api/auth";
import { getAccessToken } from "../api/client";

const STORAGE_KEY_LAST_ACTIVITY = "sb_last_activity_time";

// Configuration from environment or defaults
// TIMEOUT_SECONDS  – total inactivity before warning shows (default 10 s)
// WARNING_SECONDS  – how many inactivity-seconds left when dialog opens (default 5 s)
// DIALOG_SECONDS   – how long the dialog stays open before auto-logout (default 10 s)
const TIMEOUT_SECONDS = Number(import.meta.env.VITE_SESSION_TIMEOUT_SECONDS) || 10;
const WARNING_SECONDS = Number(import.meta.env.VITE_SESSION_WARNING_SECONDS) || 5;
const DIALOG_SECONDS  = Number(import.meta.env.VITE_SESSION_DIALOG_SECONDS)  || 10;

interface UseSessionTimeoutProps {
  isAuthenticated: boolean;
  onSessionExpired: () => void;
  onLogout: () => void;
}

export function useSessionTimeout({
  isAuthenticated,
  onSessionExpired,
  onLogout,
}: UseSessionTimeoutProps) {
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  // secondsRemaining now counts down from DIALOG_SECONDS once the dialog opens
  const [secondsRemaining, setSecondsRemaining] = useState<number>(DIALOG_SECONDS);
  const [isExtending, setIsExtending] = useState<boolean>(false);

  const lastActivityRef  = useRef<number>(Date.now());
  const throttleRef      = useRef<number>(0);
  // Tracks whether the warning dialog is currently displayed (ref avoids stale closure)
  const warningOpenRef   = useRef<boolean>(false);
  // Counts down the dialog's own 10-second window; -1 means dialog not active
  const dialogCounterRef = useRef<number>(-1);

  const setWarningOpen = (value: boolean) => {
    warningOpenRef.current = value;
    setIsWarningOpen(value);
  };

  // Record user activity locally and synchronize across tabs via localStorage
  const recordActivity = useCallback(() => {
    if (warningOpenRef.current) return; // ignore passive events while dialog is open
    const now = Date.now();
    if (now - throttleRef.current > 800) {
      throttleRef.current = now;
      lastActivityRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(now));
      } catch {
        // Safe localStorage fallback
      }
    }
  }, []);

  // Extend session on the backend
  const handleStayLoggedIn = useCallback(async () => {
    setIsExtending(true);
    try {
      const res = await authApi.extendSession();
      if (res?.success) {
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(now));
        dialogCounterRef.current = -1;         // reset dialog countdown
        setSecondsRemaining(DIALOG_SECONDS);
        setWarningOpen(false);
      } else {
        // Backend indicated expiration
        dialogCounterRef.current = -1;
        setWarningOpen(false);
        await authApi.logout();
        onSessionExpired();
      }
    } catch {
      dialogCounterRef.current = -1;
      setWarningOpen(false);
      await authApi.logout();
      onSessionExpired();
    } finally {
      setIsExtending(false);
    }
  }, [onSessionExpired]);

  // Explicit user logout from dialog
  const handleDialogLogout = useCallback(async () => {
    dialogCounterRef.current = -1;
    setWarningOpen(false);
    await authApi.logout();
    onLogout();
  }, [onLogout]);

  useEffect(() => {
    if (!isAuthenticated || !getAccessToken()) {
      setWarningOpen(false);
      return;
    }

    // Initialize activity on session start
    const initialTime = Date.now();
    lastActivityRef.current = initialTime;
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(initialTime));

    // Meaningful user activity event listeners
    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    const handleUserEvent = () => recordActivity();
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserEvent, { passive: true });
    });

    // Synchronize across multiple open tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_LAST_ACTIVITY && e.newValue) {
        const remoteTime = Number(e.newValue);
        if (!isNaN(remoteTime) && remoteTime > lastActivityRef.current) {
          lastActivityRef.current = remoteTime;
          dialogCounterRef.current = -1;
          setSecondsRemaining(DIALOG_SECONDS);
          setWarningOpen(false);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Single interval driving both inactivity detection and dialog countdown
    const intervalId = window.setInterval(async () => {
      // ── Dialog countdown phase ──────────────────────────────────────────
      // If dialog is open, tick its own counter independently.
      if (warningOpenRef.current) {
        if (dialogCounterRef.current > 0) {
          dialogCounterRef.current -= 1;
          setSecondsRemaining(dialogCounterRef.current);
        }
        if (dialogCounterRef.current <= 0) {
          // Dialog timeout exhausted – auto-logout
          dialogCounterRef.current = -1;
          setWarningOpen(false);
          await authApi.logout();
          onSessionExpired();
        }
        return; // Do not run inactivity check while dialog is open
      }

      // ── Inactivity detection phase ──────────────────────────────────────
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const remainingSeconds = TIMEOUT_SECONDS - elapsedSeconds;

      if (remainingSeconds <= WARNING_SECONDS && !warningOpenRef.current) {
        // Open dialog and start its own 10-second countdown
        dialogCounterRef.current = DIALOG_SECONDS;
        setSecondsRemaining(DIALOG_SECONDS);
        setWarningOpen(true);
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserEvent);
      });
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isAuthenticated, recordActivity, onSessionExpired]);

  return {
    isWarningOpen,
    secondsRemaining,
    isExtending,
    handleStayLoggedIn,
    handleDialogLogout,
  };
}
