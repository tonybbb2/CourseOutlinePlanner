import { useEffect, useState, type ChangeEvent } from "react";
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
              className={`${
                idx % 2 === 1 ? "bg-gray-50" : ""
              } transition-colors hover:bg-orange-50`}
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [course, setCourse] = useState<BackendCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    connected: false,
  });
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  const panelPadding = "px-9 py-8 max-[900px]:px-6 max-[900px]:py-6";
  const cardBase = "mb-4 rounded-[14px] border border-gray-200 px-5 pt-5 pb-6";
  const fileDropClasses =
    "block rounded-xl border border-dashed border-[#f4b184] bg-gradient-to-r from-[#fff7ed] to-[#fff1e6] p-4 cursor-pointer transition hover:border-orange-500 hover:shadow-[0_0_0_1px_rgba(249,115,22,0.4)] hover:-translate-y-[1px]";

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
      } catch {
        setAuthStatus({ connected: false });
        setGoogleCalendarEmbedUrl(DEMO_CAL_URL);
      }
    })();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;

    setSelectedFiles((prev) => {
      const merged = [...prev, ...incoming];
      const limited = merged.slice(0, 2);

      if (merged.length > 2) {
        setError("You can upload up to 2 PDFs; extra files were ignored.");
      } else {
        setError(null);
      }

      return limited;
    });

    setCourse(null);
    setSyncMessage(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogle();
      setAuthStatus({ connected: false, email: null });
      setGoogleCalendarEmbedUrl(DEMO_CAL_URL);
      setCalendarRefreshKey((prev) => prev + 1);
    } catch {
      // ignore
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || loading) return;

    setLoading(true);
    setError(null);
    setSyncMessage(null);

    try {
      // For now we process the first PDF; backend multi-upload can be added later.
      const result = await uploadSyllabus(selectedFiles[0]);
      setCourse(result);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
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
      const msg = err?.message ?? String(err ?? "Unknown error");
      setSyncMessage("Failed to sync: " + msg);
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
    setConnectError(null);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/google/url`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        setConnectError(`Backend error: ${text}`);
        return;
      }

      const data = await res.json();
      if (!data.url) {
        setConnectError("No auth URL returned from server.");
        return;
      }

      window.location.href = data.url;
    } catch (err: any) {
      setConnectError(String(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#f7fafc] text-slate-900">
      <style>
        {`
          @keyframes floatYou {
            0% { transform: translateX(8px); }
            50% { transform: translateX(-8px); }
            100% { transform: translateX(8px); }
          }
          @keyframes floatAiTag {
            0% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0); }
          }
        `}
      </style>
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-[#fff4e9] to-[#ffe3c7] pb-24">
        <div className="morph-blob morph-blob--sunset" aria-hidden="true" />

        <div className="relative mx-auto px-6 py-4 lg:py-8">
          <header className="flex items-center justify-between gap-4 rounded-full bg-white/70 px-16 py-2 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="h-11 w-11 rounded-full bg-[url('/SS_logo.png')] bg-cover bg-center bg-no-repeat shadow-lg ring-4 ring-white/70" />
              <div>
                <p className="m-0 text-2xl font-semibold text-black">
                  SemesterSync{" "}
                  <span className="text-xs text-gray-400">[TOOL]</span>
                </p>
              </div>
            </div>
            <div className="gap-2">
              <button className={`${ghostButton} border border-gray-700`}>
                Log in
              </button>
              <button className="inline-flex items-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px]">
                Sign up ↗
              </button>
            </div>
          </header>

            <div className="w-full py-12 flex flex-col items-center text-center mt-20 p-36 gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-7">
                <div className="text-center inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-700 shadow-sm backdrop-blur">
                  AI semester co-pilot
                </div>
                <h1 className="m-0 text-4xl font-extrabold leading-tight text-slate-900 sm:text-6xl text-center">
                  Plan your semester in
                  <br />
                  <span className="underline">one</span> click
                </h1>
                <p className="m-0 max-w-xl text-md text-slate-600 mx-auto text-center">
                  Auto-sync syllabi to calendars.
                </p>
              {/* <div className="flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)] transition hover:-translate-y-[1px]"
                  onClick={() =>
                    document
                      .querySelector("#planner")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Start planning now →
                </button>
                <button
                  className="inline-flex items-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
                  onClick={() =>
                    document
                      .querySelector("#planner")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  How it works
                </button>
              </div> */}
              {/* <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl bg-white/80 p-3 shadow-sm backdrop-blur">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                    📄
                  </div>
                  <div>
                    <p className="m-0 text-sm font-semibold text-slate-900">Auto-parse PDFs</p>
                    <p className="m-0 text-xs text-gray-600">Dates, times, rooms—captured for you.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/80 p-3 shadow-sm backdrop-blur">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                    🔄
                  </div>
                  <div>
                    <p className="m-0 text-sm font-semibold text-slate-900">One-click sync</p>
                    <p className="m-0 text-xs text-gray-600">Push to Google & Outlook instantly.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/80 p-3 shadow-sm backdrop-blur sm:col-span-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white">
                    🤝
                  </div>
                  <div>
                    <p className="m-0 text-sm font-semibold text-slate-900">Shareable schedule</p>
                    <p className="m-0 text-xs text-gray-600">Export and share with group projects or TAs.</p>
                  </div>
                </div>
              </div> */}
            </div>

            <div className="relative w-2/3 max-w-[660px]">
              <div className="absolute -top-4 -left-6 h-20 w-20 rounded-full border border-orange-200/70 bg-white/60 backdrop-blur" />
              <div className="absolute -bottom-8 -right-10 h-24 w-24 rounded-full border border-orange-200/70 bg-white/60 backdrop-blur" />
              <div className="relative flex flex-col rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur-lg">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="m-0 mt-1 text-sm text-gray-600">
                      Drag your course outline here and we will detect lectures,
                      exams, and labs automatically.
                    </p>
                  </div>
                </div>

                <label className="group mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-gradient-to-r from-white to-[#fff7ed] px-6 py-6 text-center transition hover:border-orange-400 hover:shadow-[0_12px_30px_rgba(249,115,22,0.15)]">
                  <input
                    id="hero-upload"
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="h-11 w-11  bg-[url('/SS_logo.png')] bg-cover bg-center bg-no-repeat " />
                  <p className="mt-3 text-base font-semibold leading-snug text-slate-900">
                    {selectedFiles.length === 0
                      ? "Drop PDFs or click to browse (max 2)"
                      : selectedFiles.length === 1
                      ? selectedFiles[0].name
                      : `${selectedFiles.length} PDFs selected`}
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("hero-upload")?.click();
                      }}
                      className={`${primaryButton} px-4 py-2 text-sm`}
                    >
                      Choose files
                    </button>
                  </div>
                  {selectedFiles.length === 0 ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                        Drag & drop
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                        PDF syllabus
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                        Auto parsing
                      </span>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">
                      Manage your PDFs below
                    </p>
                  )}
                </label>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={file.name + file.lastModified}
                        className="group relative flex items-center gap-3 rounded-xl border border-orange-100 bg-white px-3 py-2 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                      >
                        <div className="flex h-12 w-10 items-center justify-center rounded-md bg-orange-100 text-[0.75rem] font-semibold uppercase text-orange-700">
                          PDF
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="m-0 truncate text-sm font-semibold text-slate-900"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="m-0 text-[0.72rem] text-gray-500">
                            PDF file
                          </p>
                        </div>
                        <button
                          type="button"
                          className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-gray-500 shadow ring-1 ring-gray-200 transition hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeFile(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 text-center">
                  <p className="m-0 text-xs text-center text-gray-500">
                    Secure upload. We extract your schedule in seconds so you
                    can review before syncing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-9 right-8 flex flex-col items-end gap-2 max-w-[260px] text-slate-900 max-[700px]:hidden">
          <div className="relative flex items-center gap-3 pr-2">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-[#f6fcf5] shadow-[0_14px_45px_rgba(15,23,42,0.15)]">
              <p className="m-0 text-center text-sm leading-snug text-gray-700">
                Drop
                <br />
                course file
              </p>
            </div>
            <div
              className="relative flex items-center"
              style={{ animation: "floatYou 4.8s ease-in-out infinite" }}
            >
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md">
                You
              </span>
              <span className="absolute -left-3 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 rounded-[3px] bg-slate-700 shadow-sm" />
            </div>
          </div>
          <div className="mr-[66px] h-10 w-px border-r border-dashed border-slate-300 opacity-80" />
          <div className="flex w-[260px] flex-col rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_14px_45px_rgba(15,23,42,0.18)] backdrop-blur">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-600">
              <span>Calendar Sync</span>
              <span className="text-base leading-none text-slate-400">⌄</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
              <div className="h-full w-[95%] rounded-full bg-orange-400 shadow-[0_4px_10px_rgba(249,115,22,0.45)]" />
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-96 bottom-10 flex flex-col items-start gap-2 max-w-[240px] text-slate-900 max-[700px]:hidden">
          <div className="relative flex items-start gap-2 pl-2">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-[#f6fcf5] shadow-[0_14px_45px_rgba(15,23,42,0.15)]">
              <p className="m-0 text-center text-sm leading-snug text-gray-700">
                Auto
                <br />
                calendar
              </p>
            </div>
            <div
              className="absolute left-[88px] -bottom-2 flex items-center"
              style={{ animation: "floatAiTag 4.4s ease-in-out infinite" }}
            >
              <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md">
                AI
              </span>
              <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rotate-45 rounded-[3px] bg-orange-400 shadow-sm" />
            </div>
          </div>
          <div className="ml-[58px] h-8 w-px border-r border-dashed border-slate-300 opacity-80" />
          <div className="flex w-[220px] flex-col rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_14px_45px_rgba(15,23,42,0.18)] backdrop-blur">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-600">
              <span>calendar</span>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 rounded-lg border border-slate-100 bg-slate-50 p-1.5">
              {[...Array(10)].map((_, idx) => (
                <span
                  key={idx}
                  className="h-5 rounded-[6px] bg-slate-200/80"
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="planner" className="px-6 py-12 lg:py-16">
        <div className="mx-auto max-w-[1150px]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                Live demo
              </p>
              <h2 className="m-0 text-2xl font-semibold text-slate-900">
                Turn a syllabus into a synced calendar
              </h2>
              <p className="m-0 mt-1 text-sm text-gray-600">
                Upload a PDF, review parsed events, and push to Google or
                Outlook.
              </p>
            </div>
            <button
              className={`${ghostButton} border border-gray-300`}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Back to top
            </button>
          </div>

          <div className="grid w-full max-w-[1120px] grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.2)] max-[900px]:grid-cols-1">
            <div className={`${panelPadding} bg-white`}>
              <header className="mb-7 flex items-center gap-4">
                <div className="relative h-[60px] w-[60px] shrink-0 rounded-full bg-[url('/SS_logo.png')] bg-cover bg-center bg-no-repeat" />
                <div>
                  <h3 className="m-0 text-xl font-semibold tracking-tight text-slate-900">
                    Upload & review
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Drag in your syllabus and confirm the detected schedule.
                  </p>
                </div>
              </header>

              <section className={`${cardBase} bg-gray-50`}>
                <div className="mb-4 flex items-start gap-3">
                  <span className={stepPill}>1</span>
                  <div>
                    <h4 className="m-0 text-base font-semibold text-slate-900">
                      Upload course outline
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      We will parse dates, times, and locations from your PDF.
                      You can review everything before syncing.
                    </p>
                  </div>
                </div>

                <label className={fileDropClasses}>
                  <input
                    id="planner-upload"
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl text-white"
                      aria-hidden="true"
                    >
                      📄
                    </div>
                    <div>
                      <p className="m-0 text-base font-medium leading-snug text-slate-900">
                        {selectedFiles.length === 0
                          ? "Drop PDFs here or click to browse (max 2)"
                          : selectedFiles.length === 1
                          ? selectedFiles[0].name
                          : `${selectedFiles.length} PDFs selected`}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        PDF syllabi - usually provided by your instructor. Up to
                        2 at a time.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById("planner-upload")?.click();
                        }}
                        className={`${primaryButton} mt-2 px-4 py-2 text-sm`}
                      >
                        Choose files
                      </button>
                    </div>
                  </div>
                </label>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={file.name + file.lastModified}
                        className="group relative flex items-center gap-3 rounded-xl border border-orange-100 bg-white px-3 py-2 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                      >
                        <div className="flex h-12 w-10 items-center justify-center rounded-md bg-orange-100 text-[0.75rem] font-semibold uppercase text-orange-700">
                          PDF
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="m-0 truncate text-sm font-semibold text-slate-900"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="m-0 text-[0.72rem] text-gray-500">
                            PDF file
                          </p>
                        </div>
                        <button
                          type="button"
                          className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-gray-500 shadow ring-1 ring-gray-200 transition hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeFile(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFiles.length || loading}
                    className={primaryButton}
                  >
                    {loading ? "Processing syllabus..." : "Upload"}
                  </button>
                  {selectedFiles.length > 0 && !loading && !course && (
                    <p className="text-xs text-gray-500">
                      Ready when you are. Click <strong>Upload</strong> to
                      continue.
                    </p>
                  )}
                  {selectedFiles.length > 1 && (
                    <p className="text-[0.78rem] text-gray-500">
                      We will upload the first file for now; full multi-file
                      processing is coming soon.
                    </p>
                  )}
                </div>

                {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
              </section>

              <section className={`${cardBase} bg-gray-50`}>
                <div className="mb-4 flex items-start gap-3">
                  <span className={stepPill}>2</span>
                  <div>
                    <h4 className="m-0 text-base font-semibold text-slate-900">
                      Review parsed events
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Check that the schedule below matches your course outline
                      before sending it to Google or Outlook.
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
                          {classEvents} classes · {examEvents} exams
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={primaryButton}
                      >
                        {isSyncing ? "Syncing..." : "Sync to Google Calendar"}
                      </button>
                      {syncMessage && (
                        <span className="text-xs text-emerald-700">
                          {syncMessage}
                        </span>
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
                      Once you upload a syllabus, all detected lectures, labs,
                      and exams will appear here so you can confirm the details.
                    </p>
                  </div>
                )}
              </section>
            </div>

            <aside
              id="sync"
              className={`${panelPadding} border-l border-gray-200 bg-gray-50 max-[900px]:border-l-0 max-[900px]:border-t`}
            >
              <div className={`${cardBase} bg-white`}>
                <div className="mb-4 flex items-start gap-3">
                  <span className={stepPill}>3</span>
                  <div>
                    <h4 className="m-0 text-base font-semibold text-slate-900">
                      Calendar view & sync
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {authStatus.connected
                        ? "This is your own Google Calendar. Any synced course will appear here alongside your other events."
                        : "Connect Google or Outlook to see your real schedule and add course events in one click."}
                    </p>
                  </div>
                </div>

                {authStatus.connected && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${ghostButton} px-4 py-2 text-sm`}
                      onClick={handleDisconnectGoogle}
                    >
                      Disconnect Google
                    </button>
                    <span className={pill}>Google connected</span>
                  </div>
                )}

                <div className="relative h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white max-[640px]:h-[460px]">
                  <iframe
                    key={calendarRefreshKey}
                    src={googleCalendarEmbedUrl}
                    title="Google Calendar"
                    className={`h-full w-full border-0 ${
                      authStatus.connected
                        ? ""
                        : "pointer-events-none blur-[4px]"
                    }`}
                    scrolling="no"
                  />

                  {!authStatus.connected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 px-6 text-center text-white backdrop-blur-sm">
                      <h3 className="text-lg font-semibold">
                        Connect your calendar
                      </h3>
                      <p className="text-sm text-gray-100">
                        Sign in with Google or Outlook so we can sync your
                        course events and display them here.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleConnectGoogle}
                          className={primaryButton}
                          type="button"
                        >
                          Connect Google
                        </button>
                        <button
                          className={`${ghostButton} border border-gray-300 px-4 py-2 text-sm`}
                        >
                          Connect Outlook
                        </button>
                      </div>
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
                    : "We show a demo calendar by default. Connect Google or Outlook to see your real schedule."}
                </p>
              </div>

              <div className="mt-4">
                <CalendarAssistant />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
