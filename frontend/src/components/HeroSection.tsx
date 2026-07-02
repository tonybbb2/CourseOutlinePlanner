import type { ChangeEvent } from "react";
import { LiaLocationArrowSolid } from "react-icons/lia";
import { FaGoogle, FaRegCalendarAlt } from "react-icons/fa";
import { primaryButton } from "../ui";

type HeroProps = {
  selectedFiles: File[];
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeFile: (idx: number) => void;
  handleUpload: () => void;
  loading: boolean;
};

export function HeroSection({
  selectedFiles,
  handleFileChange,
  removeFile,
  handleUpload,
  loading,
}: HeroProps) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-[#fff4e9] to-[#ffe3c7] pb-24">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="h-[72vw] max-h-[1100px] w-[72vw] max-w-[1100px] rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.32),rgba(249,115,22,0)_65%)] blur-3xl"
          style={{ animation: "pulseGlow 12s ease-in-out infinite" }}
        />
      </div>
      <div className="morph-blob morph-blob--sunset" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
        <header className="flex flex-nowrap items-center justify-between gap-2 rounded-full bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur sm:gap-3 sm:px-5 lg:px-9">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-[url('/SS_logo.png')] bg-cover bg-center bg-no-repeat shadow-lg ring-3 ring-white/70 sm:h-11 sm:w-11 sm:ring-4" />
            <div>
              <p className="m-0 text-xl font-semibold text-black sm:text-2xl whitespace-nowrap">
                SemesterSync{" "}
                <span className="text-xs text-gray-400">[TOOL]</span>
              </p>
            </div>
          </div>
          <div className="gap-4">
            <button
              className="inline-flex items-center rounded-full bg-black px-3.5 py-2 text-xs font-semibold text-white transition hover:-translate-y-[1px] sm:px-4 sm:text-sm whitespace-nowrap"
              onClick={() => (window.location.href = "/signup")}
            >
              Start now
            </button>
          </div>
        </header>

        <div className="mt-14 flex w-full flex-col items-center justify-center gap-10 text-center sm:mt-16 sm:gap-12">
          <div className="relative space-y-7 px-1 sm:max-w-2xl sm:px-0">
            <div className="pointer-events-none absolute -inset-14 -z-10 rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.28),rgba(249,115,22,0.08),rgba(249,115,22,0))] blur-3xl opacity-80 animate-[pulseGlow_14s_ease-in-out_infinite]" />
            <div className="text-center inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-700 shadow-sm backdrop-blur">
              Semester co-pilot
            </div>
            <h1 className="m-0 text-4xl tracking-tight font-extrabold text-slate-900 text-center sm:text-6xl">
              Plan your semester in
              <br />
              <span className="underline">one</span> click
            </h1>
            <p className="max-w-xl text-lg text-slate-600 mx-auto text-center">
              Auto-sync syllabi to calendars with AI
            </p>
          </div>

          <div className="relative w-full max-w-[760px] sm:max-w-[700px]">
            <div className="absolute -top-4 -left-6 hidden h-20 w-20 rounded-full border border-orange-200/70 bg-white/60 backdrop-blur xl:block" />
            <div className="absolute -bottom-8 -right-10 hidden h-24 w-24 rounded-full border border-orange-200/70 bg-white/60 backdrop-blur xl:block" />
            <div className="relative flex flex-col rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur-lg">
              <div className="flex items-start gap-3">
                <div>
                  <p className="m-0 text-center text-xs text-gray-600">
                    Drag your course outline here and we will detect lectures,
                    exams, and labs automatically.
                  </p>
                </div>
              </div>

              <label className="group mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-gradient-to-r from-white to-[#fff7ed] px-4 py-5 text-center transition hover:border-orange-400 hover:shadow-[0_12px_30px_rgba(249,115,22,0.15)] sm:px-6 sm:py-6">
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
                    className="inline-flex items-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px]"
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
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={file.name + file.lastModified}
                        className="group relative flex min-w-[170px] items-center gap-2 rounded-xl border border-orange-100 bg-white px-3 py-2 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                      >
                        <div className="flex h-10 w-8 items-center justify-center rounded-md bg-orange-100 text-[0.75rem] font-semibold uppercase text-orange-700">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p
                            className="m-0 truncate text-[0.9rem] font-semibold text-slate-900"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="m-0 text-[0.72rem] text-gray-500">PDF</p>
                        </div>
                        <button
                          type="button"
                          className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[0.78rem] font-bold text-gray-500 shadow ring-1 ring-gray-200 transition hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeFile(idx)}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!selectedFiles.length || loading}
                  className={`${primaryButton} inline-flex h-11 w-11 items-center justify-center rounded-[12px] text-xl font-semibold shadow-[0_10px_30px_rgba(249,115,22,0.25)] transition hover:-translate-y-[1px] hover:shadow-[0_12px_34px_rgba(249,115,22,0.3)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none`}
                  aria-label="Upload syllabus"
                  title={loading ? "Processing syllabus..." : "Upload syllabus"}
                >
                  {loading ? (
                    <span className="text-sm leading-none">...</span>
                  ) : (
                    <span className="leading-none">⇪</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute flex flex-col items-end gap-2 max-w-[260px] text-slate-900 max-[1200px]:hidden"
          style={{ top: "35%", right: "90%", transform: "translateY(-50%)" }}
        >
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
              <LiaLocationArrowSolid
                className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-slate-700 drop-shadow-sm"
                size={14}
                aria-hidden
              />
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md">
                You
              </span>
            </div>
          </div>
          <div className="mr-[66px] h-10 -translate-x-[3rem]  w-px border-r border-dashed border-slate-600 opacity-80 rotate-[35deg] origin-center" />

          <div className="flex w-[200px] flex-col rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_14px_45px_rgba(15,23,42,0.18)] backdrop-blur">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-600">
              <span>Semester plan</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
              <div className="h-full w-[95%] rounded-full bg-orange-400 shadow-[0_4px_10px_rgba(249,115,22,0.45)]" />
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute flex flex-col items-start gap-2 max-w-[200px] text-slate-900 max-[1200px]:hidden"
          style={{ top: "75%", left: "90%", transform: "translateY(-50%)" }}
        >
          <div className="relative flex items-start gap-6 pl-2">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-600 bg-[#f6fcf5] shadow-[0_14px_45px_rgba(15,23,42,0.15)]">
              <p className="m-0 text-center text-sm leading-snug text-slate-700">
                Sync
                <br />
                Calendar
              </p>
            </div>
            <div
              className="absolute left-[88px] -bottom-2 flex items-center"
              style={{ animation: "floatAiTag 4.4s ease-in-out infinite" }}
            >
              <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md">
                AI
              </span>
              <LiaLocationArrowSolid
                className="absolute -left-3 -top-3 -rotate-45 text-orange-400 drop-shadow-sm"
                size={14}
                aria-hidden
              />
            </div>
          </div>
          <div className="mr-[66px] h-12 w-px translate-x-[5rem]  -rotate-[35deg] origin-center border-r border-dashed border-slate-600" />
          <div className="flex w-[200px] flex-col rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_14px_45px_rgba(15,23,42,0.18)] backdrop-blur">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
              <span>Calendar</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-[13px] text-slate-600">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-orange-200 shadow-sm">
                  <div
                    className="h-4 w-4 bg-[url('/SS_logo.png')] bg-cover bg-center bg-no-repeat"
                    aria-label="SemesterSync logo"
                  />
                </span>
                <span className="h-2 w-28 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-600">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-red-200 text-[#ea4335] shadow-sm">
                  <FaGoogle size={12} aria-label="Google" />
                </span>
                <span className="h-2 w-28 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-600">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-slate-300 text-[#475569] shadow-sm">
                  <FaRegCalendarAlt size={12} aria-label="Calendar" />
                </span>
                <span className="h-2 w-24 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
