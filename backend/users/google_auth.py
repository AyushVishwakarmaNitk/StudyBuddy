"""
Google OAuth 2.0 ID Token Verification Service for StudyBuddy.

Validates Google ID tokens securely using Google's verification endpoint:
https://oauth2.googleapis.com/tokeninfo?id_token=<token>

Never trusts user identity or claims provided directly by the frontend.
"""

import json
import logging
import urllib.parse
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
VALID_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def verify_google_id_token(id_token: str, expected_client_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate a Google ID token securely against Google's authorization servers.

    Args:
        id_token: The JWT credential string issued by Google.
        expected_client_id: Expected OAuth 2.0 Client ID (aud claim).
                           Defaults to settings.GOOGLE_CLIENT_ID.

    Returns:
        Dict with verified user identity:
        {
            'email': str,
            'sub': str,
            'name': str,
            'given_name': str,
            'family_name': str,
            'picture': str,
        }

    Raises:
        ValueError: If token is missing, expired, malformed, unverified, or audience mismatch.
    """
    if not id_token or not isinstance(id_token, str) or not id_token.strip():
        raise ValueError("Google ID token is required.")

    token = id_token.strip()

    # Query Google's tokeninfo endpoint
    req_url = f"{GOOGLE_TOKENINFO_URL}?id_token={urllib.parse.quote(token)}"
    req = urllib.request.Request(
        req_url,
        headers={"User-Agent": "StudyBuddy-Backend/1.0"},
        method="GET"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status != 200:
                raise ValueError("Google verification server returned an invalid status.")
            raw_body = response.read().decode("utf-8")
            payload = json.loads(raw_body)
    except urllib.error.HTTPError as exc:
        try:
            err_body = exc.read().decode("utf-8")
            err_json = json.loads(err_body)
            err_desc = err_json.get("error_description") or err_json.get("error") or str(exc)
        except Exception:
            err_desc = str(exc)
        logger.warning(f"Google ID token verification failed with HTTPError: {err_desc}")
        raise ValueError(f"Invalid or expired Google token: {err_desc}") from exc
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as exc:
        logger.error(f"Failed to communicate with Google tokeninfo endpoint: {exc}")
        raise ValueError("Unable to reach Google verification service. Please try again later.") from exc

    # 1. Verify issuer
    issuer = payload.get("iss")
    if issuer not in VALID_ISSUERS:
        raise ValueError(f"Invalid Google token issuer: {issuer}")

    # 2. Verify audience (OAuth Client ID) if configured
    target_client_id = expected_client_id if expected_client_id is not None else getattr(settings, "GOOGLE_CLIENT_ID", "")
    target_client_id = target_client_id.strip() if target_client_id else ""

    if target_client_id:
        token_aud = payload.get("aud")
        if token_aud != target_client_id:
            logger.warning(f"Google token audience mismatch: expected '{target_client_id}', got '{token_aud}'")
            raise ValueError("Google token audience mismatch. The token was issued for a different client.")

    # 3. Verify email claim
    email = payload.get("email", "").strip().lower()
    if not email:
        raise ValueError("Google token does not contain an email address.")

    # 4. Verify email is verified by Google
    email_verified = payload.get("email_verified")
    if isinstance(email_verified, str):
        is_verified = email_verified.lower() == "true"
    else:
        is_verified = bool(email_verified)

    if not is_verified:
        raise ValueError("Google account email address is not verified.")

    # Extract verified profile information
    name = payload.get("name", "").strip()
    given_name = payload.get("given_name", "").strip()
    family_name = payload.get("family_name", "").strip()
    picture = payload.get("picture", "").strip()
    google_sub = payload.get("sub", "").strip()

    # Fall back for first/last name if given_name/family_name are absent
    if not given_name and name:
        parts = name.split(" ", 1)
        given_name = parts[0]
        if len(parts) > 1 and not family_name:
            family_name = parts[1]

    return {
        "email": email,
        "sub": google_sub,
        "name": name,
        "given_name": given_name,
        "family_name": family_name,
        "picture": picture,
    }

