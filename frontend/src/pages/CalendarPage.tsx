import type { AppPageProps } from "../App";
import { AppShell } from "../components/AppShell";
import { CalendarView } from "../components/CalendarView";
import { ghostButton, pill, primaryButton } from "../ui";

export function CalendarPage(props: AppPageProps) {
  return (
    <AppShell navigate={props.navigate} planStatus={props.planStatus}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-orange-600">
            Calendar
          </p>
          <h1 className="m-0 mt-1 text-4xl font-black tracking-tight text-black">
            Schedule sync
          </h1>
          <p className="mt-2 text-sm font-bold text-zinc-700">
            Preview the current course locally and connect Google Calendar for
            real sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.authStatus.connected ? (
            <>
              <span className={pill}>Google connected</span>
              <button
                type="button"
                className={ghostButton}
                onClick={props.handleDisconnectGoogle}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              className={primaryButton}
              onClick={props.handleConnectGoogle}
            >
              Connect Google
            </button>
          )}
        </div>
      </div>

      {props.connectError && (
        <div className="mb-4 rounded-2xl border-[3px] border-black bg-orange-100 px-4 py-3 text-sm font-bold text-orange-700 shadow-[5px_5px_0_#111111]">
          {props.connectError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.7fr)]">
        <CalendarView
          course={props.course}
          onExport={props.course ? () => props.handleSync(props.course) : undefined}
        />

        <section className="ai-panel rounded-2xl p-4">
          <div className="mb-3">
            <h2 className="m-0 text-xl font-black text-black">Google Calendar</h2>
            <p className="m-0 mt-1 text-sm font-bold text-zinc-600">
              {props.authStatus.connected
                ? "Synced courses appear in your connected calendar."
                : "A demo calendar is shown until Google is connected."}
            </p>
          </div>
          <div className="relative h-[560px] overflow-hidden rounded-2xl border-[3px] border-black bg-white max-[640px]:h-[420px]">
            <iframe
              key={props.calendarRefreshKey}
              src={props.googleCalendarEmbedUrl}
              title="Google Calendar"
              className={`h-full w-full border-0 ${
                props.authStatus.connected ? "" : "pointer-events-none blur-[4px]"
              }`}
              scrolling="no"
            />
            {!props.authStatus.connected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/72 px-6 text-center text-white backdrop-blur-md">
                <h3 className="m-0 text-xl font-black">Connect your calendar</h3>
                <p className="m-0 max-w-sm text-sm font-bold text-orange-50">
                  Sign in with Google so SemesterSync can add approved course
                  events to your schedule.
                </p>
                <button
                  type="button"
                  className={primaryButton}
                  onClick={props.handleConnectGoogle}
                >
                  Connect Google
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
