import type { ChangeEvent } from "react";
import { FaArrowRight, FaCalendarAlt, FaFilePdf, FaGoogle } from "react-icons/fa";
import type { Navigate } from "../App";
import { ghostButton, primaryButton, softPill } from "../ui";

type HeroProps = {
  selectedFiles: File[];
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeFile: (idx: number) => void;
  handleUpload: () => void;
  loading: boolean;
  navigate: Navigate;
};

function Glow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden">
      <div className="absolute left-1/2 top-0 h-[320px] w-[62%] -translate-x-1/2 scale-[2.4] rounded-[50%] bg-[radial-gradient(ellipse_at_center,_hsla(var(--brand)/.42)_10%,_hsla(var(--brand)/0)_62%)]" />
      <div className="absolute left-[58%] top-12 h-[220px] w-[42%] -translate-x-1/2 scale-[2] rounded-[50%] bg-[radial-gradient(ellipse_at_center,_hsla(var(--brand-foreground)/.38)_10%,_hsla(var(--brand-foreground)/0)_62%)]" />
    </div>
  );
}

export function HeroSection({
  selectedFiles,
  handleFileChange,
  removeFile,
  handleUpload,
  loading,
  navigate,
}: HeroProps) {
  return (
    <section className="ai-grid relative overflow-hidden bg-white px-4 pb-0 pt-6 text-black sm:px-6">
      <Glow />

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border-[3px] border-black bg-white px-4 py-2 shadow-[8px_8px_0_#111111]">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => navigate("/")}
        >
          <span className="h-10 w-10 rounded-xl bg-[url('/SS_logo.png')] bg-cover bg-center bg-no-repeat ring-[3px] ring-black" />
          <span className="text-lg font-black text-black">SemesterSync</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`${ghostButton} hidden px-4 py-2 sm:inline-flex`}
            onClick={() => navigate("/login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={`${primaryButton} px-4 py-2`}
            onClick={() => navigate("/signup")}
          >
            Sign up
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 pb-10 pt-16 text-center sm:gap-14 sm:pt-24">
        <div className="flex max-w-4xl flex-col items-center gap-6 sm:gap-8">
          <div className="animate-appear inline-flex items-center gap-2 rounded-full border-2 border-black bg-orange-500 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[5px_5px_0_#111111]">
            <span>AI semester planner</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-white underline decoration-white/70"
              onClick={() => navigate("/billing")}
            >
              See Plus
              <FaArrowRight className="h-3 w-3" />
            </button>
          </div>

          <h1 className="animate-appear max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-black opacity-0 drop-shadow-[8px_8px_0_rgba(249,115,22,0.28)] sm:text-7xl md:text-8xl">
            Turn syllabi into a semester calendar
          </h1>

          <p className="delay-100 max-w-[640px] animate-appear text-base font-bold text-zinc-700 opacity-0 sm:text-xl">
            Upload course outlines, review the extracted lectures and deadlines,
            then sync the approved schedule to Google Calendar.
          </p>

          <div className="delay-300 flex animate-appear flex-wrap justify-center gap-3 opacity-0">
            <button
              type="button"
              className={`${primaryButton} gap-2 px-5 py-3`}
              onClick={() => navigate("/upload")}
            >
              Start planning
              <FaArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`${ghostButton} px-5 py-3`}
              onClick={() => navigate("/dashboard")}
            >
              Open dashboard
            </button>
          </div>
        </div>

        <div className="delay-700 relative w-full max-w-5xl animate-appear opacity-0">
          <div className="rounded-[28px] bg-orange-500 p-2 shadow-[14px_14px_0_#111111] ring-[3px] ring-black">
            <div className="overflow-hidden rounded-2xl border-[3px] border-black bg-white shadow-2xl">
              <div className="flex items-center gap-2 border-b-[3px] border-black bg-black px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="h-3 w-3 rounded-full bg-white" />
                <span className="h-3 w-3 rounded-full bg-orange-200" />
                <span className="ml-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                  SemesterSync workspace
                </span>
              </div>

              <div className="grid min-h-[420px] gap-0 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="border-b-[3px] border-black bg-white p-5 text-left lg:border-b-0 lg:border-r-[3px]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                        Upload
                      </p>
                      <h2 className="m-0 mt-1 text-xl font-black text-black">
                        Add your outline
                      </h2>
                    </div>
                    <span className={softPill}>Free: 2 uploads</span>
                  </div>

                  <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-black bg-orange-50 px-4 py-6 text-center transition hover:bg-orange-100 hover:shadow-[6px_6px_0_#111111]">
                    <input
                      type="file"
                      multiple
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <FaFilePdf className="text-3xl text-orange-600" />
                    <p className="m-0 mt-3 text-base font-black text-black">
                      {selectedFiles.length
                        ? `${selectedFiles.length} PDF selected`
                        : "Drop PDFs or click to browse"}
                    </p>
                    <p className="m-0 mt-1 text-sm font-bold text-zinc-600">
                      Review everything before sync.
                    </p>
                  </label>

                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={file.name + file.lastModified}
                          className="flex items-center justify-between gap-3 rounded-xl border-2 border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111111]"
                        >
                          <span className="truncate text-sm font-bold text-black">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            className="text-xs font-black text-orange-600 underline"
                            onClick={() => removeFile(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className={`${primaryButton} mt-4 w-full justify-center rounded-lg py-3`}
                    onClick={handleUpload}
                    disabled={!selectedFiles.length || loading}
                  >
                    {loading ? "Extracting schedule..." : "Extract schedule"}
                  </button>
                </div>

                <div className="bg-black p-5 text-left text-white">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-orange-300">
                        Preview
                      </p>
                      <h2 className="m-0 mt-1 text-xl font-black">
                        Week at a glance
                      </h2>
                    </div>
                    <div className="flex gap-2 text-orange-300">
                      <FaCalendarAlt />
                      <FaGoogle />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {[
                      ["Mon", "COMP 228 Lecture", "9:00 AM", "Class"],
                      ["Wed", "Lab submission", "11:59 PM", "Assignment"],
                      ["Fri", "Midterm review", "2:00 PM", "Study"],
                    ].map(([day, title, time, type]) => (
                      <div
                        key={title}
                        className="grid grid-cols-[52px_minmax(0,1fr)_92px] items-center gap-3 rounded-2xl border-2 border-white bg-zinc-950 px-3 py-3 shadow-[5px_5px_0_rgba(249,115,22,0.55)]"
                      >
                        <span className="rounded-lg bg-orange-500 px-2 py-1 text-center text-sm font-black text-white">
                          {day}
                        </span>
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-bold">
                            {title}
                          </p>
                          <p className="m-0 text-xs font-bold text-orange-200">{type}</p>
                        </div>
                        <span className="text-right text-xs font-bold text-orange-100">
                          {time}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border-2 border-orange-500 bg-orange-500 p-4 text-black">
                    <p className="m-0 text-sm font-black">
                      Review gate enabled
                    </p>
                    <p className="m-0 mt-1 text-xs font-bold text-black/70">
                      No calendar events are created until you approve the
                      parsed schedule.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="delay-1000 absolute inset-x-10 -bottom-10 -z-10 h-24 animate-appear-zoom rounded-[50%] bg-orange-500/30 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
