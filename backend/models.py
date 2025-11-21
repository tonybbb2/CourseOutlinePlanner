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


class AuthStatus(BaseModel):
    connected: bool
    email: Optional[str] = None


class ChatMessageIn(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class CalendarChatRequest(BaseModel):
    messages: List[ChatMessageIn]


# In-memory stores
COURSES: Dict[str, Course] = {}
EVENTS: Dict[str, Event] = {}
