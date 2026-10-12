import { useEffect, useState } from "react";
import LandingPage from "./pages/LandingPage";
import SignUpLoginPage from "./pages/SignUpLoginPage";
import DashboardPage from "./pages/DashboardPage";
import PartnerQuestionnaire from "./components/dashboard/PartnerQuestionnaire";

type View = "landing" | "auth" | "dashboard" | "questionnaire";

const getView = (): View => {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/auth") return "auth";
  if (path === "/dashboard") return "dashboard";
  if (path === "/questionnaire") return "questionnaire";
  return "landing";
};

function App() {
  const [currentView, setCurrentView] = useState<View>(getView);
  const [authIsSignUp, setAuthIsSignUp] = useState<boolean>(() => new URLSearchParams(window.location.search).get("mode") === "signup");
  const [currentUser, setCurrentUser] = useState<{ username: string }>(() => {
    try { return JSON.parse(localStorage.getItem("studybuddy-user") ?? '{"username":"student"}'); }
    catch { return { username: "student" }; }
  });

  const navigate = (path: string, replace = false) => {
    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    setCurrentView(getView());
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getView());
      setAuthIsSignUp(new URLSearchParams(window.location.search).get("mode") === "signup");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigateToAuth = (isSignUp: boolean = false) => {
    setAuthIsSignUp(isSignUp);
    navigate(isSignUp ? "/auth?mode=signup" : "/auth");
  };

  const handleBackToLanding = () => {
    navigate("/");
  };

  const handleLoginSuccess = (userData: { username: string }) => {
    setCurrentUser(userData);
    localStorage.setItem("studybuddy-user", JSON.stringify(userData));
    navigate("/dashboard", true);
  };

  const handleLogout = () => {
    localStorage.removeItem("studybuddy-user");
    navigate("/");
  };

  if (currentView === "dashboard") {
    return <DashboardPage user={currentUser} onLogout={handleLogout} navigate={navigate} />;
  }

  if (currentView === "questionnaire") {
    const params = new URLSearchParams(window.location.search);
    return <PartnerQuestionnaire
      spaceId={params.get("space") ?? "general"}
      spaceTitle={params.get("title") ?? undefined}
      onBack={() => {
        const draft = sessionStorage.getItem(`studybuddy-questionnaire:${params.get("space") ?? "general"}`);
        if (draft && !window.confirm("Your questionnaire is unfinished. Your answers are saved on this device, but leaving now may interrupt your progress. Leave this page?")) return;
        navigate("/dashboard", true);
      }}
      onComplete={(answers) => {
        localStorage.setItem("studybuddy-partner-preferences", JSON.stringify(answers));
        sessionStorage.removeItem(`studybuddy-questionnaire:${params.get("space") ?? "general"}`);
        navigate(`/dashboard?matches=${encodeURIComponent(params.get("space") ?? "")}`);
      }}
    />;
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
