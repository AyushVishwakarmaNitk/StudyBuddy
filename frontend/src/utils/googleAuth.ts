/**
 * Google Identity Services (GIS) Client Utility.
 * Dynamically loads and interfaces with the Google Sign-In SDK.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (notification: any) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number | string;
              locale?: string;
            }
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

/**
 * Load Google Identity Services script if not already present.
 */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.google?.accounts?.id) return resolve();

    const existingScript = document.getElementById("google-gsi-script");
    if (existingScript) {
      if (window.google?.accounts?.id) {
        return resolve();
      }
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Read the Google OAuth Client ID configured via Vite environment variable.
 */
export function getGoogleClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  return clientId.trim();
}

