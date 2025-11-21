import json
import uuid
from datetime import datetime

from .config import client
from .models import Course, Event, COURSES, EVENTS
from .prompts import SYSTEM_PROMPT, USER_PROMPT


def extract_course_data_from_pdf(pdf_bytes: bytes) -> Course:
    """
    Send a course outline PDF to OpenAI and convert the response into
    a Course object + Event objects stored in memory.
    """
    # 1) Upload file
    pdf_file = client.files.create(
        file=("outline.pdf", pdf_bytes),
        purpose="assistants",
    )

    # 2) Ask the model for structured JSON
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
            datetime.fromisoformat(f"{date_str}T{end_time}:00")
            if end_time
            else None
        )

        event_obj = Event(
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

        course.events.append(event_obj)
        EVENTS[event_obj.id] = event_obj

    COURSES[course.id] = course
    return course
