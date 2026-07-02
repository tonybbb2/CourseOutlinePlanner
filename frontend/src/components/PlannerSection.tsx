import type { ChangeEvent } from "react";
import type { AuthStatus, BackendCourse } from "../api";
import { EventsTable } from "./EventsTable";
import { CalendarAssistant } from "./CalendarAssistant";
import { ghostButton, pill, primaryButton, softPill, stepPill } from "../ui";

type Props = {
  selectedFiles: File[];
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeFile: (idx: number) => void;
  handleUpload: () => void;
  loading: boolean;
  error: string | null;
  course: BackendCourse | null;
  totalEvents: number;
  classEvents: number;
  examEvents: number;
  handleSync: () => void;
  isSyncing: boolean;
  syncMessage: string | null;
  authStatus: AuthStatus;
  handleDisconnectGoogle: () => void;
  handleConnectGoogle: () => void;
  connectError: string | null;
  googleCalendarEmbedUrl: string;
  calendarRefreshKey: number;
};

export function PlannerSection({
  selectedFiles,
  handleFileChange,
  removeFile,
  handleUpload,
  loading,
  error,
  course,
  totalEvents,
  classEvents,
  examEvents,
  handleSync,
  isSyncing,
  syncMessage,
  authStatus,
  handleDisconnectGoogle,
  handleConnectGoogle,
  connectError,
  googleCalendarEmbedUrl,
  calendarRefreshKey,
}: Props) {
  const panelPadding =
    "px-9 py-8 max-[900px]:px-6 max-[900px]:py-6 max-[640px]:px-4 max-[640px]:py-5";
  const cardBase =
    "mb-4 rounded-[14px] border border-gray-200 px-5 pt-5 pb-6 max-[640px]:px-4 max-[640px]:pb-5";
  const fileDropClasses =
    "block rounded-xl border border-dashed border-[#f4b184] bg-gradient-to-r from-[#fff7ed] to-[#fff1e6] p-4 max-[640px]:p-3 cursor-pointer transition hover:border-orange-500 hover:shadow-[0_0_0_1px_rgba(249,115,22,0.4)] hover:-translate-y-[1px]";

  return (
    <section id="planner" className="px-4 py-12 sm:px-6 lg:py-16">
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
              Upload a PDF, review parsed events, and push to Google or Outlook.
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
                    We will parse dates, times, and locations from your PDF. You
                    can review everything before syncing.
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
                    dY",
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
                      PDF syllabi - usually provided by your instructor. Up to 2
                      at a time.
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
                        A-
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
                    Ready when you are. Click <strong>Upload</strong> to continue.
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
                        {classEvents} classes Aú {examEvents} exams
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

              <div className="relative h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white max-[640px]:h-[460px] max-[480px]:h-[380px]">
                <iframe
                  key={calendarRefreshKey}
                  src={googleCalendarEmbedUrl}
                  title="Google Calendar"
                  className={`h-full w-full border-0 ${
                    authStatus.connected ? "" : "pointer-events-none blur-[4px]"
                  }`}
                  scrolling="no"
                />

                {!authStatus.connected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 px-6 text-center text-white backdrop-blur-sm">
                    <h3 className="text-lg font-semibold">Connect your calendar</h3>
                    <p className="text-sm text-gray-100">
                      Sign in with Google or Outlook so we can sync your course
                      events and display them here.
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
                      <p className="mt-2 text-sm text-red-200">{connectError}</p>
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
  );
}
