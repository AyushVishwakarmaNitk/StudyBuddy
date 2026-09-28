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

const SignUpLoginPage = () => {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  const [loginData, setLoginData] = useState<LoginFormData>({
    username: "",
    password: "",
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
    setTimeout(() => setIsLoading(false), 800); // fake delay, remove later
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
      <div
        className={`${styles.container} ${isSignUp ? styles.rightPanelActive : ""}`}
      >
        {/* Sign Up */}
        <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
          <form onSubmit={handleRegisterSubmit}>
            <h1>Create Account</h1>

            {error && isSignUp && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <span>or use your email for registration</span>

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
              placeholder="Email"
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
          </form>
        </div>

        {/* Sign In */}
        <div className={`${styles.formContainer} ${styles.signInContainer}`}>
          <form onSubmit={handleLoginSubmit}>
            <h1>Sign in</h1>

            {error && !isSignUp && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <span>or use your account</span>

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
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <a href="#" className={styles.forgotPassword}>
              Forgot your password?
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
          </form>
        </div>

        {/* Overlay */}
        <div className={styles.overlayContainer}>
          <div className={styles.overlay}>
            <div className={`${styles.overlayPanel} ${styles.overlayLeft}`}>
              <h1>Welcome Back!</h1>
              <p>To keep connected with us please login with your personal info</p>
              <button
                type="button"
                className={`${styles.primaryBtn} ${styles.ghost}`}
                onClick={() => switchPanel(false)}
              >
                Sign In
              </button>
            </div>
            <div className={`${styles.overlayPanel} ${styles.overlayRight}`}>
              <h1>Hello, Friend!</h1>
              <p>Enter your personal details and start your journey with us</p>
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