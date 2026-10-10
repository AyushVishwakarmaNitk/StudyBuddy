import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import SignUpLoginPage from "./pages/SignUpLoginPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [currentView, setCurrentView] = useState<"landing" | "auth" | "dashboard">("landing");
  const [authIsSignUp, setAuthIsSignUp] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ username: string }>({ username: "student" });

  const handleNavigateToAuth = (isSignUp: boolean = false) => {
    setAuthIsSignUp(isSignUp);
    setCurrentView("auth");
  };

  const handleBackToLanding = () => {
    setCurrentView("landing");
  };

  const handleLoginSuccess = (userData: { username: string }) => {
    setCurrentUser(userData);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    setCurrentView("landing");
  };

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