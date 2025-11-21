from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .config import (
    get_google_creds_single_user,
    CAL_TIMEZONE,
    CALENDAR_ID,
    GLOBAL_CALENDAR_ID,
)
from .models import Event, Course
from .models import COURSES
from .prompts import CAL_CHAT_TOOLS


# ========= BASIC SERVICE HELPERS =========


def get_calendar_service():
    """Build a Google Calendar service for the single logged-in user."""
    creds = get_google_creds_single_user()
    return build("calendar", "v3", credentials=creds)


def get_calendar_service_and_target() -> Tuple[Any, str]:
    service = get_calendar_service()
    target_calendar = GLOBAL_CALENDAR_ID or CALENDAR_ID
    return service, target_calendar


# ========= EVENT MAPPING HELPERS =========


def event_to_google_body(
    ev: Event,
    *,
    app_event_id: Optional[str] = None,
    start_override: Optional[datetime] = None,
    end_override: Optional[datetime] = None,
) -> dict:
    """Map Event model → Google Calendar event JSON."""
    start_dt = start_override or ev.start
    if end_override is not None:
        end_dt = end_override
    elif ev.end is not None:
        end_dt = ev.end
    else:
        end_dt = start_dt + timedelta(hours=1)

    body: Dict[str, Any] = {
        "summary": ev.title,
        "location": ev.location or None,
        "description": f"{ev.type.upper()} (Course ID: {ev.course_id})",
        "start": {"dateTime": start_dt.isoformat(), "timeZone": CAL_TIMEZONE},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": CAL_TIMEZONE},
        "extendedProperties": {
            "private": {
                "source": "course-outline",
                "course_id": ev.course_id,
                "app_event_id": app_event_id or ev.id,
            }
        },
        "colorId": "6" if ev.type in {"midterm", "final", "test", "quiz"} else None,
    }

    return {k: v for k, v in body.items() if v is not None}


def find_existing_event_by_app_id(service, calendar_id: str, app_event_id: str):
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


# ========= SYNC COURSE → CALENDAR =========


def sync_course_to_google(course_id: str) -> Dict[str, Any]:
    course = COURSES.get(course_id)
    if not course:
        raise ValueError("Course not found")

    service, calendar_id = get_calendar_service_and_target()

    # Determine upper bound for recurring events
    upper_date: Optional[datetime] = None

    for ev in course.events:
        ev_type = ev.type.lower()
        if "final" in ev_type or "exam" in ev_type:
            if upper_date is None or ev.start > upper_date:
                upper_date = ev.start

    if upper_date is None and course.events:
        upper_date = max(ev.start for ev in course.events)

    if upper_date is None and course.events:
        earliest = min(ev.start for ev in course.events)
        upper_date = earliest + timedelta(weeks=16)

    results = []

    def weekly_occurrences(ev: Event):
        current = ev.start
        while upper_date is not None and current <= upper_date:
            yield current
            current = current + timedelta(weeks=1)

    for ev in course.events:
        ev_type = ev.type.lower()

        if ("class" in ev_type) or ("tutorial" in ev_type) or ("lab" in ev_type):
            base_duration = (
                (ev.end - ev.start) if ev.end is not None else timedelta(hours=1)
            )

            for idx, occ_start in enumerate(weekly_occurrences(ev)):
                occ_end = occ_start + base_duration
                app_event_id = f"{ev.id}_wk{idx}"

                body = event_to_google_body(
                    ev,
                    app_event_id=app_event_id,
                    start_override=occ_start,
                    end_override=occ_end,
                )

                try:
                    existing = find_existing_event_by_app_id(
                        service, calendar_id, app_event_id
                    )
                    if existing:
                        updated = (
                            service.events()
                            .update(
                                calendarId=calendar_id,
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
                            .insert(calendarId=calendar_id, body=body)
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
            body = event_to_google_body(ev)
            try:
                existing = find_existing_event_by_app_id(
                    service, calendar_id, ev.id
                )
                if existing:
                    updated = (
                        service.events()
                        .update(
                            calendarId=calendar_id,
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
                        .insert(calendarId=calendar_id, body=body)
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


# ========= TOOL IMPLEMENTATIONS =========


def tool_list_calendar_events(
    *,
    date_from: str,
    date_to: str,
    search_text: Optional[str] = None,
    max_results: int = 250,
):
    service, calendar_id = get_calendar_service_and_target()

    def ensure_rfc3339(dt_str: str) -> str:
        if "Z" in dt_str or "+" in dt_str or "-" in dt_str[10:]:
            return dt_str
        return f"{dt_str}-05:00"

    date_from_rfc = ensure_rfc3339(date_from)
    date_to_rfc = ensure_rfc3339(date_to)

    try:
        res = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=date_from_rfc,
                timeMax=date_to_rfc,
                singleEvents=True,
                orderBy="startTime",
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
    service, calendar_id = get_calendar_service_and_target()
    try:
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return {"ok": True, "deleted_event_id": event_id}
    except HttpError as e:
        return {"ok": False, "error": str(e), "event_id": event_id}
    except Exception as e:
        return {"ok": False, "error": str(e), "event_id": event_id}


def tool_update_calendar_event_time(
    *,
    event_id: str,
    new_start_iso: str,
    new_end_iso: str,
) -> Dict[str, Any]:
    service, calendar_id = get_calendar_service_and_target()
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
        return {"ok": False, "error": str(e), "event_id": event_id}
    except Exception as e:
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
    service, calendar_id = get_calendar_service_and_target()

    event_body: Dict[str, Any] = {
        "summary": title,
        "description": description,
        "location": location,
        "start": {"dateTime": start_iso, "timeZone": CAL_TIMEZONE},
        "end": {"dateTime": end_iso, "timeZone": CAL_TIMEZONE},
    }

    if recurrence_rule:
        event_body["recurrence"] = [recurrence_rule]

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
        return {"ok": False, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


CAL_CHAT_TOOL_IMPLS = {
    "list_calendar_events": tool_list_calendar_events,
    "delete_calendar_event": tool_delete_calendar_event,
    "update_calendar_event_time": tool_update_calendar_event_time,
    "create_calendar_event": tool_create_calendar_event,
}
