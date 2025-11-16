import { BackendEvent } from "../api";

export type CalendarView = "month" | "week";

export interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  start: Date;
  end: Date;
  location: string | null;
  courseId: string;
}

export function mapBackendEventToCalendarEvent(
  event: BackendEvent
): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    start: new Date(event.start),
    end: event.end ? new Date(event.end) : new Date(event.start),
    location: event.location,
    courseId: event.course_id,
  };
}

export function getEventColor(type: string): string {
  const normalized = type.toLowerCase();

  if (normalized.includes("class") || normalized.includes("lecture") || normalized.includes("lab")) {
    return "blue";
  }
  if (normalized.includes("midterm") || normalized.includes("test")) {
    return "orange";
  }
  if (normalized.includes("final") || normalized.includes("exam")) {
    return "red";
  }
  if (normalized.includes("assignment") || normalized.includes("homework")) {
    return "purple";
  }
  if (normalized.includes("quiz")) {
    return "green";
  }

  return "gray";
}
