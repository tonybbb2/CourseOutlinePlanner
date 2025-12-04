import { useState, useEffect, type ChangeEvent } from "react";
import {
  uploadSyllabus,
  type BackendCourse,
  type BackendEvent,
  syncCourseToGoogle,
  disconnectGoogle,
  type AuthStatus,
} from "./api";
import { CalendarAssistant } from "./components/CalendarAssistant";
import { ghostButton, pill, primaryButton, softPill, stepPill } from "./ui";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

function EventsTable({ events }: { events: BackendEvent[] }) {
  if (!events.length)
    return (
      <p className="mt-1 text-sm text-gray-500">
        No events were detected in this syllabus. Double-check your PDF and try
        again.
      </p>
    );

  return (
    <div className="mt-2 overflow-hidden rounded-[10px] border border-gray-200 bg-white">
      <table className="w-full border-collapse text-[0.82rem]">
        <thead className="bg-gray-50">
          <tr className="text-left text-gray-600">
            <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
              Title
            </th>
            <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
              Type
            </th>
            <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
              Start
            </th>
            <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
              End
            </th>
            <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
              Location
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, idx) => (
            <tr
              key={ev.id}
              className={`${idx % 2 === 1 ? "bg-gray-50" : ""} transition-colors hover:bg-indigo-50`}
            >
              <td className="px-3 py-2.5">{ev.title}</td>
              <td className="px-3 py-2.5">
                <span className={softPill}>{ev.type}</span>
              </td>
              <td className="px-3 py-2.5">{formatDateTime(ev.start)}</td>
              <td className="px-3 py-2.5">{formatDateTime(ev.end)}</td>
              <td className="px-3 py-2.5">{ev.location ?? ""}</td>
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
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const panelPadding = "px-9 py-8 max-[900px]:px-6 max-[900px]:py-6";
  const cardBase = "mb-4 rounded-[14px] border border-gray-200 px-5 pt-5 pb-6";
  const fileDropClasses =
    "block rounded-xl border border-dashed border-[#cbd5f5] bg-gradient-to-r from-[#eff6ff] to-[#f9fafb] p-4 cursor-pointer transition hover:border-blue-600 hover:shadow-[0_0_0_1px_rgba(37,99,235,0.45)] hover:-translate-y-[1px]";

  const DEMO_CAL_URL =
    "https://calendar.google.com/calendar/embed?src=a01db11882c157a9d7fbd72501759c4580ec8d4de176547a21e7e34036112b39%40group.calendar.google.com&ctz=America%2FToronto";

  const [googleCalendarEmbedUrl, setGoogleCalendarEmbedUrl] =
    useState(DEMO_CAL_URL);

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
              srcCalendar
            )}&ctz=America%2FToronto`
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

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogle();
      setAuthStatus({ connected: false, email: null });
      setGoogleCalendarEmbedUrl(DEMO_CAL_URL);
      setCalendarRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to disconnect from Google", err);
    }
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

    if (!authStatus.connected) {
      setSyncMessage("Please connect your Google Calendar first in Step 3.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      await syncCourseToGoogle(course.id);
      setSyncMessage("Course events synced to Google Calendar!");
      setCalendarRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message ?? String(err ?? "Unknown error");

      if (msg.includes("Not connected to Google")) {
        setSyncMessage(
          "Failed to sync: not connected to Google. Click ƒ?oConnect Google Calendarƒ?? in Step 3 and try again."
        );
      } else {
        setSyncMessage("Failed to sync: " + msg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const totalEvents = course?.events.length ?? 0;
  const classEvents =
    course?.events.filter((e) => e.type.toLowerCase().includes("class"))
      .length ?? 0;
  const examEvents =
    course?.events.filter((e) => e.type.toLowerCase().includes("exam"))
      .length ?? 0;

  const handleConnectGoogle = async () => {
    console.log("[ConnectGoogle] clicked");
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

      window.location.href = data.url;
    } catch (err) {
      console.error("[ConnectGoogle] fetch failed:", err);
      setConnectError(String(err));
    }
  };

  return (
    <div className="flex min-h-screen items-stretch justify-center bg-[radial-gradient(circle_at_top_left,#f1f5ff_0,transparent_45%),radial-gradient(circle_at_bottom_right,#ffe9e9_0,transparent_55%),#f7fafc] px-6 py-10">
      <div className="grid w-full max-w-[1120px] grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.35)] max-[900px]:grid-cols-1">
        {/* LEFT PANEL */}
        <div className={`${panelPadding} bg-white`}>
          <header className="mb-7 flex items-center gap-4">
            <div className="relative h-[68px] w-[68px] shrink-0 rounded-full bg-[url('/CP_logo.png')] bg-cover bg-center bg-no-repeat" />
            <div>
              <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900">
                Course Outline Planner
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Upload a syllabus PDF and turn all your lectures, labs, and
                exams into Google Calendar events in a few clicks.
              </p>
            </div>
          </header>

          {/* STEP 1 ƒ?" UPLOAD */}
          <section className={`${cardBase} bg-gray-50`}>
            <div className="mb-4 flex items-start gap-3">
              <span className={stepPill}>1</span>
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-900">
                  Upload course outline
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Weƒ?Tll parse dates, times, and locations from your PDF. You can
                  review everything before syncing.
                </p>
              </div>
            </div>

            <label className={fileDropClasses}>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl text-white"
                  aria-hidden="true"
                >
                  ÐY""
                </div>
                <div>
                  <p className="m-0 text-base font-medium leading-snug text-slate-900">
                    {selectedFile
                      ? selectedFile.name
                      : "Drop a PDF here or click to browse"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    PDF syllabus ƒ?½ usually provided by your instructor
                  </p>
                </div>
              </div>
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || loading}
                className={primaryButton}
              >
                {loading ? "Processing syllabusƒ?Ý" : "Upload"}
              </button>
              {selectedFile && !loading && !course && (
                <p className="text-xs text-gray-500">
                  Ready when you are. Click <strong>Upload</strong> to continue.
                </p>
              )}
            </div>

            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          </section>

          {/* STEP 2 ƒ?" EVENTS */}
          <section className={`${cardBase} bg-gray-50`}>
            <div className="mb-4 flex items-start gap-3">
              <span className={stepPill}>2</span>
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-900">
                  Review parsed events
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Check that the schedule below matches your course outline
                  before sending it to Google Calendar.
                </p>
              </div>
            </div>

            {course ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-semibold text-gray-900">
                      {course.code ?? "Untitled course"}
                    </p>
                    {course.name && (
                      <p className="mt-[0.1rem] text-sm text-gray-600">
                        {course.name}
                      </p>
                    )}
                    {course.term && (
                      <p className="mt-[0.12rem] text-xs text-gray-500">
                        {course.term}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className={pill}>
                      {totalEvents} event{totalEvents === 1 ? "" : "s"}
                    </span>
                    <span className={softPill}>
                      {classEvents} classes ¶ú {examEvents} exams
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={primaryButton}
                  >
                    {isSyncing ? "Syncingƒ?Ý" : "Sync to Google Calendar"}
                  </button>
                  {syncMessage && (
                    <span className="text-xs text-emerald-700">{syncMessage}</span>
                  )}
                </div>

                <EventsTable events={course.events} />
              </>
            ) : (
              <div className="pt-1">
                <h3 className="mb-1 text-sm font-semibold text-gray-900">
                  No course uploaded yet
                </h3>
                <p className="m-0 text-[0.82rem] text-gray-500">
                  Once you upload a syllabus, all detected lectures, labs, and
                  exams will appear here so you can confirm the details.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT PANEL ƒ?" CALENDAR + CHAT */}
        <aside
          className={`${panelPadding} border-l border-gray-200 bg-gray-50 max-[900px]:border-l-0 max-[900px]:border-t`}
        >
          <div className={`${cardBase} bg-white`}>
            <div className="mb-4 flex items-start gap-3">
              <span className={stepPill}>3</span>
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-900">
                  Google Calendar view
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {authStatus.connected
                    ? "This is your own Google Calendar. Any synced course will appear here alongside your other events."
                    : "We show a demo calendar by default. Connect your Google account to see your real schedule."}
                </p>
              </div>
            </div>

            {authStatus.connected && (
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  className={`${ghostButton} mr-2 px-4 py-2 text-sm`}
                  onClick={handleDisconnectGoogle}
                >
                  Disconnect Google
                </button>
              </div>
            )}

            <div className="relative h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white max-[640px]:h-[460px]">
              <iframe
                key={calendarRefreshKey}
                src={googleCalendarEmbedUrl}
                title="Google Calendar"
                className={`h-full w-full border-0 ${authStatus.connected ? "" : "pointer-events-none blur-[4px]"}`}
                scrolling="no"
              />

              {!authStatus.connected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 px-6 text-center text-white backdrop-blur-sm">
                  <h3 className="text-lg font-semibold">
                    Connect your Google Calendar
                  </h3>
                  <p className="text-sm text-gray-100">
                    Sign in with Google so we can sync your course events to
                    your own calendar and display them here.
                  </p>
                  <button
                    onClick={handleConnectGoogle}
                    className={primaryButton}
                    type="button"
                  >
                    Connect Google Calendar
                  </button>
                  {connectError && (
                    <p className="mt-2 text-sm text-red-200">
                      {connectError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-500">
              {authStatus.connected
                ? "This is your Google Calendar. Any synced course will appear alongside your other events."
                : "We show a demo calendar by default. Connect your Google account to see your real schedule."}
            </p>
          </div>

          {/* Chat assistant lives OUTSIDE the calendar frame so it is always visible */}
          <div className="mt-4">
            <CalendarAssistant />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
