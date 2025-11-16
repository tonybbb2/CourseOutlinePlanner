import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  isToday,
} from "date-fns";
import { CalendarEvent, getEventColor } from "../types/calendar";

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarGrid({
  currentDate,
  events,
  onEventClick,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return isSameDay(eventStart, day);
    });
  };

  return (
    <div className="calendar-grid-container">
      <div className="calendar-grid">
        <div className="calendar-header-row">
          {weekDays.map((day) => (
            <div key={day} className="calendar-header-cell">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-body">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={index}
                className={`calendar-day-cell ${
                  !isCurrentMonth ? "other-month" : ""
                } ${isCurrentDay ? "today" : ""}`}
              >
                <div className="calendar-day-number">{format(day, "d")}</div>
                <div className="calendar-day-events">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      className={`calendar-event-pill ${getEventColor(
                        event.type
                      )}`}
                      onClick={() => onEventClick(event)}
                      title={event.title}
                    >
                      <span className="calendar-event-time">
                        {format(event.start, "h:mm a")}
                      </span>
                      <span className="calendar-event-title">{event.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="calendar-event-more">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
