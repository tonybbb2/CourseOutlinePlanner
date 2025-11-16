import io
import json
import os
import uuid
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Dict

from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Request,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from openai import OpenAI

# ============== GOOGLE CALENDAR IMPORTS ==============
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# =========================
# ENV & OPENAI CLIENT
# =========================

# Load API key from apikey.env (same folder as backend.py)
load_dotenv("apikey.env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set")

client = OpenAI(api_key=OPENAI_API_KEY)

# ============== GOOGLE CALENDAR CONFIG =================
SCOPES = ["https://www.googleapis.com/auth/calendar"]

# If CAL_CLIENT_JSON is not set, default to ./credentials.json
CAL_CLIENT_JSON = os.getenv("CAL_CLIENT_JSON") or os.path.join(
    os.getcwd(), "credentials.json"
)

CAL_TIMEZONE = os.getenv("CAL_TIMEZONE", "America/Toronto")
# We will write to each user's "primary" calendar
CALENDAR_ID = os.getenv("CALENDAR_ID", "primary")
CAL_TOKEN_JSON = os.getenv("CAL_TOKEN_JSON", os.path.join(os.getcwd(), "gcal_token.json"))

# Frontend origin & OAuth redirect URI
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
OAUTH_REDIRECT_URI = os.getenv(
    "OAUTH_REDIRECT_URI",
    "http://localhost:8000/api/auth/google/callback",
)

# In-memory session storage (for demo / dev)
# In a real app, replace this with DB storage keyed by your auth system
SESSION_CREDS: Dict[str, str] = {}  # session_id -> creds.to_json()
SESSION_EMAIL: Dict[str, str] = {}  # session_id -> user email

# Single-user dev storage (what we're actually using now)
GLOBAL_CREDS_JSON: Optional[str] = None
GLOBAL_EMAIL: Optional[str] = None

GLOBAL_CALENDAR_ID: Optional[str] = None
CAL_TOKEN_JSON = os.getenv("CAL_TOKEN_JSON", os.path.join(os.getcwd(), "gcal_token.json"))
# Try to load previous token (if it exists)
if os.path.exists(CAL_TOKEN_JSON):
    try:
        with open(CAL_TOKEN_JSON, "r", encoding="utf-8") as f:
            GLOBAL_CREDS_JSON = f.read()
    except Exception:
        pass

def _get_google_creds_for_session(session_id: str) -> Credentials:
    """
    Get Google Credentials object for the given session.
    Refreshes and updates in-memory JSON if needed.
    """
    if not session_id:
        raise HTTPException(status_code=401, detail="Not logged in to Google")

    creds_json = SESSION_CREDS.get(session_id)
    if not creds_json:
        raise HTTPException(
            status_code=401, detail="No Google credentials for this session"
        )

    info = json.loads(creds_json)
    creds = Credentials.from_authorized_user_info(info, SCOPES)

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            SESSION_CREDS[session_id] = creds.to_json()
        else:
            raise HTTPException(status_code=401, detail="Google credentials expired")

    return creds


def _get_calendar_service_for_session(session_id: str):
    creds = _get_google_creds_for_session(session_id)
    return build("calendar", "v3", credentials=creds)


def _event_to_google_body(
    ev: "Event",
    *,
    app_event_id: Optional[str] = None,
    start_override: Optional[datetime] = None,
    end_override: Optional[datetime] = None,
) -> dict:
    """
    Map your Event model → Google Calendar event payload.

    app_event_id: lets us distinguish repeated weekly events (e.g., ev.id + "_wk3")
    start_override/end_override: lets us move the event to another week while
    keeping duration the same.
    """

    # Base start/end
    start_dt = start_override or ev.start
    if end_override is not None:
        end_dt = end_override
    elif ev.end is not None:
        end_dt = ev.end
    else:
        # default duration = 1 hour
        end_dt = start_dt + timedelta(hours=1)

    # Duration for recurring events if needed elsewhere
    body: Dict[str, object] = {
        "summary": ev.title,
        "location": ev.location or None,
        "description": f"{ev.type.upper()} (Course ID: {ev.course_id})",
        "start": {"dateTime": start_dt.isoformat(), "timeZone": CAL_TIMEZONE},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": CAL_TIMEZONE},
        "extendedProperties": {
            "private": {
                "source": "course-outline",
                "course_id": ev.course_id,
                # use override if provided, otherwise event id
                "app_event_id": app_event_id or ev.id,
            }
        },
        "colorId": "6" if ev.type in {"midterm", "final", "test", "quiz"} else None,
    }

    # Strip None values
    return {k: v for k, v in body.items() if v is not None}


def _find_existing_event_by_app_id(service, calendar_id: str, app_event_id: str):
    """
    Look up events with our private extended property to avoid duplicates.
    """
    try:
        res = (
            service.events()
            .list(
                calendarId=calendar_id,
                privateExtendedProperty=f"app_event_id={app_event_id}",
                maxResults=2,
                singleEvents=True,
            )
            .execute()
        )
        items = res.get("items", [])
        return items[0] if items else None
    except HttpError:
        return None


# =========================
# FASTAPI APP + CORS
# =========================

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app = FastAPI(title="Course Calendar Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DATA MODELS
# =========================


class Event(BaseModel):
    id: str
    course_id: str
    title: str
    type: str = Field(
        description=(
            "lecture, lab, tutorial, midterm, final, "
            "assignment_due, holiday, study_block, other"
        )
    )
    start: datetime
    end: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    source_page: Optional[int] = None


class Course(BaseModel):
    id: str
    name: Optional[str] = None
    code: Optional[str] = None
    term: Optional[str] = None
    raw_outline_file_id: Optional[str] = None
    events: List[Event] = Field(default_factory=list)


class AuthStatus(BaseModel):
    connected: bool
    email: Optional[str] = None


COURSES: Dict[str, Course] = {}
EVENTS: Dict[str, Event] = {}

# =========================
# PROMPTS
# =========================

SYSTEM_PROMPT = """
You read university course outline PDFs and extract ONLY the information needed
for a student calendar app.

Return ONLY a single valid JSON object with this schema:

{
  "course_name": string or null,
  "course_code": string or null,
  "term": string or null,
  "events": [
    {
      "title": string,
      "type": "class" | "lab" | "tutorial" | "midterm" | "final" | "quiz" | "test",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM" or null,
      "end_time": "HH:MM" or null,
      "location": string or null
    }
  ]
}

Interpretation rules:
- Focus ONLY on events students want in a personal calendar (weekly classes/labs/tutorials; assessments).
- Do NOT include administrative deadlines or generic holidays unless tied to an exam/quiz.
- Weekly patterns: create ONE representative event (first applicable date), not every week.
- Assessments: include explicit date/time; use null if time is missing; location null if TBA.
- Never invent dates/times/rooms. Omit events if details aren’t explicit.
- If name/code/term aren’t clear, set them to null.

Formatting: return only the JSON object; no notes/markdown.
"""

USER_PROMPT = """
Read this course outline and extract ONLY:

- course_name, course_code, term
- weekly class / lab / tutorial time slots as pattern objects (class_patterns)
- midterms, finals, quizzes, and tests as one-off assessment events (assessments)

Use the JSON schema described in the instructions.
Do not include administrative deadlines or generic holidays.
Return ONLY the JSON object.
"""

# =========================
# UTIL: CALL OPENAI ON PDF
# =========================


def extract_course_data_from_pdf(pdf_bytes: bytes) -> Course:
    # 1) Upload PDF for use by the model
    pdf_file = client.files.create(
        file=("outline.pdf", pdf_bytes),
        purpose="assistants",
    )

    # 2) Call Responses API with PDF as input_file + instructions
    response = client.responses.create(
        model="gpt-5.1",
        instructions=SYSTEM_PROMPT,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_file", "file_id": pdf_file.id},
                    {"type": "input_text", "text": USER_PROMPT},
                ],
            }
        ],
        max_output_tokens=4000,
    )

    raw_text = response.output_text
    if not raw_text:
        raise RuntimeError("No text output from OpenAI response.")

    text = raw_text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        text = text.lstrip("json").strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Failed to parse JSON from model: {e}\nRaw: {text[:500]}")

    # 3) Convert JSON → Course + Events
    course_id = str(uuid.uuid4())
    course = Course(
        id=course_id,
        name=data.get("course_name"),
        code=data.get("course_code"),
        term=data.get("term"),
        raw_outline_file_id=pdf_file.id,
    )

    for ev in (data.get("events") or []):
        date_str = ev.get("date")
        if not date_str:
            continue

        start_time = ev.get("start_time")
        end_time = ev.get("end_time")

        if start_time:
            start_dt = datetime.fromisoformat(f"{date_str}T{start_time}:00")
        else:
            start_dt = datetime.fromisoformat(f"{date_str}T00:00:00")

        end_dt = (
            datetime.fromisoformat(f"{date_str}T{end_time}:00") if end_time else None
        )

        e = Event(
            id=str(uuid.uuid4()),
            course_id=course_id,
            title=ev.get("title", "Untitled"),
            type=ev.get("type", "other"),
            start=start_dt,
            end=end_dt,
            location=ev.get("location"),
            notes=None,
            source_page=ev.get("source_page"),
        )

        course.events.append(e)
        EVENTS[e.id] = e

    COURSES[course.id] = course
    return course


# =========================
# AUTH ROUTES
# =========================

STATE_TO_SESSION: Dict[str, str] = {}

@app.get("/api/auth/google/url")
def get_google_auth_url():
    """
    Start Google OAuth flow.

    - Generate a session_id
    - Generate an OAuth 'state' value
    - Remember mapping state -> session_id in memory
    - Return the Google auth URL (Flow builds it with the state for us)

    We DO NOT rely on cookies here; the cookie will be set in the callback.
    """
    if not os.path.exists(CAL_CLIENT_JSON):
        raise HTTPException(
            status_code=500, detail=f"credentials.json not found at: {CAL_CLIENT_JSON}"
        )

    # We'll associate this with the OAuth 'state'
    session_id = secrets.token_urlsafe(32)

    flow = Flow.from_client_secrets_file(
        CAL_CLIENT_JSON,
        scopes=SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
    )

    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    # Remember which session_id is tied to this state
    STATE_TO_SESSION[state] = session_id

    return {"url": auth_url}

@app.post("/api/auth/logout")
def google_logout():
    """
    Clear the stored Google credentials and calendar id (single-user dev logout).
    This will make /api/auth/status return connected: false.
    """
    global GLOBAL_CREDS_JSON, GLOBAL_EMAIL, GLOBAL_CALENDAR_ID

    GLOBAL_CREDS_JSON = None
    GLOBAL_EMAIL = None
    GLOBAL_CALENDAR_ID = None

    # Remove token file so we don't auto-login on next backend restart
    try:
        if os.path.exists(CAL_TOKEN_JSON):
            os.remove(CAL_TOKEN_JSON)
    except Exception as e:
        print("Failed to remove token file:", e)

    return {"ok": True}


@app.get("/api/auth/google/callback")
def google_auth_callback(code: str, state: str):
    if not os.path.exists(CAL_CLIENT_JSON):
        raise HTTPException(
            status_code=500,
            detail=f"credentials.json not found at: {CAL_CLIENT_JSON}",
        )

    global GLOBAL_CREDS_JSON, GLOBAL_EMAIL, GLOBAL_CALENDAR_ID

    # Build OAuth flow
    flow = Flow.from_client_secrets_file(
        CAL_CLIENT_JSON,
        scopes=SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
    )

    # Exchange authorization code for tokens
    flow.fetch_token(code=code)
    creds = flow.credentials

    # Save credentials in memory
    GLOBAL_CREDS_JSON = creds.to_json()

    # Persist token to disk so we stay logged in after backend restart
    try:
        service = build("calendar", "v3", credentials=creds)
        primary_cal = service.calendarList().get(calendarId="primary").execute()
        cal_id = primary_cal.get("id")
        if cal_id:
            GLOBAL_EMAIL = cal_id  # used by frontend embed
            GLOBAL_CALENDAR_ID = cal_id  # used when inserting events
    except Exception:
        GLOBAL_EMAIL = None
        GLOBAL_CALENDAR_ID = None

    return RedirectResponse(url=f"{FRONTEND_ORIGIN}?connected=1")
@app.get("/api/auth/status", response_model=AuthStatus)
def auth_status():
    if not GLOBAL_CREDS_JSON:
        return AuthStatus(connected=False)

    return AuthStatus(connected=True, email=GLOBAL_EMAIL)

# =========================
# API ROUTES
# =========================


@app.post("/api/upload-syllabus", response_model=Course)
async def upload_syllabus(file: UploadFile = File(...)):
    if file.content_type not in ["application/pdf"]:
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    pdf_bytes = await file.read()

    try:
        course = extract_course_data_from_pdf(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return course


@app.get("/api/courses", response_model=List[Course])
async def list_courses():
    return list(COURSES.values())


@app.get("/api/courses/{course_id}", response_model=Course)
async def get_course(course_id: str):
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@app.get("/api/courses/{course_id}/events", response_model=List[Event])
async def get_course_events(course_id: str):
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course.events


@app.get("/api/events", response_model=List[Event])
async def list_all_events():
    return list(EVENTS.values())


# ============== SYNC A COURSE INTO GOOGLE CALENDAR ==============


@app.post("/api/courses/{course_id}/sync-google")
async def sync_course_to_google(course_id: str):
    """
    Sync a course's events into the user's Google Calendar.

    - Events whose type contains "class", "tutorial", or "lab" are expanded
      into weekly occurrences up to the end of the term.
    - Other events (midterms, finals, exams, etc.) are treated as one-off.
    """
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Decide which calendar we write to: prefer the one discovered via OAuth,
    # fallback to CALENDAR_ID ("primary") from env.
    target_calendar_id = GLOBAL_CALENDAR_ID or CALENDAR_ID

    # Figure out an "end of term" date for recurring events.
    upper_date: Optional[datetime] = None

    # 1) Prefer latest final/exam
    for ev in course.events:
        ev_type = ev.type.lower()
        if "final" in ev_type or "exam" in ev_type:
            if upper_date is None or ev.start > upper_date:
                upper_date = ev.start

    # 2) If none, use latest event date
    if upper_date is None and course.events:
        upper_date = max(ev.start for ev in course.events)

    # 3) Still none? Fallback: 16 weeks after earliest event
    if upper_date is None and course.events:
        earliest = min(ev.start for ev in course.events)
        upper_date = earliest + timedelta(weeks=16)

    try:
        service = _get_calendar_service()  # uses GLOBAL_CREDS_JSON
    except HTTPException:
        raise HTTPException(
            status_code=401,
            detail="Not connected to Google. Please connect your Google Calendar first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google auth failed: {e}")

    results = []

    # Helper: yield weekly occurrences of an event up to upper_date.
    def weekly_occurrences(ev: Event):
        current = ev.start
        while upper_date is not None and current <= upper_date:
            yield current
            current = current + timedelta(weeks=1)

    for ev in course.events:
        ev_type = ev.type.lower()

        # Treat classes/tutorials/labs as weekly recurring
        if ("class" in ev_type) or ("tutorial" in ev_type) or ("lab" in ev_type):
            base_duration = (
                (ev.end - ev.start) if ev.end is not None else timedelta(hours=1)
            )

            for idx, occ_start in enumerate(weekly_occurrences(ev)):
                occ_end = occ_start + base_duration
                app_event_id = f"{ev.id}_wk{idx}"  # unique id per week

                body = _event_to_google_body(
                    ev,
                    app_event_id=app_event_id,
                    start_override=occ_start,
                    end_override=occ_end,
                )

                try:
                    existing = _find_existing_event_by_app_id(
                        service, target_calendar_id, app_event_id
                    )
                    if existing:
                        updated = (
                            service.events()
                            .update(
                                calendarId=target_calendar_id,
                                eventId=existing["id"],
                                body=body,
                            )
                            .execute()
                        )
                        results.append(
                            {
                                "event_id": app_event_id,
                                "status": "updated",
                                "gcal_id": updated.get("id"),
                            }
                        )
                    else:
                        created = (
                            service.events()
                            .insert(calendarId=target_calendar_id, body=body)
                            .execute()
                        )
                        results.append(
                            {
                                "event_id": app_event_id,
                                "status": "created",
                                "gcal_id": created.get("id"),
                            }
                        )
                except HttpError as he:
                    results.append(
                        {
                            "event_id": app_event_id,
                            "status": "error",
                            "error": str(he),
                        }
                    )

        else:
            # One-off events (midterms, finals, exams, etc.)
            body = _event_to_google_body(ev)
            try:
                existing = _find_existing_event_by_app_id(
                    service, target_calendar_id, ev.id
                )
                if existing:
                    updated = (
                        service.events()
                        .update(
                            calendarId=target_calendar_id,
                            eventId=existing["id"],
                            body=body,
                        )
                        .execute()
                    )
                    results.append(
                        {
                            "event_id": ev.id,
                            "status": "updated",
                            "gcal_id": updated.get("id"),
                        }
                    )
                else:
                    created = (
                        service.events()
                        .insert(calendarId=target_calendar_id, body=body)
                        .execute()
                    )
                    results.append(
                        {
                            "event_id": ev.id,
                            "status": "created",
                            "gcal_id": created.get("id"),
                        }
                    )
            except HttpError as he:
                results.append(
                    {"event_id": ev.id, "status": "error", "error": str(he)}
                )

    return {"course_id": course_id, "synced": results}

def _get_google_creds_single_user() -> Credentials:
    """
    Return Credentials for the single logged-in user (dev mode).

    Uses GLOBAL_CREDS_JSON, refreshes if needed, and updates the stored JSON.
    """
    global GLOBAL_CREDS_JSON  # declare global at the top

    if not GLOBAL_CREDS_JSON:
        # Not connected yet
        raise HTTPException(status_code=401, detail="Not connected to Google")

    info = json.loads(GLOBAL_CREDS_JSON)
    creds = Credentials.from_authorized_user_info(info, SCOPES)

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            # Refresh and update global storage
            creds.refresh(GoogleRequest())
            GLOBAL_CREDS_JSON = creds.to_json()
        else:
            raise HTTPException(status_code=401, detail="Google credentials expired")

    return creds


def _get_calendar_service():
    """
    Build a Google Calendar service for the single logged-in user.
    """
    creds = _get_google_creds_single_user()
    return build("calendar", "v3", credentials=creds)

