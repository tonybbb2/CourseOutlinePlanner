import io
import json
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI

# ============== GOOGLE CALENDAR IMPORTS ==============
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
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

# Where OAuth token will be stored (default: ./token.json)
CAL_TOKEN_JSON = os.getenv("CAL_TOKEN_JSON", os.path.join(os.getcwd(), "token.json"))

CAL_TIMEZONE = os.getenv("CAL_TIMEZONE", "America/Toronto")
# Use "primary" or a specific calendar ID (e.g. the shared test calendar)
CALENDAR_ID = os.getenv("CALENDAR_ID", "primary")


def _get_google_creds() -> Credentials:
    """
    Desktop/Installed OAuth flow. Stores token at CAL_TOKEN_JSON.
    First time: opens a browser to authorize the app.
    Next times: reuses/refreshes token.json automatically.
    """
    if not os.path.exists(CAL_CLIENT_JSON):
        raise RuntimeError(f"credentials.json not found at: {CAL_CLIENT_JSON}")

    creds: Optional[Credentials] = None

    if os.path.exists(CAL_TOKEN_JSON):
        creds = Credentials.from_authorized_user_file(CAL_TOKEN_JSON, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CAL_CLIENT_JSON, SCOPES)
            # This opens a browser window ON THE MACHINE running the backend
            creds = flow.run_local_server(port=0)

        token_dir = os.path.dirname(CAL_TOKEN_JSON)
        if token_dir:
            os.makedirs(token_dir, exist_ok=True)
        with open(CAL_TOKEN_JSON, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

    return creds


def _get_calendar_service():
    creds = _get_google_creds()
    return build("calendar", "v3", credentials=creds)


def _event_to_google_body(ev: "Event") -> dict:
    """
    Map your Event model → Google Calendar event payload.
    Uses private extendedProperties to track source & app_event_id
    so we can avoid duplicates / update in place.
    """
    start_dt = ev.start.isoformat()

    body: Dict[str, object] = {
        "summary": ev.title,
        "location": ev.location or None,
        "description": f"{ev.type.upper()} (Course ID: {ev.course_id})",
        "start": {"dateTime": start_dt, "timeZone": CAL_TIMEZONE},
        "extendedProperties": {
            "private": {
                "source": "course-outline",
                "course_id": ev.course_id,
                "app_event_id": ev.id,
            }
        },
        "colorId": "6" if ev.type in {"midterm", "final", "test", "quiz"} else None,
    }

    # End time: use provided end or default to +1h
    if ev.end:
        body["end"] = {"dateTime": ev.end.isoformat(), "timeZone": CAL_TIMEZONE}
    else:
        body["end"] = {
            "dateTime": (ev.start + timedelta(hours=1)).isoformat(),
            "timeZone": CAL_TIMEZONE,
        }

    # Strip None values
    return {k: v for k, v in body.items() if v is not None}


def _find_existing_event_by_app_id(service, app_event_id: str):
    """
    Look up events with our private extended property to avoid duplicates.
    """
    try:
        res = (
            service.events()
            .list(
                calendarId=CALENDAR_ID,
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

app = FastAPI(title="Course Calendar Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
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
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        service = _get_calendar_service()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google auth failed: {e}")

    results = []
    for ev in course.events:
        body = _event_to_google_body(ev)
        try:
            existing = _find_existing_event_by_app_id(service, ev.id)
            if existing:
                updated = (
                    service.events()
                    .update(
                        calendarId=CALENDAR_ID,
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
                    .insert(calendarId=CALENDAR_ID, body=body)
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
