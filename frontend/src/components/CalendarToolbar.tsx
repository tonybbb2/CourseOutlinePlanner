import { format } from "date-fns";
import { CalendarView } from "../types/calendar";

interface CalendarToolbarProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onExport?: () => void;
}

export function CalendarToolbar({
  currentDate,
  view,
  onViewChange,
  onNavigate,
  onExport,
}: CalendarToolbarProps) {
  const dateLabel =
    view === "month"
      ? format(currentDate, "MMMM yyyy")
      : format(currentDate, "MMM d, yyyy");

  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-left">
        <button
          className="calendar-toolbar-button"
          onClick={() => onNavigate("today")}
        >
          Today
        </button>

        <div className="calendar-nav-buttons">
          <button
            className="calendar-nav-button"
            onClick={() => onNavigate("prev")}
            aria-label="Previous"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="calendar-nav-button"
            onClick={() => onNavigate("next")}
            aria-label="Next"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <h3 className="calendar-date-label">{dateLabel}</h3>
      </div>

      <div className="calendar-toolbar-right">
        <div className="calendar-view-toggle">
          <button
            className={`calendar-view-button ${view === "week" ? "active" : ""}`}
            onClick={() => onViewChange("week")}
          >
            Week
          </button>
          <button
            className={`calendar-view-button ${view === "month" ? "active" : ""}`}
            onClick={() => onViewChange("month")}
          >
            Month
          </button>
        </div>

        {onExport && (
          <button className="calendar-export-button" onClick={onExport}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export to Google
          </button>
        )}
      </div>
    </div>
  );
}
