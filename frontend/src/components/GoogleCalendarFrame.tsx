interface GoogleCalendarFrameProps {
  embedUrl: string;
}

export function GoogleCalendarFrame({ embedUrl }: GoogleCalendarFrameProps) {
  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2>Your Schedule</h2>
        <p>Events are synced to your Google Calendar automatically</p>
      </div>

      <div className="calendar-frame">
        <iframe
          src={embedUrl}
          style={{ border: 0, width: "100%", height: "100%" }}
          frameBorder="0"
          scrolling="no"
          title="Google Calendar"
        />
      </div>
    </div>
  );
}
