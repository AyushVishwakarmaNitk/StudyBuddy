import { useState } from "react";
import type { FormEvent } from "react";
import BrandLogo from "../components/common/BrandLogo";
import { authApi } from "../api/auth";
import { sanitizeErrorMessage } from "../utils/errorSanitizer";
import styles from "./PasswordResetPage.module.css";

interface PasswordResetPageProps {
  mode: "request" | "confirm";
  uid?: string;
  token?: string;
  onBack: () => void;
  onComplete: () => void;
}

const PasswordResetPage = ({ mode, uid = "", token = "", onBack, onComplete }: PasswordResetPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode === "confirm" && password !== passwordConfirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "request") {
        await authApi.requestPasswordReset(email.trim());
      } else {
        await authApi.confirmPasswordReset({ uid, token, new_password: password });
      }
      setIsComplete(true);
    } catch (submitError) {
      setError(sanitizeErrorMessage(submitError, "We could not complete that request. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <button type="button" className={styles.backLink} onClick={onBack}>← Back to sign in</button>
      <section className={styles.card}>
        <BrandLogo size="md" showTagline={false} />
        {isComplete ? (
          <div className={styles.successState}>
            <div className={styles.successMark}>✓</div>
            <h1>{mode === "request" ? "Check your email" : "Password updated"}</h1>
            <p>{mode === "request"
              ? "If an account exists for that email, password reset instructions have been sent."
              : "Your password has been changed. You can now sign in with the new password."}</p>
            <button type="button" className={styles.primaryButton} onClick={onComplete}>Return to sign in</button>
          </div>
        ) : (
          <>
            <div className={styles.heading}>
              <span className={styles.eyebrow}>ACCOUNT RECOVERY</span>
              <h1>{mode === "request" ? "Forgot your password?" : "Choose a new password"}</h1>
              <p>{mode === "request"
                ? "Enter the email address linked to your StudyBuddy account and we’ll send a reset link."
                : "Use a new password with at least 8 characters."}</p>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              {mode === "request" ? (
                <label className={styles.field}>
                  Email address
                  <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                </label>
              ) : (
                <>
                  <label className={styles.field}>
                    New password
                    <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    Confirm new password
                    <input type="password" autoComplete="new-password" minLength={8} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
                  </label>
                </>
              )}
              {error && <p className={styles.error} role="alert">{error}</p>}
              <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                {isLoading ? "Please wait…" : mode === "request" ? "Send reset link" : "Update password"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
};

export default PasswordResetPage;
