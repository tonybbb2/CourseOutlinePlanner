import io
import json
import os
import uuid
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

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

class ChatMessageIn(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class CalendarChatRequest(BaseModel):
    messages: List[ChatMessageIn]



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

CAL_CHAT_SYSTEM_PROMPT = """
You are Calendar Assistant, an AI agent integrated into a university student’s
Google Calendar. You can list, search, create, update, and delete events in the
user’s calendar by calling the provided functions.

Your job:
- Understand natural language requests about course schedules, study blocks,
  reminders, exam periods, and general event management.
- Convert user requests into precise calendar operations using the available tools.
- Always clarify anything ambiguous before calling a tool.

============================================================
AVAILABLE ACTIONS (TOOLS)
============================================================

You can call the following functions:

1. list_calendar_events  
   - Retrieve events between two dates, optionally searching by keywords.

2. delete_calendar_event  
   - Permanently remove a calendar event.

3. update_calendar_event_time  
   - Change an event’s start/end time.

4. create_calendar_event  
   - Add new events to the user's Google Calendar.
   - Supports:
       • one-time events  
       • recurring events via RFC 5545 RRULE strings
         (e.g., "RRULE:FREQ=WEEKLY;COUNT=4")

============================================================
GENERAL BEHAVIOR RULES
============================================================

- ALWAYS think step-by-step.
- NEVER assume event IDs — only use IDs returned from a list or tool call.
- When the user names a class (e.g., “COMP 228 lecture”), you MUST:
    1. Search for events using list_calendar_events and keywords.
    2. Interpret dates correctly.
    3. Only operate on events you find.

- If you need more info:
    → Ask the user BEFORE calling a tool.

- If the user references a date without a year:
    → Assume the year based on nearby context or future events, or ask for confirmation
      if multiple interpretations are plausible.

============================================================
DATE INTERPRETATION RULES
============================================================

- If the user says “November 17”, interpret as:
    - The next upcoming November 17 relative to their calendar, OR
    - If unsure, ask for the year.

- If the user provides a range:
    Example: “cancel all lectures from November 15 to December 3”
    → Convert to inclusive ISO datetimes:
         start: YYYY-11-15T00:00:00
         end:   YYYY-12-03T23:59:59

- If time is missing, choose reasonable defaults:
    - start_time default: 09:00
    - end_time default:   start_time + 1 hour
  (But explain this to the user.)

============================================================
RECURRING EVENTS
============================================================

You may create recurring events when requested:

Examples:
- “every Tuesday at 3pm until finals”
- “repeat weekly for 4 weeks”
- “every Monday and Wednesday until December 10”

Rules:
- Weekly recurrences use RRULE:FREQ=WEEKLY.
- Use COUNT or UNTIL (YYYYMMDD) when possible.
- If recurrence details are incomplete:
    → Ask follow-up questions.

============================================================
AFTER A TOOL CALL
============================================================

When you call a tool:
- Wait for the tool result.
- If result has: {"ok": false, "error": "..."}  
    → DO NOT say “done”.  
    → Explain the error and suggest the next step.

- After a successful result:
    → Summarize clearly what was done:
      Example: “I deleted 2 COMP 228 lecture events on Nov 17 and Nov 24.”

============================================================
EXAMPLES OF USER REQUESTS YOU MUST HANDLE
============================================================

- “Cancel my COMP 228 lecture next Wednesday.”
- “Move tomorrow’s midterm back by 1 hour.”
- “Add a study session this Sunday from 3–5pm.”
- “Create a recurring weekly study block every Saturday until December 1.”
- “Delete all COMP 248 labs in April.”
- “Reschedule all my lectures next week to one hour later.”

============================================================
ABSOLUTE RULES (NEVER BREAK THESE)
============================================================

1. Never invent event information.
2. Never modify events without confirming the correct ones.
3. Never assume the calendar contains events — always list first.
4. Never claim success unless the tool result confirms it.
5. If dates or event names are ambiguous, ask questions first.

============================================================
SUMMARY
============================================================

Your role is to:
- Interpret natural language calendar requests accurately.
- Reliably manipulate Google Calendar using the defined tools.
- Confirm all actions.
- Ask when unsure.
- NEVER hallucinate event IDs, dates, or times.

Always respond in a helpful, professional, and concise tone.
"""



CAL_CHAT_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_calendar_events",
            "description": (
                "List calendar events between two ISO datetimes. "
                "Use this to find specific events the user is referring to "
                "(e.g. certain course, specific weeks, etc.)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "date_from": {
                        "type": "string",
                        "description": "Start of the search window (ISO 8601).",
                    },
                    "date_to": {
                        "type": "string",
                        "description": "End of the search window (ISO 8601).",
                    },
                    "search_text": {
                        "type": "string",
                        "description": (
                            "Optional text to match against summary/description/"
                            "location (e.g. course code, 'lecture', 'midterm')."
                        ),
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of events to return.",
                        "default": 50,
                    },
                },
                "required": ["date_from", "date_to"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_calendar_event",
            "description": "Delete a calendar event by its event_id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "event_id": {
                        "type": "string",
                        "description": "The event's Google Calendar id.",
                    }
                },
                "required": ["event_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_calendar_event_time",
            "description": (
                "Move or reschedule an event by providing new start and end "
                "datetime values in ISO 8601 format."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "event_id": {
                        "type": "string",
                        "description": "The event's Google Calendar id.",
                    },
                    "new_start_iso": {
                        "type": "string",
                        "description": "New start datetime (ISO 8601).",
                    },
                    "new_end_iso": {
                        "type": "string",
                        "description": "New end datetime (ISO 8601).",
                    },
                },
                "required": ["event_id", "new_start_iso", "new_end_iso"],
            },
        },
    },

    {
        "type": "function",
        "function": {
            "name": "create_calendar_event",
            "description": (
                "Create a new event in the user's Google Calendar. "
                "Use this for things like study sessions, office hours, "
                "one-off reminders, or new recurring classes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Short summary of the event (e.g. 'COMP 228 Study Session').",
                    },
                    "start_iso": {
                        "type": "string",
                        "description": "Start datetime in ISO 8601 format (e.g. '2025-11-17T13:00:00').",
                    },
                    "end_iso": {
                        "type": "string",
                        "description": "End datetime in ISO 8601 format.",
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional longer description or notes.",
                    },
                    "location": {
                        "type": "string",
                        "description": "Optional location, e.g. 'H-110' or 'Library 7th floor'.",
                    },
                    "recurrence_rule": {
                        "type": "string",
                        "description": (
                            "Optional RFC 5545 RRULE string for recurring events. "
                            "Example: 'RRULE:FREQ=WEEKLY;COUNT=4' for four weekly sessions."
                        ),
                    },
                },
                "required": ["title", "start_iso", "end_iso"],
            },
        },
    },

]



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

@app.post("/api/chat/calendar")
async def chat_with_calendar(req: CalendarChatRequest):
    """
    Conversational endpoint that lets the user manage their Google Calendar
    via natural language.

    Uses OpenAI tools under the hood to list/delete/move events.
    """
    # Make sure user is connected to Google Calendar
    try:
        _get_calendar_service()
    except HTTPException as e:
        # Bubble up 401 etc.
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google auth failed: {e}")

    # Build the messages list for OpenAI
    messages = [{"role": "system", "content": CAL_CHAT_SYSTEM_PROMPT}]
    for m in req.messages:
        # Only allow user/assistant roles from client
        if m.role not in ("user", "assistant"):
            continue
        messages.append({"role": m.role, "content": m.content})

    # First call: let the model decide if it needs tools
    first = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages,
        tools=CAL_CHAT_TOOLS,
        tool_choice="auto",
    )

    choice = first.choices[0]
    msg = choice.message

    # If no tool calls, we are done
    tool_calls = msg.tool_calls or []
    if not tool_calls:
        return {"reply": msg.content}

    # --- Handle one round of tool calls (good enough for this use case) ---

    # Convert tool calls to a simple list of dicts
    tool_call_dicts = []
    tool_results_messages = []

    for tc in tool_calls:
        fn_name = tc.function.name
        raw_args = tc.function.arguments or "{}"
        try:
            parsed_args = json.loads(raw_args)
        except json.JSONDecodeError:
            parsed_args = {}

        impl = CAL_CHAT_TOOL_IMPLS.get(fn_name)
        if impl is None:
            result = {"error": f"Unknown tool {fn_name}"}
        else:
            try:
                result = impl(**parsed_args)
            except HTTPException as he:
                # Preserve HTTPException detail, but return as data to the model
                result = {"error": f"HTTPException: {he.detail}"}
            except Exception as e:
                result = {"error": f"Tool {fn_name} failed: {e}"}

        # For the second call, we need both the assistant tool call message
        # and the tool's output message.
        tool_call_dicts.append(
            {
                "id": tc.id,
                "type": tc.type,
                "function": {
                    "name": fn_name,
                    "arguments": raw_args,
                },
            }
        )
        tool_results_messages.append(
            {
                "role": "tool",
                "tool_call_id": tc.id,
                "name": fn_name,
                "content": json.dumps(result),
            }
        )

    # Second call: give the model the tool results so it can explain what happened
    followup_messages: List[Dict[str, Any]] = messages + [
        {
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": tool_call_dicts,
        }
    ]
    followup_messages.extend(tool_results_messages)

    second = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=followup_messages,
    )

    final_msg = second.choices[0].message
    return {"reply": final_msg.content}



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

def _get_calendar_service_and_target() -> tuple:
    """
    Convenience helper to get (service, calendar_id) for the current user.

    Uses the logged-in user's calendar if available (GLOBAL_CALENDAR_ID),
    otherwise falls back to CALENDAR_ID from env (usually 'primary').
    """
    service = _get_calendar_service()
    target_calendar_id = GLOBAL_CALENDAR_ID or CALENDAR_ID
    return service, target_calendar_id

def tool_list_calendar_events(
    *,
    date_from: str,
    date_to: str,
    search_text: Optional[str] = None,
    max_results: int = 250,
):
    """
    List all calendar events between date_from and date_to.
    Handles far-future dates and expands recurring events properly.
    """

    service, calendar_id = _get_calendar_service_and_target()

    # Ensure Google gets proper RFC3339 timestamps
    # Google REQUIRES timezone in the format: 2025-11-26T00:00:00-05:00
    def ensure_rfc3339(dt_str: str) -> str:
        # If datetime has no timezone, append the calendar timezone
        if "Z" in dt_str or "+" in dt_str or "-" in dt_str[10:]:
            return dt_str  # already has TZ
        return f"{dt_str}{'' if dt_str.endswith('Z') else f'-05:00'}"

    date_from_rfc = ensure_rfc3339(date_from)
    date_to_rfc = ensure_rfc3339(date_to)

    try:
        res = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=date_from_rfc,
                timeMax=date_to_rfc,
                singleEvents=True,        # CRITICAL → expands recurring weekly classes
                orderBy="startTime",      # CRITICAL → required when using singleEvents=True
                maxResults=max_results,
                q=search_text or None,
            )
            .execute()
        )

        items = res.get("items", [])

        return {
            "ok": True,
            "events": [
                {
                    "id": ev.get("id"),
                    "summary": ev.get("summary"),
                    "start": ev.get("start"),
                    "end": ev.get("end"),
                    "location": ev.get("location"),
                }
                for ev in items
            ],
        }

    except HttpError as e:
        return {"ok": False, "error": str(e)}

    except Exception as e:
        return {"ok": False, "error": str(e)}



def tool_delete_calendar_event(*, event_id: str) -> Dict[str, Any]:
    """
    Delete a single event by its Google Calendar event id.
    """
    service, calendar_id = _get_calendar_service_and_target()
    print(f"[tool_delete_calendar_event] Deleting event {event_id} from {calendar_id}")
    try:
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return {"ok": True, "deleted_event_id": event_id}
    except HttpError as e:
        print(f"[tool_delete_calendar_event] HttpError: {e}")
        return {"ok": False, "error": str(e), "event_id": event_id}
    except Exception as e:
        print(f"[tool_delete_calendar_event] Exception: {e}")
        return {"ok": False, "error": str(e), "event_id": event_id}



def tool_update_calendar_event_time(
    *,
    event_id: str,
    new_start_iso: str,
    new_end_iso: str,
) -> Dict[str, Any]:
    """
    Move/reschedule a single event to new start/end datetimes (ISO strings).
    """
    service, calendar_id = _get_calendar_service_and_target()
    print(
        f"[tool_update_calendar_event_time] Updating event {event_id} on "
        f"{calendar_id} to {new_start_iso} -> {new_end_iso}"
    )
    try:
        ev = (
            service.events()
            .get(calendarId=calendar_id, eventId=event_id)
            .execute()
        )

        ev["start"] = {"dateTime": new_start_iso, "timeZone": CAL_TIMEZONE}
        ev["end"] = {"dateTime": new_end_iso, "timeZone": CAL_TIMEZONE}

        updated = (
            service.events()
            .update(calendarId=calendar_id, eventId=event_id, body=ev)
            .execute()
        )

        return {
            "ok": True,
            "updated_event_id": updated.get("id"),
            "new_start": updated.get("start"),
            "new_end": updated.get("end"),
        }
    except HttpError as e:
        print(f"[tool_update_calendar_event_time] HttpError: {e}")
        return {"ok": False, "error": str(e), "event_id": event_id}
    except Exception as e:
        print(f"[tool_update_calendar_event_time] Exception: {e}")
        return {"ok": False, "error": str(e), "event_id": event_id}
    
def tool_create_calendar_event(
    *,
    title: str,
    start_iso: str,
    end_iso: str,
    description: Optional[str] = None,
    location: Optional[str] = None,
    recurrence_rule: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a new calendar event.

    - title: short summary, e.g. "COMP 228 Study Session"
    - start_iso / end_iso: ISO 8601 datetimes with timezone info or naive in
      the calendar timezone.
    - description / location: optional extra info.
    - recurrence_rule: optional RFC 5545 RRULE string if you want a repeating
      event (e.g. "RRULE:FREQ=WEEKLY;COUNT=4").
    """
    service, calendar_id = _get_calendar_service_and_target()
    print(
        f"[tool_create_calendar_event] Creating event {title!r} on {calendar_id}: "
        f"{start_iso} -> {end_iso}"
    )

    event_body: Dict[str, Any] = {
        "summary": title,
        "description": description,
        "location": location,
        "start": {"dateTime": start_iso, "timeZone": CAL_TIMEZONE},
        "end": {"dateTime": end_iso, "timeZone": CAL_TIMEZONE},
    }

    if recurrence_rule:
        # Google expects a list of RRULE strings
        event_body["recurrence"] = [recurrence_rule]

    # Strip None values
    event_body = {k: v for k, v in event_body.items() if v is not None}

    try:
        created = (
            service.events()
            .insert(calendarId=calendar_id, body=event_body)
            .execute()
        )
        return {
            "ok": True,
            "created_event_id": created.get("id"),
            "summary": created.get("summary"),
            "start": created.get("start"),
            "end": created.get("end"),
        }
    except HttpError as e:
        print(f"[tool_create_calendar_event] HttpError: {e}")
        return {"ok": False, "error": str(e)}
    except Exception as e:
        print(f"[tool_create_calendar_event] Exception: {e}")
        return {"ok": False, "error": str(e)}


CAL_CHAT_TOOL_IMPLS = {
    "list_calendar_events": tool_list_calendar_events,
    "delete_calendar_event": tool_delete_calendar_event,
    "update_calendar_event_time": tool_update_calendar_event_time,
    "create_calendar_event": tool_create_calendar_event,
}



