import { apiFetch, setTokens, clearTokens, getRefreshToken } from "./client";
import type { EducationRecord } from "../types/dashboard";

export interface StudentProfileData {
  id: number;
  branch: string;
  year: number;
  bio: string;
  avatar_url: string;
  is_profile_completed?: boolean;
  subjects?: string;
  availability?: string;
  session_duration?: string;
  collaboration_style?: string;
  average_rating?: number;
  rating_count?: number;
  rating?: {
    average: number;
    count: number;
  } | null;
  study_preferences?: {
    subjects: string[];
    availability: string;
    sessionDuration: string;
    collaborationStyle: string;
  };
  completion_status?: {
    is_complete: boolean;
    percentage: number;
    missing_fields: string[];
  };
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_profile_completed: boolean;
  profile?: StudentProfileData;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  tokens: {
    access: string;
    refresh: string;
  };
  requires_profile_completion?: boolean;
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

export interface ProfileOnboardingPayload {
  name?: string;
  branch: string;
  year: number;
  bio: string;
  avatar_url?: string | null;
  availability?: string;
  collaboration_style?: string;
  session_duration?: string;
  subjects?: string[];
  education?: Partial<EducationRecord>;
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
   * Submit and complete initial profile onboarding
   */
  async completeProfile(payload: ProfileOnboardingPayload): Promise<{ message: string; user: AuthUser }> {
    return apiFetch<{ message: string; user: AuthUser }>("/auth/profile/complete/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update student profile fields
   */
  async updateProfile(payload: Record<string, any>): Promise<{ message: string; user: AuthUser }> {
    return apiFetch<{ message: string; user: AuthUser }>("/auth/profile/update/", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Check and extend current session inactivity timeout
   */
  async extendSession(): Promise<{ success: boolean; message: string; timeout_seconds?: number }> {
    return apiFetch<{ success: boolean; message: string; timeout_seconds?: number }>("/auth/session/extend/", {
      method: "POST",
    });
  },

  /**
   * Clear local session and invalidate tokens on backend
   */
  async logout(): Promise<void> {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await apiFetch<{ message: string }>("/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh }),
        });
      }
    } catch {
      // Ignore network errors on logout to ensure local tokens always get cleared
    } finally {
      clearTokens();
    }
  },
};
