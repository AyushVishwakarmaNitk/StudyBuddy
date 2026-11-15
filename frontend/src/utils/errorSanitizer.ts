/**
 * Sanitizes raw backend/API errors into clear, friendly, human-readable messages.
 * Prevents raw database traces, Python dictionary strings, or technical jargon
 * from reaching the student.
 */

export function sanitizeErrorMessage(
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again."
): string {
  if (!error) return fallbackMessage;

  // If already a simple string
  if (typeof error === "string") {
    return cleanRawText(error, fallbackMessage);
  }

  // Handle standard JS Error object
  if (error instanceof Error) {
    return cleanRawText(error.message, fallbackMessage);
  }

  // Handle Axios / Fetch response object or DRF json error
  if (typeof error === "object") {
    const errObj = error as Record<string, any>;

    // Common DRF error fields
    if (errObj.detail && typeof errObj.detail === "string") {
      return cleanRawText(errObj.detail, fallbackMessage);
    }
    if (errObj.message && typeof errObj.message === "string") {
      return cleanRawText(errObj.message, fallbackMessage);
    }
    if (errObj.error && typeof errObj.error === "string") {
      return cleanRawText(errObj.error, fallbackMessage);
    }

    // Non field errors array
    if (Array.isArray(errObj.non_field_errors) && errObj.non_field_errors.length > 0) {
      return cleanRawText(String(errObj.non_field_errors[0]), fallbackMessage);
    }

    // Field-level validation errors (e.g. { "email": ["Enter a valid email address."] })
    for (const key of Object.keys(errObj)) {
      const val = errObj[key];
      if (Array.isArray(val) && val.length > 0) {
        const fieldName = formatFieldName(key);
        return `${fieldName}: ${cleanRawText(String(val[0]), "Invalid value")}`;
      }
      if (typeof val === "string") {
        const fieldName = formatFieldName(key);
        return `${fieldName}: ${cleanRawText(val, "Invalid value")}`;
      }
    }
  }

  return fallbackMessage;
}

function formatFieldName(fieldName: string): string {
  if (fieldName === "email") return "Email";
  if (fieldName === "username") return "Username";
  if (fieldName === "password") return "Password";
  if (fieldName === "title") return "Title";
  if (fieldName === "subject") return "Subject";
  if (fieldName === "institution_name") return "Institution";
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanRawText(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;

  // Intercept typical technical messages
  const lower = trimmed.toLowerCase();

  if (lower.includes("network error") || lower.includes("failed to fetch") || lower.includes("connection refused")) {
    return "Unable to reach the StudyBuddy server. Please check your internet connection.";
  }

  if (lower.includes("given token not valid") || lower.includes("token is invalid") || lower.includes("token is expired")) {
    return "Your session has expired. Please sign in again.";
  }

  if (lower.includes("invalid credentials") || lower.includes("no active account found")) {
    return "Incorrect username/email or password. Please try again.";
  }

  if (lower.includes("unique") && lower.includes("username")) {
    return "This username is already taken. Please choose another.";
  }

  if (lower.includes("unique") && lower.includes("email")) {
    return "An account with this email already exists.";
  }

  if (lower.includes("google id token is required") || lower.includes("google verification")) {
    return "Google Sign-In could not be verified. Please try again or check your account.";
  }

  if (lower.includes("syntaxerror") || lower.includes("server error (500)") || lower.includes("internal server error")) {
    return "Our server encountered a temporary hiccup. Please try again in a few moments.";
  }

  // Remove trailing technical codes or brackets if any
  return trimmed.replace(/^\{.*\}$/, "").replace(/^\[.*\]$/, "").trim() || fallback;
}
