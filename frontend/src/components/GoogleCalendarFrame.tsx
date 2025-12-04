interface GoogleCalendarFrameProps {
  embedUrl: string;
}

export function GoogleCalendarFrame({ embedUrl }: GoogleCalendarFrameProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="m-0 text-lg font-semibold text-slate-900">
          Your Schedule
        </h2>
        <p className="m-0 text-sm text-gray-500">
          Events are synced to your Google Calendar automatically
        </p>
      </div>

      <div className="h-[520px] overflow-hidden rounded-lg border border-gray-200 bg-white max-[640px]:h-[460px]">
        <iframe
          src={embedUrl}
          className="h-full w-full border-0"
          frameBorder="0"
          scrolling="no"
          title="Google Calendar"
        />
      </div>
    </div>
  );
}
