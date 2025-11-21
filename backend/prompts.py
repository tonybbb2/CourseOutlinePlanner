from typing import List, Dict, Any

# =========================
# PDF → COURSE DATA PROMPTS
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
# CALENDAR CHAT SYSTEM PROMPT
# =========================

CAL_CHAT_SYSTEM_PROMPT = """
[exact same long system prompt you had before...]
""".strip()

# =========================
# TOOL SCHEMA FOR OPENAI
# =========================

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
                    "date_from": {"type": "string", "description": "Start of window (ISO)."},
                    "date_to": {"type": "string", "description": "End of window (ISO)."},
                    "search_text": {
                        "type": "string",
                        "description": (
                            "Optional text to match against summary/description/location."
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
                    "event_id": {"type": "string", "description": "The event id."},
                    "new_start_iso": {"type": "string", "description": "New start."},
                    "new_end_iso": {"type": "string", "description": "New end."},
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
                    "title": {"type": "string", "description": "Event title."},
                    "start_iso": {"type": "string", "description": "Start datetime ISO."},
                    "end_iso": {"type": "string", "description": "End datetime ISO."},
                    "description": {"type": "string"},
                    "location": {"type": "string"},
                    "recurrence_rule": {
                        "type": "string",
                        "description": "RFC5545 RRULE if recurring.",
                    },
                },
                "required": ["title", "start_iso", "end_iso"],
            },
        },
    },
]
