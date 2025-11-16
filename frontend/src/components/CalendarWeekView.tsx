import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  addMinutes,
  differenceInMinutes,
  startOfDay,
} from "date-fns";
import { CalendarEvent, getEventColor } from "../types/calendar";

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarWeekView({
  currentDate,
  events,
  onEventClick,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const HOUR_HEIGHT = 60;

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return isSameDay(eventStart, day);
    });
  };

  const getEventPosition = (event: CalendarEvent) => {
    const dayStart = startOfDay(event.start);
    const minutesFromStart = differenceInMinutes(event.start, dayStart);
    const duration = differenceInMinutes(event.end, event.start);

    const top = (minutesFromStart / 60) * HOUR_HEIGHT;
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 30);

    return { top, height };
  };

  return (
    <div className="calendar-week-container">
      <div className="calendar-week-grid">
        <div className="calendar-week-time-col">
          <div className="calendar-week-time-header"></div>
          {hours.map((hour) => (
            <div key={hour} className="calendar-week-time-slot">
              {format(addMinutes(startOfDay(currentDate), hour * 60), "ha")}
            </div>
          ))}
        </div>

        <div className="calendar-week-days">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div key={day.toISOString()} className="calendar-week-day">
                <div
                  className={`calendar-week-day-header ${
                    isCurrentDay ? "today" : ""
                  }`}
                >
                  <div className="calendar-week-day-name">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={`calendar-week-day-number ${
                      isCurrentDay ? "today-number" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                </div>

                <div className="calendar-week-day-content">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="calendar-week-hour-slot"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    ></div>
                  ))}

                  {dayEvents.map((event) => {
                    const { top, height } = getEventPosition(event);
                    return (
                      <button
                        key={event.id}
                        className={`calendar-week-event ${getEventColor(
                          event.type
                        )}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                        onClick={() => onEventClick(event)}
                      >
                        <div className="calendar-week-event-time">
                          {format(event.start, "h:mm a")}
                        </div>
                        <div className="calendar-week-event-title">
                          {event.title}
                        </div>
                        {event.location && (
                          <div className="calendar-week-event-location">
                            {event.location}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
