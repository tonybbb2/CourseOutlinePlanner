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

function getBadgeClasses(type: string): string {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("lecture") || lowerType.includes("class")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-100";
  }
  if (lowerType.includes("lab")) {
    return "bg-purple-50 text-purple-700 border-purple-100";
  }
  if (lowerType.includes("midterm") || lowerType.includes("test")) {
    return "bg-orange-50 text-orange-700 border-orange-100";
  }
  if (lowerType.includes("final") || lowerType.includes("exam")) {
    return "bg-red-50 text-red-700 border-red-100";
  }
  if (lowerType.includes("assignment") || lowerType.includes("project")) {
    return "bg-green-50 text-green-700 border-green-100";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export function ParsedEvents({ events }: ParsedEventsProps) {
  if (!events.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
        <svg
          className="h-12 w-12 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-900">No events yet</h3>
        <p className="m-0 text-sm text-gray-500">
          Upload a course outline PDF to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {events.map((event) => {
        const badgeClass = getBadgeClasses(event.type);

        return (
          <div
            key={event.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">
                  {event.title}
                </h3>
                <p className="m-0 text-xs text-gray-500">
                  {event.location ?? "No location"}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${badgeClass}`}
              >
                {event.type}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{formatDateTime(event.start)}</span>
              </div>

              {event.end && (
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{formatDateTime(event.end)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
