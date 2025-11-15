import { useState, useEffect, type ChangeEvent } from "react";
import {
  uploadSyllabus,
  type BackendCourse,
  type BackendEvent,
  syncCourseToGoogle,
} from "./api";
import "./App.css";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";



function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

function EventsTable({ events }: { events: BackendEvent[] }) {
  if (!events.length)
    return (
      <p className="empty-text">
        No events were detected in this syllabus. Double-check your PDF and try
        again.
      </p>
    );

  return (
    <div className="table-wrapper">
      <table className="events-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Start</th>
            <th>End</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td>{ev.title}</td>
              <td>
                <span className="pill pill--soft">{ev.type}</span>
              </td>
              <td>{formatDateTime(ev.start)}</td>
              <td>{formatDateTime(ev.end)}</td>
              <td>{ev.location ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [course, setCourse] = useState<BackendCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ connected: false });

  const DEMO_CAL_URL =
    "https://calendar.google.com/calendar/embed?src=a01db11882c157a9d7fbd72501759c4580ec8d4de176547a21e7e34036112b39%40group.calendar.google.com&ctz=America%2FToronto";

  const [googleCalendarEmbedUrl, setGoogleCalendarEmbedUrl] = useState(DEMO_CAL_URL);

useEffect(() => {
  (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/status`, {
        credentials: "include",
      });

      const data = (await res.json()) as AuthStatus;
      setAuthStatus(data);

      if (data.connected) {
        const srcCalendar = data.email ?? "primary";
        setGoogleCalendarEmbedUrl(
          `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
            srcCalendar,
          )}&ctz=America%2FToronto`,
        );
      } else {
        setGoogleCalendarEmbedUrl(DEMO_CAL_URL);
      }
    } catch (err) {
      console.error("Failed to load auth status", err);
      setAuthStatus({ connected: false });
      setGoogleCalendarEmbedUrl(DEMO_CAL_URL);
    }
  })();
}, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
    setCourse(null);
    setSyncMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || loading) return;

    setLoading(true);
    setError(null);
    setSyncMessage(null);

    try {
      const result = await uploadSyllabus(selectedFile);
      setCourse(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!course || isSyncing) return;

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      await syncCourseToGoogle(course.id);
      setSyncMessage("Course events synced to Google Calendar.");
    } catch (err: any) {
      console.error(err);
      setSyncMessage(
        "Failed to sync: " + (err?.message ?? String(err ?? "Unknown error")),
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const totalEvents = course?.events.length ?? 0;
  const classEvents =
    course?.events.filter((e) =>
      e.type.toLowerCase().includes("class"),
    ).length ?? 0;
  const examEvents =
    course?.events.filter((e) =>
      e.type.toLowerCase().includes("exam"),
    ).length ?? 0;

const handleConnectGoogle = async () => {
  console.log("[ConnectGoogle] clicked"); // <- check console for this
  setConnectError(null);

  try {
    const res = await fetch(`${BASE_URL}/api/auth/google/url`, {
      method: "GET",
      credentials: "include",
    });

    console.log("[ConnectGoogle] response status:", res.status);

    if (!res.ok) {
      const text = await res.text();
      console.error("[ConnectGoogle] backend error:", text);
      setConnectError(`Backend error: ${text}`);
      return;
    }

    const data = await res.json();
    console.log("[ConnectGoogle] redirecting to:", data.url);

    if (!data.url) {
      setConnectError("No auth URL returned from server.");
      return;
    }

    // jump to Google OAuth consent
    window.location.href = data.url;
  } catch (err) {
    console.error("[ConnectGoogle] fetch failed:", err);
    setConnectError(String(err));
  }
};


  return (
    <div className="app-root">
      <div className="app-layout">
        {/* LEFT PANEL */}
        <div className="app-panel app-panel--left">
          <header className="app-header">
            <div className="app-logo-dot" />
            <div>
              <h1 className="app-title">Course Planner</h1>
              <p className="app-subtitle">
                Upload a syllabus PDF and turn all your lectures, labs, and
                exams into Google Calendar events in a few clicks.
              </p>
            </div>
          </header>

          {/* STEP 1 – UPLOAD */}
          <section className="card">
            <div className="card-header">
              <span className="step-pill">Step 1</span>
              <div>
                <h2 className="section-title">Upload course outline</h2>
                <p className="section-description">
                  We’ll parse dates, times, and locations from your PDF. You can
                  review everything before syncing.
                </p>
              </div>
            </div>

            <label className="file-drop">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="file-input"
              />
              <div className="file-drop-inner">
                <div className="file-drop-icon" aria-hidden="true">
                  📄
                </div>
                <div>
                  <p className="file-drop-title">
                    {selectedFile
                      ? selectedFile.name
                      : "Drop a PDF here or click to browse"}
                  </p>
                  <p className="file-drop-hint">
                    PDF syllabus • usually provided by your instructor
                  </p>
                </div>
              </div>
            </label>

            <div className="card-actions">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || loading}
                className="btn btn--primary"
              >
                {loading ? "Processing syllabus…" : "Upload & Parse"}
              </button>
              {selectedFile && !loading && !course && (
                <p className="inline-hint">
                  Ready when you are. Click{" "}
                  <strong>Upload &amp; Parse</strong> to continue.
                </p>
              )}
            </div>

            {error && <p className="error-text">{error}</p>}
          </section>

          {/* STEP 2 – EVENTS */}
          <section className="card">
            <div className="card-header">
              <span className="step-pill">Step 2</span>
              <div>
                <h2 className="section-title">Review parsed events</h2>
                <p className="section-description">
                  Check that the schedule below matches your course outline
                  before sending it to Google Calendar.
                </p>
              </div>
            </div>

            {course ? (
              <>
                <div className="course-summary">
                  <div>
                    <p className="course-code">
                      {course.code ?? "Untitled course"}
                    </p>
                    {course.name && (
                      <p className="course-name">{course.name}</p>
                    )}
                    {course.term && (
                      <p className="course-term">{course.term}</p>
                    )}
                  </div>
                  <div className="course-metrics">
                    <span className="pill">
                      {totalEvents} event{totalEvents === 1 ? "" : "s"}
                    </span>
                    <span className="pill pill--soft">
                      {classEvents} classes · {examEvents} exams
                    </span>
                  </div>
                </div>

                <div className="card-actions card-actions--justify">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="btn btn--ghost"
                  >
                    {isSyncing ? "Syncing…" : "Sync to Google Calendar"}
                  </button>
                  {syncMessage && (
                    <span className="status-text">{syncMessage}</span>
                  )}
                </div>

                <EventsTable events={course.events} />
              </>
            ) : (
              <div className="empty-state">
                <h3 className="empty-title">No course uploaded yet</h3>
                <p className="empty-body">
                  Once you upload a syllabus, all detected lectures, labs, and
                  exams will appear here so you can confirm the details.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT PANEL – CALENDAR */}
        <aside className="app-panel app-panel--calendar">
          <div className="card card--calendar">
            <div className="card-header">
              <span className="step-pill step-pill--subtle">Step 3</span>
              <div>
                <h2 className="section-title">Google Calendar view</h2>
                <p className="section-description">
                  {authStatus.connected
                    ? "This is your own Google Calendar. Any synced course will appear here alongside your other events."
                    : "We show a demo calendar by default. Connect your Google account to see your real schedule."}
                </p>
              </div>
            </div>

            <div
              className={
                "calendar-frame" +
                (authStatus.connected ? "" : " calendar-frame--blurred")
              }
            >
              <iframe
                src={googleCalendarEmbedUrl}
                title="Google Calendar"
                frameBorder="0"
                scrolling="no"
              />

  {!authStatus.connected && (
    <div className="calendar-overlay">
      <h3>Connect your Google Calendar</h3>
      <p>
        Sign in with Google so we can sync your course events to your own
        calendar and display them here.
      </p>
      <button
        onClick={handleConnectGoogle}
        className="btn btn--primary"
        type="button"
      >
        Connect Google Calendar
      </button>
    </div>
  )}
            </div>

<p className="section-description">
  {authStatus.connected
    ? "This is your Google Calendar. Any synced course will appear alongside your other events."
    : "We show a demo calendar by default. Connect your Google account to see your real schedule."}
</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
