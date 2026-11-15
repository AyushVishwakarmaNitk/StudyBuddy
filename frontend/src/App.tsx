import { useState, useEffect, useRef } from "react";
import LandingPage from "./pages/LandingPage";
import SignUpLoginPage from "./pages/SignUpLoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfileCompletionPage from "./pages/ProfileCompletionPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import PasswordResetPage from "./pages/PasswordResetPage";
import StudySpacePage from "./pages/StudySpacePage";
import SessionWarningDialog from "./components/common/SessionWarningDialog";
import PencilLoader from "./components/common/PencilLoader";
import { ToastProvider } from "./context/ToastContext";
import { authApi } from "./api/auth";
import type { AuthUser } from "./api/auth";
import type { StudySpace } from "./types/dashboard";
import { getAccessToken } from "./api/client";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

const getStudySpaceIdFromPath = () => window.location.pathname.match(/^\/study-space\/(\d+)\/?$/)?.[1] ?? null;

function App() {
  const [currentView, setCurrentView] = useState<
    "landing" | "auth" | "profile-completion" | "dashboard" | "questionnaire" | "forgot-password" | "reset-password" | "study-space"
  >(() => {
    if (window.location.pathname === "/forgot-password") return "forgot-password";
    if (window.location.pathname === "/reset-password") return "reset-password";
    if (getStudySpaceIdFromPath()) return "study-space";
    return "landing";
  });
  const [authIsSignUp, setAuthIsSignUp] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [questionnaireSpace, setQuestionnaireSpace] = useState<StudySpace | null>(null);
  const [studySpaceId, setStudySpaceId] = useState<string | null>(getStudySpaceIdFromPath);
  const initialStudySpaceId = useRef(studySpaceId).current;
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
    isAuthenticated: Boolean(
      currentUser &&
        (currentView === "dashboard" ||
          currentView === "profile-completion" ||
          currentView === "questionnaire" ||
          currentView === "study-space")
    ),
    onSessionExpired: () => {
      setCurrentUser(null);
      setQuestionnaireSpace(null);
      setSessionExpiredMessage(
        "Your session expired because of inactivity. Please log in again to continue."
      );
      setCurrentView("landing");
    },
    onLogout: () => {
      setCurrentUser(null);
      setQuestionnaireSpace(null);
      setSessionExpiredMessage(null);
      setCurrentView("landing");
    },
  });

  // Check existing session on application boot
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      const isPasswordRoute = ["/forgot-password", "/reset-password"].includes(window.location.pathname);
      if (token && !isPasswordRoute) {
        try {
          const res = await authApi.getCurrentUser();
          if (res?.user) {
            setCurrentUser(res.user);
            if (!res.user.is_profile_completed) {
              setCurrentView("profile-completion");
            } else {
              setCurrentView(initialStudySpaceId ? "study-space" : "dashboard");
            }
          }
        } catch {
          // Token expired or invalid
          authApi.logout();
          if (initialStudySpaceId) {
            window.history.replaceState({}, "", "/");
            setStudySpaceId(null);
            setCurrentView("landing");
          }
        }
      }
      if (!token && initialStudySpaceId) setCurrentView("landing");
      setIsInitializing(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    const handleBrowserNavigation = () => {
      const routeSpaceId = getStudySpaceIdFromPath();
      if (routeSpaceId) {
        setStudySpaceId(routeSpaceId);
        setCurrentView(currentUser ? "study-space" : "landing");
      } else if (window.location.pathname === "/forgot-password") {
        setCurrentView("forgot-password");
      } else if (window.location.pathname === "/reset-password") {
        setCurrentView("reset-password");
      } else if (window.location.pathname === "/auth") {
        setStudySpaceId(null);
        setCurrentView("auth");
      } else if (currentUser) {
        setStudySpaceId(null);
        setCurrentView("dashboard");
      } else {
        setCurrentView("landing");
      }
    };
    window.addEventListener("popstate", handleBrowserNavigation);
    return () => window.removeEventListener("popstate", handleBrowserNavigation);
  }, [currentUser]);

  const handleNavigateToAuth = (isSignUp: boolean = false) => {
    setAuthIsSignUp(isSignUp);
    setSessionExpiredMessage(null);
    setCurrentView("auth");
  };

  const showForgotPassword = () => {
    window.history.pushState({}, "", "/forgot-password");
    setCurrentView("forgot-password");
  };

  const returnToSignIn = () => {
    window.history.pushState({}, "", "/auth");
    setAuthIsSignUp(false);
    setCurrentView("auth");
  };

  const openStudySpace = (space: StudySpace) => {
    const id = String(space.id);
    setStudySpaceId(id);
    window.history.pushState({}, "", `/study-space/${id}`);
    setCurrentView("study-space");
  };

  const backToDashboard = () => {
    window.history.pushState({}, "", "/dashboard");
    setStudySpaceId(null);
    setCurrentView("dashboard");
  };

  const handleBackToLanding = () => {
    window.history.pushState({}, "", "/");
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
    setQuestionnaireSpace(null);
      setStudySpaceId(null);
    setSessionExpiredMessage(null);
    window.history.pushState({}, "", "/");
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
        }}
      >
        <PencilLoader size={90} message="Loading StudyBuddy..." />
      </div>
    );
  }

  return (
    <ToastProvider>
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
        <DashboardPage
          user={currentUser}
          onLogout={handleLogout}
          onOpenStudySpace={openStudySpace}
          onFindPartnerForSpace={(space) => {
            setQuestionnaireSpace(space);
            setCurrentView("questionnaire");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {currentView === "questionnaire" && (
        <QuestionnairePage
          space={questionnaireSpace}
          onBack={() => {
            setQuestionnaireSpace(null);
            setCurrentView("dashboard");
          }}
          onPartnerRequestSent={() => {
            setQuestionnaireSpace(null);
            setCurrentView("dashboard");
          }}
        />
      )}

      {currentView === "study-space" && studySpaceId && currentUser && (
        <StudySpacePage spaceId={studySpaceId} user={currentUser} onBack={backToDashboard} />
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
          onForgotPassword={showForgotPassword}
        />
      )}

      {currentView === "forgot-password" && (
        <PasswordResetPage mode="request" onBack={returnToSignIn} onComplete={returnToSignIn} />
      )}

      {currentView === "reset-password" && (
        <PasswordResetPage
          mode="confirm"
          uid={new URLSearchParams(window.location.search).get("uid") ?? ""}
          token={new URLSearchParams(window.location.search).get("token") ?? ""}
          onBack={returnToSignIn}
          onComplete={returnToSignIn}
        />
      )}

      {currentView === "landing" && (
        <LandingPage
          onNavigateToAuth={handleNavigateToAuth}
          sessionExpiredMessage={sessionExpiredMessage}
          onDismissSessionExpired={() => setSessionExpiredMessage(null)}
        />
      )}
    </ToastProvider>
  );
}

export default App;
