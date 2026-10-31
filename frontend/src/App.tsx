import { useState, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import SignUpLoginPage from "./pages/SignUpLoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfileCompletionPage from "./pages/ProfileCompletionPage";
import SessionWarningDialog from "./components/common/SessionWarningDialog";
import { authApi } from "./api/auth";
import type { AuthUser } from "./api/auth";
import { getAccessToken } from "./api/client";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

function App() {
  const [currentView, setCurrentView] = useState<"landing" | "auth" | "profile-completion" | "dashboard">("landing");
  const [authIsSignUp, setAuthIsSignUp] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  // Inactivity Session Management Hook
  const {
    isWarningOpen,
    secondsRemaining,
    isExtending,
    handleStayLoggedIn,
    handleDialogLogout,
  } = useSessionTimeout({
    isAuthenticated: Boolean(currentUser && (currentView === "dashboard" || currentView === "profile-completion")),
    onSessionExpired: () => {
      setCurrentUser(null);
      setSessionExpiredMessage("Your session expired because of inactivity. Please log in again to continue.");
      setCurrentView("landing");
    },
    onLogout: () => {
      setCurrentUser(null);
      setSessionExpiredMessage(null);
      setCurrentView("landing");
    },
  });

  // Check existing session on application boot
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const res = await authApi.getCurrentUser();
          if (res?.user) {
            setCurrentUser(res.user);
            if (!res.user.is_profile_completed) {
              setCurrentView("profile-completion");
            } else {
              setCurrentView("dashboard");
            }
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
    setSessionExpiredMessage(null);
    setCurrentView("auth");
  };

  const handleBackToLanding = () => {
    setCurrentView("landing");
  };

  const handleLoginSuccess = (userData: AuthUser) => {
    setCurrentUser(userData);
    setSessionExpiredMessage(null);

    // Redirect incomplete profiles to profile onboarding; complete profiles to dashboard
    if (!userData.is_profile_completed) {
      setCurrentView("profile-completion");
    } else {
      setCurrentView("dashboard");
    }
  };

  const handleProfileCompleted = (updatedUser: AuthUser) => {
    setCurrentUser(updatedUser);
    setCurrentView("dashboard");
  };

  const handleLogout = async () => {
    await authApi.logout();
    setCurrentUser(null);
    setSessionExpiredMessage(null);
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

  return (
    <>
      {/* Session Inactivity Warning Dialog */}
      <SessionWarningDialog
        isOpen={isWarningOpen}
        secondsRemaining={secondsRemaining}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleDialogLogout}
        isExtending={isExtending}
      />

      {/* Main View Router */}
      {currentView === "dashboard" && (
        <DashboardPage user={currentUser} onLogout={handleLogout} />
      )}

      {currentView === "profile-completion" && (
        <ProfileCompletionPage
          user={currentUser}
          onProfileCompleted={handleProfileCompleted}
          onLogout={handleLogout}
        />
      )}

      {currentView === "auth" && (
        <SignUpLoginPage
          initialIsSignUp={authIsSignUp}
          onBackToLanding={handleBackToLanding}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentView === "landing" && (
        <LandingPage
          onNavigateToAuth={handleNavigateToAuth}
          sessionExpiredMessage={sessionExpiredMessage}
          onDismissSessionExpired={() => setSessionExpiredMessage(null)}
        />
      )}
    </>
  );
}

export default App;
