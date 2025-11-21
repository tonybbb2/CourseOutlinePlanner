import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from ..config import (
    CAL_CLIENT_JSON,
    SCOPES,
    OAUTH_REDIRECT_URI,
    FRONTEND_ORIGIN,
    CAL_TOKEN_JSON,
    GLOBAL_CREDS_JSON,
    GLOBAL_EMAIL,
    GLOBAL_CALENDAR_ID,
)
from ..models import AuthStatus

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/google/url")
def get_google_auth_url():
    if not os.path.exists(CAL_CLIENT_JSON):
        raise HTTPException(
            status_code=500,
            detail=f"credentials.json not found at: {CAL_CLIENT_JSON}",
        )

    flow = Flow.from_client_secrets_file(
        CAL_CLIENT_JSON,
        scopes=SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    return {"url": auth_url}


@router.get("/google/callback")
def google_auth_callback(code: str):
    if not os.path.exists(CAL_CLIENT_JSON):
        raise HTTPException(
            status_code=500,
            detail=f"credentials.json not found at: {CAL_CLIENT_JSON}",
        )

    global GLOBAL_CREDS_JSON, GLOBAL_EMAIL, GLOBAL_CALENDAR_ID

    flow = Flow.from_client_secrets_file(
        CAL_CLIENT_JSON,
        scopes=SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
    )
    flow.fetch_token(code=code)
    creds = flow.credentials

    GLOBAL_CREDS_JSON = creds.to_json()

    # Persist token to disk
    try:
        with open(CAL_TOKEN_JSON, "w", encoding="utf-8") as f:
            f.write(GLOBAL_CREDS_JSON)
    except Exception:
        pass

    try:
        service = build("calendar", "v3", credentials=creds)
        primary_cal = service.calendarList().get(calendarId="primary").execute()
        cal_id = primary_cal.get("id")
        if cal_id:
            GLOBAL_EMAIL = cal_id
            GLOBAL_CALENDAR_ID = cal_id
    except Exception:
        GLOBAL_EMAIL = None
        GLOBAL_CALENDAR_ID = None

    return RedirectResponse(url=f"{FRONTEND_ORIGIN}?connected=1")


@router.get("/status", response_model=AuthStatus)
def auth_status():
    if not GLOBAL_CREDS_JSON:
        return AuthStatus(connected=False)
    return AuthStatus(connected=True, email=GLOBAL_EMAIL)


@router.post("/logout")
def google_logout():
    global GLOBAL_CREDS_JSON, GLOBAL_EMAIL, GLOBAL_CALENDAR_ID

    GLOBAL_CREDS_JSON = None
    GLOBAL_EMAIL = None
    GLOBAL_CALENDAR_ID = None

    try:
        if os.path.exists(CAL_TOKEN_JSON):
            os.remove(CAL_TOKEN_JSON)
    except Exception:
        pass

    return {"ok": True}
