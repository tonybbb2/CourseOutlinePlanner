import { useEffect, useMemo, useState } from "react";
import type { AppPageProps } from "../App";
import {
  deleteCourseEvent,
  getCourse,
  updateCourseEvent,
  updateCourseReview,
  type BackendCourse,
  type BackendEvent,
} from "../api";
import { AppShell } from "../components/AppShell";
import { ghostButton, pill, primaryButton, softButton, softPill } from "../ui";

type Props = AppPageProps & {
  courseId: string;
};

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function emptyEventCount(course: BackendCourse) {
  return course.events.filter((event) => !event.title || !event.start).length;
}

export function CourseReviewPage(props: Props) {
  const [loadedCourse, setLoadedCourse] = useState<BackendCourse | null>(
    props.course?.id === props.courseId ? props.course : null
  );
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await getCourse(props.courseId);
        setLoadedCourse(result);
        props.setCourse(result);
        setPageError(null);
      } catch (err: any) {
        setPageError(err?.message ?? "Course not found");
      }
    })();
  }, [props.courseId, props.coursesVersion]);

  const stats = useMemo(() => {
    const events = loadedCourse?.events ?? [];
    return {
      total: events.length,
      classes: events.filter((event) =>
        event.type.toLowerCase().includes("class")
      ).length,
      exams: events.filter((event) =>
        event.type.toLowerCase().includes("exam")
      ).length,
    };
  }, [loadedCourse]);

  const patchEvent = async (event: BackendEvent, updates: Partial<BackendEvent>) => {
    if (!loadedCourse) return;
    setSavingEventId(event.id);
    setPageError(null);

    try {
      const updated = await updateCourseEvent(loadedCourse.id, event.id, updates);
      const nextCourse = {
        ...loadedCourse,
        reviewed: false,
        events: loadedCourse.events.map((item) =>
          item.id === updated.id ? updated : item
        ),
      };
      setLoadedCourse(nextCourse);
      props.setCourse(nextCourse);
    } catch (err: any) {
      setPageError(err?.message ?? "Could not update event");
    } finally {
      setSavingEventId(null);
    }
  };

  const removeEvent = async (event: BackendEvent) => {
    if (!loadedCourse) return;
    setSavingEventId(event.id);
    setPageError(null);

    try {
      await deleteCourseEvent(loadedCourse.id, event.id);
      const nextCourse = {
        ...loadedCourse,
        reviewed: false,
        events: loadedCourse.events.filter((item) => item.id !== event.id),
      };
      setLoadedCourse(nextCourse);
      props.setCourse(nextCourse);
    } catch (err: any) {
      setPageError(err?.message ?? "Could not remove event");
    } finally {
      setSavingEventId(null);
    }
  };

  const markReviewed = async () => {
    if (!loadedCourse) return;
    try {
      const nextCourse = await updateCourseReview(loadedCourse.id, true);
      setLoadedCourse(nextCourse);
      props.setCourse(nextCourse);
    } catch (err: any) {
      setPageError(err?.message ?? "Could not mark reviewed");
    }
  };

  return (
    <AppShell navigate={props.navigate} planStatus={props.planStatus}>
      {pageError && (
        <div className="mb-4 rounded-2xl border-[3px] border-black bg-orange-100 px-4 py-3 text-sm font-bold text-orange-700 shadow-[5px_5px_0_#111111]">
          {pageError}
        </div>
      )}

      {!loadedCourse ? (
        <div className="ai-panel rounded-2xl p-6 text-sm font-bold text-zinc-700">
          Loading course review...
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                Review
              </p>
              <h1 className="m-0 mt-1 text-4xl font-black tracking-tight text-black">
                {loadedCourse.code || loadedCourse.name || "Untitled course"}
              </h1>
              <p className="mt-2 text-sm font-bold text-zinc-700">
                Confirm extracted events before syncing to your real calendar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={pill}>{stats.total} events</span>
              <span className={softPill}>
                {stats.classes} classes - {stats.exams} exams
              </span>
              <span className={softPill}>
                {emptyEventCount(loadedCourse)} warnings
              </span>
            </div>
          </div>

          <section className="ai-panel overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black px-5 py-4">
              <div>
                <h2 className="m-0 text-xl font-black text-black">Parsed events</h2>
                <p className="m-0 mt-1 text-sm font-bold text-zinc-600">
                  Edit fields inline. Changes reset the review status.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={softButton} onClick={markReviewed}>
                  Mark reviewed
                </button>
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => props.handleSync(loadedCourse)}
                  disabled={props.isSyncing || !loadedCourse.reviewed}
                  title={
                    loadedCourse.reviewed
                      ? "Sync to Google Calendar"
                      : "Mark reviewed before syncing"
                  }
                >
                  {props.isSyncing ? "Syncing..." : "Sync approved events"}
                </button>
              </div>
            </div>

            {props.syncMessage && (
              <div className="border-b-[3px] border-black bg-orange-100 px-5 py-3 text-sm font-bold text-orange-700">
                {props.syncMessage}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-sm">
                <thead className="bg-black text-left text-white">
                  <tr>
                    <th className="border-b-[3px] border-black px-3 py-2 font-black">Title</th>
                    <th className="border-b-[3px] border-black px-3 py-2 font-black">Type</th>
                    <th className="border-b-[3px] border-black px-3 py-2 font-black">Start</th>
                    <th className="border-b-[3px] border-black px-3 py-2 font-black">End</th>
                    <th className="border-b-[3px] border-black px-3 py-2 font-black">Location</th>
                    <th className="border-b-[3px] border-black px-3 py-2 font-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadedCourse.events.map((event, idx) => (
                    <tr
                      key={event.id}
                      className={idx % 2 === 1 ? "bg-orange-50" : "bg-white"}
                    >
                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded-lg border-2 border-black bg-white px-2 py-1 font-bold text-black outline-none focus:border-orange-500"
                          defaultValue={event.title}
                          onBlur={(e) =>
                            e.target.value !== event.title &&
                            patchEvent(event, { title: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="w-full rounded-lg border-2 border-black bg-white px-2 py-1 font-bold text-black outline-none focus:border-orange-500"
                          value={event.type}
                          onChange={(e) =>
                            patchEvent(event, { type: e.target.value })
                          }
                        >
                          <option value="class">Class</option>
                          <option value="lecture">Lecture</option>
                          <option value="lab">Lab</option>
                          <option value="tutorial">Tutorial</option>
                          <option value="assignment_due">Assignment due</option>
                          <option value="midterm">Midterm</option>
                          <option value="final">Final</option>
                          <option value="other">Other</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="datetime-local"
                          className="w-full rounded-lg border-2 border-black bg-white px-2 py-1 font-bold text-black outline-none focus:border-orange-500"
                          value={toLocalInputValue(event.start)}
                          onChange={(e) =>
                            patchEvent(event, {
                              start: fromLocalInputValue(e.target.value) ?? event.start,
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="datetime-local"
                          className="w-full rounded-lg border-2 border-black bg-white px-2 py-1 font-bold text-black outline-none focus:border-orange-500"
                          value={toLocalInputValue(event.end)}
                          onChange={(e) =>
                            patchEvent(event, {
                              end: fromLocalInputValue(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded-lg border-2 border-black bg-white px-2 py-1 font-bold text-black outline-none focus:border-orange-500"
                          defaultValue={event.location ?? ""}
                          onBlur={(e) =>
                            e.target.value !== (event.location ?? "") &&
                            patchEvent(event, { location: e.target.value || null })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className={ghostButton}
                          onClick={() => removeEvent(event)}
                          disabled={savingEventId === event.id}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
