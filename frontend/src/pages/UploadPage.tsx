import type { AppPageProps } from "../App";
import { AppShell } from "../components/AppShell";
import { primaryButton, softPill } from "../ui";

export function UploadPage(props: AppPageProps) {
  const remainingUploads = props.planStatus
    ? Math.max(
        props.planStatus.syllabus_upload_limit -
          props.planStatus.syllabus_uploads_used,
        0
      )
    : null;

  return (
    <AppShell navigate={props.navigate} planStatus={props.planStatus}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.45fr)]">
        <section>
          <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-orange-600">
            Upload
          </p>
          <h1 className="m-0 mt-1 text-4xl font-black tracking-tight text-black">
            Add a course outline
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-bold text-zinc-700">
            Upload a PDF syllabus. SemesterSync will extract classes,
            assessments, deadlines, and locations, then send you to review
            before anything touches your calendar.
          </p>

          <div className="ai-panel mt-6 rounded-2xl p-5">
            <label className="block cursor-pointer rounded-2xl border-[3px] border-dashed border-black bg-orange-50 px-5 py-8 text-center transition hover:bg-orange-100 hover:shadow-[7px_7px_0_#111111]">
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={props.handleFileChange}
                className="hidden"
              />
              <span className="block text-base font-black text-black">
                {props.selectedFiles.length
                  ? `${props.selectedFiles.length} PDF selected`
                  : "Drop PDFs here or click to browse"}
              </span>
              <span className="mt-1 block text-sm font-bold text-zinc-600">
                Free prototype limit: 2 files selected, 1 processed at a time.
              </span>
            </label>

            {props.selectedFiles.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {props.selectedFiles.map((file, idx) => (
                  <div
                    key={file.name + file.lastModified}
                    className="flex items-center justify-between gap-3 rounded-xl border-2 border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111111]"
                  >
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-black text-black">
                        {file.name}
                      </p>
                      <p className="m-0 text-xs font-bold text-zinc-600">PDF file</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-sm font-black text-orange-600 hover:bg-orange-100"
                      onClick={() => props.removeFile(idx)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={primaryButton}
                onClick={props.handleUpload}
                disabled={!props.selectedFiles.length || props.loading}
              >
                {props.loading ? "Processing..." : "Extract schedule"}
              </button>
              {props.error && (
                <span className="text-sm font-bold text-orange-700">{props.error}</span>
              )}
            </div>
          </div>
        </section>

        <aside className="ai-panel rounded-2xl p-5">
          <h2 className="m-0 text-xl font-black text-black">Plan limits</h2>
          <p className="mt-2 text-sm font-bold text-zinc-700">
            These limits are placeholders for the future free and paid tiers.
          </p>
          {remainingUploads !== null && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={softPill}>{remainingUploads} uploads left</span>
              <span className={softPill}>
                {props.planStatus?.assistant_message_limit} assistant messages
              </span>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
