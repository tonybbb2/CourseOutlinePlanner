from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException

from ..models import Course, Event, COURSES, EVENTS
from ..openai_extraction import extract_course_data_from_pdf
from ..google_calendar import sync_course_to_google

router = APIRouter(prefix="/api", tags=["courses"])


@router.post("/upload-syllabus", response_model=Course)
async def upload_syllabus(file: UploadFile = File(...)):
    if file.content_type not in ["application/pdf"]:
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    pdf_bytes = await file.read()

    try:
        course = extract_course_data_from_pdf(pdf_bytes)
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


@router.post("/courses/{course_id}/sync-google")
async def sync_course_google(course_id: str):
    try:
        result = sync_course_to_google(course_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result
