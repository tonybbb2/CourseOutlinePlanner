import type { AppPageProps } from "../App";
import { AppShell } from "../components/AppShell";
import { ghostButton, primaryButton, softPill } from "../ui";

export function BillingPage(props: AppPageProps) {
  return (
    <AppShell navigate={props.navigate} planStatus={props.planStatus}>
      <div className="mb-6">
        <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-orange-600">
          Plans
        </p>
        <h1 className="m-0 mt-1 text-4xl font-black tracking-tight text-black">
          Free now, ready for paid later
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-bold text-zinc-700">
          This page defines the future upgrade surface without connecting a
          payment provider yet.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="ai-panel rounded-2xl p-5">
          <h2 className="m-0 text-xl font-black text-black">Free</h2>
          <p className="mt-2 text-sm font-bold text-zinc-700">
            Good for trying the syllabus-to-calendar workflow.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={softPill}>2 syllabus uploads</span>
            <span className={softPill}>Basic review</span>
            <span className={softPill}>Google sync</span>
          </div>
          <button type="button" className={`${ghostButton} mt-5`}>
            Current plan
          </button>
        </section>

        <section className="rounded-2xl border-[3px] border-black bg-orange-500 p-5 text-black shadow-[10px_10px_0_#111111]">
          <h2 className="m-0 text-xl font-black text-black">SemesterSync Plus</h2>
          <p className="mt-2 text-sm font-bold text-black/75">
            Candidate paid features for heavier semester planning.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(props.planStatus?.paid_features ?? [
              "unlimited syllabi",
              "study plan generation",
              "conflict detection",
            ]).map((feature) => (
              <span key={feature} className={softPill}>
                {feature}
              </span>
            ))}
          </div>
          <button type="button" className={`${primaryButton} mt-5`}>
            Upgrade coming soon
          </button>
        </section>
      </div>
    </AppShell>
  );
}
