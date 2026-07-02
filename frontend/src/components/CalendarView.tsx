import { useState } from "react";
import { addMonths, addWeeks, startOfToday } from "date-fns";
import { BackendCourse } from "../api";
import {
  CalendarView as CalendarViewType,
  mapBackendEventToCalendarEvent,
  CalendarEvent,
} from "../types/calendar";
import { CalendarToolbar } from "./CalendarToolbar";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarWeekView } from "./CalendarWeekView";
import { EventDetailPopup } from "./EventDetailPopup";

interface CalendarViewProps {
  course: BackendCourse | null;
  onExport?: (courseId: string) => void;
}

export function CalendarView({ course, onExport }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(startOfToday());
  const [view, setView] = useState<CalendarViewType>("week");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const events = course
    ? course.events.map(mapBackendEventToCalendarEvent)
    : [];

  const handleNavigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(startOfToday());
    } else if (direction === "prev") {
      setCurrentDate((prev) =>
        view === "month" ? addMonths(prev, -1) : addWeeks(prev, -1)
      );
    } else {
      setCurrentDate((prev) =>
        view === "month" ? addMonths(prev, 1) : addWeeks(prev, 1)
      );
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleExport = () => {
    if (course && onExport) {
      onExport(course.id);
    }
  };

  if (!course) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
        <svg
          className="h-12 w-12 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-900">
          No Course Selected
        </h3>
        <p className="m-0 text-sm text-gray-500">
          Upload a course syllabus to see events on the calendar
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
        <svg
          className="h-12 w-12 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-900">
          No Events Found
        </h3>
        <p className="m-0 text-sm text-gray-500">
          This course has no scheduled events
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <CalendarToolbar
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onNavigate={handleNavigate}
        onExport={onExport ? handleExport : undefined}
      />

      <div className="mt-4">
        {view === "month" ? (
          <CalendarGrid
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
          />
        ) : (
          <CalendarWeekView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {selectedEvent && (
        <EventDetailPopup
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
