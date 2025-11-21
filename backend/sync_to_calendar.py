import json
import os

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Full access so we can create events
SCOPES = ["https://www.googleapis.com/auth/calendar"]
TIMEZONE = "America/Toronto"   # adjust if needed
CALENDAR_ID = "primary"


def get_creds():
    """Load or create Google OAuth credentials."""
    creds = None

    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # credentials.json must be the OAuth *desktop* client you downloaded
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)

        with open("token.json", "w") as token:
            token.write(creds.to_json())

    return creds


def main():
    # 1) Load course_data.json
    with open("course_data.json", "r", encoding="utf-8") as f:
        course = json.load(f)

    events = course.get("events", [])
    if not events:
        print("No events found in course_data.json")
        return

    course_name = course.get("name") or ""
    course_code = course.get("code") or ""
    term = course.get("term") or ""

    # 2) Auth with Google
    creds = get_creds()
    try:
        service = build("calendar", "v3", credentials=creds)

        for ev in events:
            start_str = ev["start"]      # e.g. "2025-09-02T15:30:00"
            end_str = ev.get("end")      # may be None

            # Build Google Calendar event body
            summary_parts = [course_code, ev.get("title", "")]
            summary = " - ".join(p for p in summary_parts if p)

            description_parts = [
                course_name,
                term,
                f"type: {ev.get('type', 'other')}"
            ]
            description = " | ".join(p for p in description_parts if p)

            body = {
                "summary": summary or "Course event",
                "location": ev.get("location"),
                "description": description,
                "start": {
                    "dateTime": start_str,
                    "timeZone": TIMEZONE,
                },
                "end": {
                    "dateTime": end_str,
                    "timeZone": TIMEZONE,
                } if end_str else None,
                # Optional: mark assessments in a color
                "colorId": "6" if ev.get("type") in {"midterm", "final", "test", "quiz"} else None,
                # Optional: store internal IDs so you can dedupe later
                "extendedProperties": {
                    "private": {
                        "source": "course-outline",
                        "course_id": ev.get("course_id", ""),
                        "app_event_id": ev.get("id", ""),
                    }
                }
            }

            # Remove None values so API doesn't complain
            body = {k: v for k, v in body.items() if v is not None}

            created = service.events().insert(calendarId=CALENDAR_ID, body=body).execute()
            print("Created event:", created.get("id"), "->", created.get("htmlLink"))

    except HttpError as e:
        print("❌ Google Calendar API error:", e)


if __name__ == "__main__":
    main()
