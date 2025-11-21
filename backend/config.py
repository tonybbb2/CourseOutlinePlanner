import os
import json
from typing import Optional, Dict

from dotenv import load_dotenv
from openai import OpenAI
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest

# Project root = one level above this file's directory
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# Look for apikey.env at project root
env_path = os.path.join(BASE_DIR, "apikey.env")
load_dotenv(env_path)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Create client lazily / safely
client: Optional[OpenAI]
if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
else:
    client = None  # we'll error later if someone actually needs it

# =========================
# GOOGLE CALENDAR CONFIG
# =========================

SCOPES = ["https://www.googleapis.com/auth/calendar"]

CAL_CLIENT_JSON = os.getenv("CAL_CLIENT_JSON") or os.path.join(
    os.path.dirname(__file__), "credentials.json"
)

CAL_TIMEZONE = os.getenv("CAL_TIMEZONE", "America/Toronto")
CALENDAR_ID = os.getenv("CALENDAR_ID", "primary")

CAL_TOKEN_JSON = os.getenv(
    "CAL_TOKEN_JSON",
    os.path.join(os.path.dirname(__file__), "token.json")
)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
OAUTH_REDIRECT_URI = os.getenv(
    "OAUTH_REDIRECT_URI",
    "http://localhost:8000/api/auth/google/callback",
)

# =========================
# SINGLE-USER DEV GLOBALS
# =========================

GLOBAL_CREDS_JSON: Optional[str] = None  # serialized credentials
GLOBAL_EMAIL: Optional[str] = None       # calendar email (primary id)
GLOBAL_CALENDAR_ID: Optional[str] = None # calendar id actually used

# Try to load a persisted token, if it exists
if os.path.exists(CAL_TOKEN_JSON):
    try:
        with open(CAL_TOKEN_JSON, "r", encoding="utf-8") as f:
            GLOBAL_CREDS_JSON = f.read()
    except Exception:
        GLOBAL_CREDS_JSON = None


def get_google_creds_single_user() -> Credentials:
    """
    Return Credentials for the single logged-in user (dev mode).
    Uses GLOBAL_CREDS_JSON, refreshes if needed, and updates the stored JSON.
    """
    global GLOBAL_CREDS_JSON

    if not GLOBAL_CREDS_JSON:
        raise RuntimeError("Not connected to Google")

    info = json.loads(GLOBAL_CREDS_JSON)
    creds = Credentials.from_authorized_user_info(info, SCOPES)

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            GLOBAL_CREDS_JSON = creds.to_json()
        else:
            raise RuntimeError("Google credentials expired")

    return creds
