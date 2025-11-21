import { BackendEvent } from "../api";

interface ParsedEventsProps {
  events: BackendEvent[];
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getEventTypeColor(type: string): string {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("lecture") || lowerType.includes("class")) return "blue";
  if (lowerType.includes("lab")) return "purple";
  if (lowerType.includes("midterm") || lowerType.includes("test")) return "orange";
  if (lowerType.includes("final") || lowerType.includes("exam")) return "red";
  if (lowerType.includes("assignment") || lowerType.includes("project")) return "green";
  return "gray";
}

function getEventTypeIcon(type: string): string {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("lecture") || lowerType.includes("class")) return "📚";
  if (lowerType.includes("lab")) return "🔬";
  if (lowerType.includes("midterm") || lowerType.includes("test")) return "📝";
  if (lowerType.includes("final") || lowerType.includes("exam")) return "🎓";
  if (lowerType.includes("assignment") || lowerType.includes("project")) return "📋";
  return "📅";
}

export function ParsedEvents({ events }: ParsedEventsProps) {
  if (!events.length) {
    return (
      <div className="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h3>No events yet</h3>
        <p>Upload a course outline PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="events-container">
      {events.map((event) => {
        const color = getEventTypeColor(event.type);
        const icon = getEventTypeIcon(event.type);

        return (
          <div key={event.id} className="event-card">
            <div className="event-header">
              <div className="event-icon">{icon}</div>
              <div className="event-main">
                <h3 className="event-title">{event.title}</h3>
                <span className={`event-badge ${color}`}>{event.type}</span>
              </div>
            </div>

            <div className="event-details">
              <div className="event-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{formatDateTime(event.start)}</span>
              </div>

              {event.end && (
                <div className="event-detail">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{formatDateTime(event.end)}</span>
                </div>
              )}

              {event.location && (
                <div className="event-detail">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
