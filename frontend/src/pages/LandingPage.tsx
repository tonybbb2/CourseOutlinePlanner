import type { AppPageProps } from "../App";
import { HeroSection } from "../components/HeroSection";
import { ghostButton, primaryButton } from "../ui";

export function LandingPage(props: AppPageProps) {
  return (
    <div className="min-h-screen bg-white text-black">
      <HeroSection
        selectedFiles={props.selectedFiles}
        handleFileChange={props.handleFileChange}
        removeFile={props.removeFile}
        handleUpload={props.handleUpload}
        loading={props.loading}
        navigate={props.navigate}
      />

      <section className="ai-grid px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            ["Upload", "Drop a PDF course outline and extract schedule data."],
            ["Review", "Edit lectures, labs, exams, and deadlines before sync."],
            ["Sync", "Push approved events to your connected calendar."],
          ].map(([title, body]) => (
            <div key={title} className="ai-panel rounded-2xl p-5">
              <h2 className="m-0 text-xl font-black text-black">{title}</h2>
              <p className="mt-2 text-sm font-bold text-zinc-700">{body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-6xl flex-wrap gap-3">
          <button
            type="button"
            className={primaryButton}
            onClick={() => props.navigate("/upload")}
          >
            Start upload
          </button>
          <button
            type="button"
            className={ghostButton}
            onClick={() => props.navigate("/dashboard")}
          >
            Open dashboard
          </button>
        </div>
      </section>
    </div>
  );
}
