import type { AppPageProps } from "../App";
import { AppShell } from "../components/AppShell";
import { CalendarAssistant } from "../components/CalendarAssistant";
import { softPill } from "../ui";

export function AssistantPage(props: AppPageProps) {
  return (
    <AppShell navigate={props.navigate} planStatus={props.planStatus}>
      <div className="mb-6">
        <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-orange-600">
          Assistant
        </p>
        <h1 className="m-0 mt-1 text-4xl font-black tracking-tight text-black">
          Calendar assistant
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-bold text-zinc-700">
          Ask schedule questions or request calendar changes after connecting
          Google. Advanced planning can become part of the paid tier later.
        </p>
        {props.planStatus && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={softPill}>
              {props.planStatus.assistant_messages_used}/
              {props.planStatus.assistant_message_limit} free messages
            </span>
            <span className={softPill}>{props.authStatus.connected ? "Calendar connected" : "Calendar required"}</span>
          </div>
        )}
      </div>

      <div className="max-w-3xl">
        <CalendarAssistant />
      </div>
    </AppShell>
  );
}
