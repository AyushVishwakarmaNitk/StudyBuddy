/**
 * Central API Client for StudyBuddy
 * Handles base URL configuration, headers, JWT tokens, and automated authentication error handling.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const TOKEN_KEY_ACCESS = "sb_access_token";
const TOKEN_KEY_REFRESH = "sb_refresh_token";

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY_ACCESS);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY_REFRESH);
};

export const setTokens = (tokens: { access: string; refresh?: string }) => {
  if (tokens.access) {
    localStorage.setItem(TOKEN_KEY_ACCESS, tokens.access);
  }
  if (tokens.refresh) {
    localStorage.setItem(TOKEN_KEY_REFRESH, tokens.refresh);
  }
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY_ACCESS);
  localStorage.removeItem(TOKEN_KEY_REFRESH);
};

export interface ApiErrorResponse {
  error?: string;
  details?: Record<string, string[] | string>;
  message?: string;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = getAccessToken();

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new Error(
      "Unable to reach the StudyBuddy server. Please make sure the backend is running."
    );
  }

  // Handle Token Expiration (401 Unauthorized) with Refresh Attempt
  if (response.status === 401 && getRefreshToken() && !endpoint.includes("/auth/")) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${getAccessToken()}`);
      response = await fetch(url, {
        ...options,
        headers,
      });
    } else {
      clearTokens();
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      (data?.details && Object.values(data.details).flat().join(" ")) ||
      (typeof data === "string" ? data : `Request failed with status ${response.status}`);
    
    const error = new Error(errorMsg);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access) {
        setTokens({ access: data.access });
        return true;
      }
    }
  } catch (e) {
    // Refresh failed
  }

  clearTokens();
  return false;
}

