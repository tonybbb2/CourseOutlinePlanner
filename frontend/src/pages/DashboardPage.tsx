import { useEffect, useState } from "react";
import type { AppPageProps } from "../App";
import { listCourses, type BackendCourse } from "../api";
import { AppShell } from "../components/AppShell";
import { ghostButton, pill, primaryButton, softPill } from "../ui";

function courseLabel(course: BackendCourse) {
  return course.code || course.name || "Untitled course";
}

export function DashboardPage(props: AppPageProps) {
  const [courses, setCourses] = useState<BackendCourse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCourses(await listCourses());
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? "Could not load courses");
      }
    })();
  }, [props.coursesVersion]);

  const totalEvents = courses.reduce((sum, course) => sum + course.events.length, 0);
  const reviewedCourses = courses.filter((course) => course.reviewed).length;

  return (
    <AppShell navigate={props.navigate} planStatus={props.planStatus}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-orange-600">
            Dashboard
          </p>
          <h1 className="m-0 mt-1 text-4xl font-black tracking-tight text-black">
            Semester workspace
          </h1>
        </div>
        <button
          type="button"
          className={primaryButton}
          onClick={() => props.navigate("/upload")}
        >
          Upload syllabus
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="ai-panel rounded-2xl p-5">
          <p className="m-0 text-sm font-black uppercase tracking-[0.12em] text-orange-600">Courses</p>
          <p className="m-0 mt-2 text-5xl font-black text-black">{courses.length}</p>
        </div>
        <div className="ai-panel rounded-2xl p-5">
          <p className="m-0 text-sm font-black uppercase tracking-[0.12em] text-orange-600">Detected events</p>
          <p className="m-0 mt-2 text-5xl font-black text-black">{totalEvents}</p>
        </div>
        <div className="ai-panel rounded-2xl p-5">
          <p className="m-0 text-sm font-black uppercase tracking-[0.12em] text-orange-600">Reviewed courses</p>
          <p className="m-0 mt-2 text-5xl font-black text-black">{reviewedCourses}</p>
        </div>
      </section>

      <section className="ai-panel mt-6 overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black px-5 py-4">
          <h2 className="m-0 text-xl font-black text-black">Courses</h2>
          <span className={pill}>{props.authStatus.connected ? "Calendar connected" : "Calendar not connected"}</span>
        </div>

        {error && <p className="px-5 py-4 text-sm font-bold text-orange-700">{error}</p>}

        {!courses.length && !error ? (
          <div className="px-5 py-8 text-sm font-bold text-zinc-700">
            No courses yet. Upload a syllabus to start building your semester.
          </div>
        ) : (
          <div className="divide-y-[3px] divide-black">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <h3 className="m-0 text-base font-black text-black">
                    {courseLabel(course)}
                  </h3>
                  <p className="m-0 mt-1 text-sm font-bold text-zinc-600">
                    {course.term || "No term detected"} - {course.events.length} events
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={softPill}>
                    {course.reviewed ? "Reviewed" : "Needs review"}
                  </span>
                  <span className={softPill}>
                    {course.synced ? "Synced" : "Not synced"}
                  </span>
                  <button
                    type="button"
                    className={ghostButton}
                    onClick={() => props.navigate(`/courses/${course.id}/review`)}
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
