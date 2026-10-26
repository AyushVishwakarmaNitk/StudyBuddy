import { useState, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import SignUpLoginPage from "./pages/SignUpLoginPage";
import DashboardPage from "./pages/DashboardPage";
import { authApi } from "./api/auth";
import type { AuthUser } from "./api/auth";
import { getAccessToken } from "./api/client";

function App() {
  const [currentView, setCurrentView] = useState<"landing" | "auth" | "dashboard">("landing");
  const [authIsSignUp, setAuthIsSignUp] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Check existing session on startup
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const res = await authApi.getCurrentUser();
          if (res?.user) {
            setCurrentUser(res.user);
            setCurrentView("dashboard");
          }
        } catch {
          // Token expired or invalid
          authApi.logout();
        }
      }
      setIsInitializing(false);
    };

    initAuth();
  }, []);

  const handleNavigateToAuth = (isSignUp: boolean = false) => {
    setAuthIsSignUp(isSignUp);
    setCurrentView("auth");
  };

  const handleBackToLanding = () => {
    setCurrentView("landing");
  };

  const handleLoginSuccess = (userData: AuthUser) => {
    setCurrentUser(userData);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setCurrentView("landing");
  };

  if (isInitializing) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFBF7",
          fontFamily: "'Inter', sans-serif",
          color: "#E25822",
          fontSize: "1.1rem",
          fontWeight: 600,
        }}
      >
        Loading StudyBuddy...
      </div>
    );
  }

  if (currentView === "dashboard") {
    return <DashboardPage user={currentUser} onLogout={handleLogout} />;
  }

  if (currentView === "auth") {
    return (
      <SignUpLoginPage
        initialIsSignUp={authIsSignUp}
        onBackToLanding={handleBackToLanding}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return <LandingPage onNavigateToAuth={handleNavigateToAuth} />;
}

export default App;
