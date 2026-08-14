import type { BackendCourse, BackendEvent } from "../api";
import { primaryButton, softPill } from "../ui";

interface CalendarViewProps {
  course: BackendCourse | null;
  onExport?: (courseId: string) => void;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "No time";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortEvents(events: BackendEvent[]) {
  return [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
}

export function CalendarView({ course, onExport }: CalendarViewProps) {
  if (!course) {
    return (
      <div className="ai-panel rounded-2xl border-dashed p-6 text-center">
        <h3 className="m-0 text-sm font-black text-black">
          No course selected
        </h3>
        <p className="m-0 mt-1 text-sm font-bold text-zinc-600">
          Upload or review a course to preview its extracted schedule.
        </p>
      </div>
    );
  }

  return (
    <section className="ai-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black px-5 py-4">
        <div>
          <h2 className="m-0 text-xl font-black text-black">
            {course.code || course.name || "Course schedule"}
          </h2>
          <p className="m-0 mt-1 text-sm font-bold text-zinc-600">
            Local preview of extracted events.
          </p>
        </div>
        {onExport && (
          <button
            type="button"
            className={primaryButton}
            onClick={() => onExport(course.id)}
            disabled={!course.reviewed}
            title={course.reviewed ? "Sync to Google" : "Review course first"}
          >
            Sync reviewed course
          </button>
        )}
      </div>

      {!course.events.length ? (
        <div className="px-5 py-8 text-sm font-bold text-zinc-700">
          No schedule events were detected for this course.
        </div>
      ) : (
        <div className="divide-y-[3px] divide-black">
          {sortEvents(course.events).map((event) => (
            <div
              key={event.id}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_180px_120px]"
            >
              <div className="min-w-0">
                <h3 className="m-0 truncate text-sm font-black text-black">
                  {event.title}
                </h3>
                <p className="m-0 mt-1 text-xs font-bold text-zinc-600">
                  {event.location || "No location"}
                </p>
              </div>
              <p className="m-0 text-sm font-bold text-orange-700">
                {formatDateTime(event.start)}
              </p>
              <span className={softPill}>{event.type}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
