import io
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI 

# =========================
# ENV & OPENAI CLIENT
# =========================

load_dotenv("apikey.env")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in environment or .env file")

client = OpenAI(api_key=OPENAI_API_KEY)

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
        description="lecture, lab, tutorial, midterm, final, assignment_due, holiday, study_block, other"
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

- Focus ONLY on events that a student wants to see in a personal calendar:
  - Regular teaching slots: lectures, labs, tutorials/demos.
  - Assessments: midterms, finals, quizzes, tests (including online or in-lab).
- DO NOT include:
  - Administrative deadlines (add/drop, withdrawal, SPÉSH registration, fee deadlines, etc.).
  - Generic holidays or reading/spring breaks, unless explicitly tied to an exam or quiz.
  - Vague "study weeks" or recommendations without a specific exam/quiz date.

Class times:
- If weekly patterns are given (e.g. "every Tuesday 15h30–17h00 in room B-2325"),
  create ONE event per distinct pattern using the FIRST date where it clearly applies.
  Example: the first Tuesday of the session at that time.
- For these weekly slots, set:
  - type = "class" (for lectures), "lab", or "tutorial" appropriately.
  - date = the first calendar date you can infer for that pattern.
- Do NOT create one event per week. ONE representative event per weekly pattern is enough.

Assessments:
- Include each midterm, final, quiz, or test with its exact date, start time, end time, and location if given.
- Examples of assessment keywords: "intra", "examen final", "midterm", "final exam", "quiz", "test".
- If time is missing for an assessment, use null for start_time and end_time.
- If location is not specified yet (e.g. "TBA"), set location to null.

Missing information and guessing:
- NEVER invent dates, times, or rooms.
- If a class or assessment does not have an explicit date, do not create an event for it.
- If you cannot determine class times from the outline, return an empty events array or just the assessment events that are well defined.
- If course name, code, or term are not clearly given, set them to null instead of making them up.

Formatting:
- notes are NOT part of the schema anymore. Do NOT return a notes field.
- Do not return admin or meta information.
- Do not include any explanations, markdown, or extra text outside the JSON.
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
    # 1) Upload PDF file for use by the model
    pdf_file = client.files.create(
        file=("outline.pdf", pdf_bytes),
        purpose="assistants",
    )

    # 2) Call Responses API with PDF as input_file + text instructions
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

    # Easiest way to get the text
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

    # 3) Convert JSON into Course + Events
    course_id = str(uuid.uuid4())

    course = Course(
        id=course_id,
        name=data.get("course_name"),
        code=data.get("course_code"),
        term=data.get("term"),
        raw_outline_file_id=pdf_file.id,
    )

    events_json = data.get("events", []) or []
    for ev in events_json:
        date_str = ev.get("date")
        start_time = ev.get("start_time")
        end_time = ev.get("end_time")

        if not date_str:
            continue

        # construct datetimes
        if start_time:
            start_dt = datetime.fromisoformat(f"{date_str}T{start_time}:00")
        else:
            start_dt = datetime.fromisoformat(f"{date_str}T00:00:00")

        if end_time:
            end_dt = datetime.fromisoformat(f"{date_str}T{end_time}:00")
        else:
            end_dt = None

        event = Event(
            id=str(uuid.uuid4()),
            course_id=course_id,
            title=ev.get("title", "Untitled"),
            type=ev.get("type", "other"),
            start=start_dt,
            end=end_dt,
            location=ev.get("location"),
            notes=ev.get("notes"),
            source_page=ev.get("source_page"),
        )

        course.events.append(event)
        EVENTS[event.id] = event

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

    COURSES[course.id] = course
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
