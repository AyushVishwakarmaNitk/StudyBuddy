import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import styles from "./SignUpLoginPage.module.css";

interface LoginFormData {
  username: string;
  password: string;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  password2: string;
}

interface SignUpLoginPageProps {
  initialIsSignUp?: boolean;
  onBackToLanding?: () => void;
  onLoginSuccess?: (userData: { username: string }) => void;
}

const SignUpLoginPage = ({
  initialIsSignUp = false,
  onBackToLanding,
  onLoginSuccess,
}: SignUpLoginPageProps) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(initialIsSignUp);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  const [loginData, setLoginData] = useState<LoginFormData>({
    username: "student",
    password: "study123",
  });

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    password2: "",
  });

  const switchPanel = (signUp: boolean) => {
    setIsSignUp(signUp);
    setError(null);
  };

  const handleLoginChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleRegisterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const passwordsMismatch =
    registerData.password2.length > 0 &&
    registerData.password !== registerData.password2;

  const handleLoginSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: call your login API here
    console.log("Login:", loginData);
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess({ username: loginData.username });
      }
    }, 800); // fake delay, remove later
  };

  const handleRegisterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordsMismatch) return;
    setIsLoading(true);
    // TODO: call your register API here
    console.log("Register:", registerData);
    setTimeout(() => {
      setIsLoading(false);
      setRegistrationSuccess(true);
    }, 800); // fake delay, remove later
  };

  if (registrationSuccess) {
    return (
      <div className={styles.page}>
        <div className={styles.successMessage}>
          <h2>Registration Successful!</h2>
          <p>Please check your email to verify your account.</p>
          <p>After verification, you can sign in.</p>
          <button
            className={styles.primaryBtn}
            onClick={() => {
              setRegistrationSuccess(false);
              switchPanel(false);
            }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {onBackToLanding && (
        <button
          type="button"
          onClick={onBackToLanding}
          className={styles.backButton}
        >
          ← Back to Home
        </button>
      )}

      <div
        className={`${styles.container} ${isSignUp ? styles.rightPanelActive : ""}`}
      >
        {/* Sign Up */}
        <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
          <form onSubmit={handleRegisterSubmit}>
            <div className={styles.formBrand}>
              <div className={styles.formLogo}>SB</div>
              <span className={styles.formBrandName}>StudyBuddy</span>
            </div>

            <h1>Create Account</h1>

            {error && isSignUp && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <span>Use your student email for registration</span>

            <input
              type="text"
              name="username"
              placeholder="Username"
              value={registerData.username}
              onChange={handleRegisterChange}
              autoComplete="username"
              required
              disabled={isLoading}
            />
            <input
              type="email"
              name="email"
              placeholder="Student Email"
              value={registerData.email}
              onChange={handleRegisterChange}
              autoComplete="email"
              required
              disabled={isLoading}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={registerData.password}
              onChange={handleRegisterChange}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
            <input
              type="password"
              name="password2"
              placeholder="Confirm Password"
              value={registerData.password2}
              onChange={handleRegisterChange}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />

            {passwordsMismatch && (
              <span className={styles.validationError}>
                Passwords don't match
              </span>
            )}

            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={isLoading || passwordsMismatch}
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>

            <div className={styles.googleLogin}>
              <span>or</span>
              {/* TODO: replace with real Google auth later */}
              <button type="button" className={styles.googleBtn} disabled={isLoading}>
                Continue with Google
              </button>
            </div>

            <div className={styles.mobileSwitch}>
              Already have an account?{" "}
              <button type="button" onClick={() => switchPanel(false)}>
                Sign In
              </button>
            </div>
          </form>
        </div>

        {/* Sign In */}
        <div className={`${styles.formContainer} ${styles.signInContainer}`}>
          <form onSubmit={handleLoginSubmit}>
            <div className={styles.formBrand}>
              <div className={styles.formLogo}>SB</div>
              <span className={styles.formBrandName}>StudyBuddy</span>
            </div>

            <h1>Welcome Back</h1>

            {error && !isSignUp && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <span>Sign in to access your study sessions</span>

            <input
              type="text"
              name="username"
              placeholder="Username"
              value={loginData.username}
              onChange={handleLoginChange}
              autoComplete="username"
              required
              disabled={isLoading}
            />

            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={loginData.password}
                onChange={handleLoginChange}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <a href="#" className={styles.forgotPassword}>
              Forgot password?
            </a>

            <button type="submit" className={styles.primaryBtn} disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </button>

            <div className={styles.googleLogin}>
              <span>or</span>
              <button type="button" className={styles.googleBtn} disabled={isLoading}>
                Continue with Google
              </button>
            </div>

            <div className={styles.mobileSwitch}>
              Don't have an account?{" "}
              <button type="button" onClick={() => switchPanel(true)}>
                Sign Up
              </button>
            </div>
          </form>
        </div>

        {/* Sliding Overlay */}
        <div className={styles.overlayContainer}>
          <div className={styles.overlay}>
            <div className={`${styles.overlayPanel} ${styles.overlayLeft}`}>
              <h1>Welcome Back!</h1>
              <p>Keep your study streak alive and stay connected with your study partners</p>
              <button
                type="button"
                className={`${styles.primaryBtn} ${styles.ghost}`}
                onClick={() => switchPanel(false)}
              >
                Sign In
              </button>
            </div>
            <div className={`${styles.overlayPanel} ${styles.overlayRight}`}>
              <h1>Hello, Learner!</h1>
              <p>Join thousands of students and find your ideal AI-matched study partner today</p>
              <button
                type="button"
                className={`${styles.primaryBtn} ${styles.ghost}`}
                onClick={() => switchPanel(true)}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpLoginPage;