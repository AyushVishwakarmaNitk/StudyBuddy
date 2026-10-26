import { apiFetch, setTokens, clearTokens } from "./client";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile?: {
    id: number;
    branch: string;
    year: number;
    bio: string;
    avatar_url: string;
  };
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface LoginPayload {
  username: string; // Accepts username or email
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password2: string;
}

export const authApi = {
  /**
   * Log in user and securely persist JWT tokens
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (data.tokens) {
      setTokens(data.tokens);
    }

    return data;
  },

  /**
   * Register a new student account and persist JWT tokens
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (data.tokens) {
      setTokens(data.tokens);
    }

    return data;
  },

  /**
   * Fetch currently authenticated student profile using JWT Bearer token
   */
  async getCurrentUser(): Promise<{ user: AuthUser }> {
    return apiFetch<{ user: AuthUser }>("/auth/me/", {
      method: "GET",
    });
  },

  /**
   * Clear local session and tokens
   */
  logout() {
    clearTokens();
  },
};

