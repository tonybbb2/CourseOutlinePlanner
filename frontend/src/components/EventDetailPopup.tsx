import { format } from "date-fns";
import { CalendarEvent, getEventColor } from "../types/calendar";
import { useEffect, useRef } from "react";

interface EventDetailPopupProps {
  event: CalendarEvent;
  onClose: () => void;
}

export function EventDetailPopup({ event, onClose }: EventDetailPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div className="event-popup-overlay">
      <div className="event-popup" ref={popupRef} role="dialog" aria-modal="true">
        <div className="event-popup-header">
          <h3 className="event-popup-title">{event.title}</h3>
          <button
            className="event-popup-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="event-popup-content">
          <div className="event-popup-badge-container">
            <span className={`event-badge ${getEventColor(event.type)}`}>
              {event.type}
            </span>
          </div>

          <div className="event-popup-details">
            <div className="event-popup-detail">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <div className="event-popup-detail-label">Start</div>
                <div className="event-popup-detail-value">
                  {format(event.start, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            </div>

            <div className="event-popup-detail">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <div className="event-popup-detail-label">End</div>
                <div className="event-popup-detail-value">
                  {format(event.end, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            </div>

            {event.location && (
              <div className="event-popup-detail">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <div className="event-popup-detail-label">Location</div>
                  <div className="event-popup-detail-value">{event.location}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
