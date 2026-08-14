from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException

from ..models import (
    Course,
    CourseReviewUpdate,
    Event,
    EventUpdate,
    PLAN_STATUS,
    PlanStatus,
    COURSES,
    EVENTS,
)
from ..openai_extraction import extract_course_data_from_pdf
from ..google_calendar import sync_course_to_google

router = APIRouter(prefix="/api", tags=["courses"])


@router.post("/upload-syllabus", response_model=Course)
async def upload_syllabus(file: UploadFile = File(...)):
    if file.content_type not in ["application/pdf"]:
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    if PLAN_STATUS.syllabus_uploads_used >= PLAN_STATUS.syllabus_upload_limit:
        raise HTTPException(
            status_code=403,
            detail="Free upload limit reached. Upgrade support is coming soon.",
        )

    pdf_bytes = await file.read()

    try:
        course = extract_course_data_from_pdf(pdf_bytes)
        PLAN_STATUS.syllabus_uploads_used += 1
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return course


@router.get("/courses", response_model=List[Course])
async def list_courses():
    return list(COURSES.values())


@router.get("/courses/{course_id}", response_model=Course)
async def get_course(course_id: str):
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("/courses/{course_id}/events", response_model=List[Event])
async def get_course_events(course_id: str):
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course.events


@router.get("/events", response_model=List[Event])
async def list_all_events():
    return list(EVENTS.values())


@router.get("/me/plan", response_model=PlanStatus)
async def get_plan_status():
    return PLAN_STATUS


@router.patch("/courses/{course_id}/review", response_model=Course)
async def update_course_review(course_id: str, payload: CourseReviewUpdate):
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.reviewed = payload.reviewed
    COURSES[course_id] = course
    return course


@router.patch("/courses/{course_id}/events/{event_id}", response_model=Event)
async def update_course_event(course_id: str, event_id: str, payload: EventUpdate):
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    event = EVENTS.get(event_id)
    if not event or event.course_id != course_id:
        raise HTTPException(status_code=404, detail="Event not found")

    updates = payload.model_dump(exclude_unset=True)
    updated_event = event.model_copy(update=updates)
    EVENTS[event_id] = updated_event

    course.events = [
        updated_event if existing.id == event_id else existing
        for existing in course.events
    ]
    course.reviewed = False
    COURSES[course_id] = course

    return updated_event


@router.delete("/courses/{course_id}/events/{event_id}")
async def delete_course_event(course_id: str, event_id: str):
    course = COURSES.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    event = EVENTS.get(event_id)
    if not event or event.course_id != course_id:
        raise HTTPException(status_code=404, detail="Event not found")

    EVENTS.pop(event_id, None)
    course.events = [existing for existing in course.events if existing.id != event_id]
    course.reviewed = False
    COURSES[course_id] = course

    return {"ok": True}


@router.post("/courses/{course_id}/sync-google")
async def sync_course_google(course_id: str):
    try:
        result = sync_course_to_google(course_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    course = COURSES.get(course_id)
    if course:
        course.synced = True
        COURSES[course_id] = course

    return result
