from datetime import datetime
from typing import List, Optional, Dict

from pydantic import BaseModel, Field


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
    reviewed: bool = False
    synced: bool = False


class AuthStatus(BaseModel):
    connected: bool
    email: Optional[str] = None


class ChatMessageIn(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class CalendarChatRequest(BaseModel):
    messages: List[ChatMessageIn]


class EventUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class CourseReviewUpdate(BaseModel):
    reviewed: bool = True


class PlanStatus(BaseModel):
    plan: str = "free"
    syllabus_upload_limit: int = 2
    syllabus_uploads_used: int = 0
    assistant_message_limit: int = 10
    assistant_messages_used: int = 0
    paid_features: List[str] = Field(
        default_factory=lambda: [
            "unlimited syllabi",
            "study plan generation",
            "conflict detection",
            "extended assistant actions",
            "multi-semester planning",
        ]
    )


# In-memory stores
COURSES: Dict[str, Course] = {}
EVENTS: Dict[str, Event] = {}

# Single-user prototype usage store. Replace with user-scoped database records
# before launch.
PLAN_STATUS = PlanStatus()
