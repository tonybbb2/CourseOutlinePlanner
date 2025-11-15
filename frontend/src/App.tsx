import { useState } from "react";
import { uploadSyllabus, type BackendCourse, type BackendEvent, syncCourseToGoogle } from "./api";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

function EventsTable({ events }: { events: BackendEvent[] }) {
  if (!events.length) return <p>No events parsed yet.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
      <thead>
        <tr>
          <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Title</th>
          <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Type</th>
          <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Start</th>
          <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>End</th>
          <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Location</th>
        </tr>
      </thead>
      <tbody>
        {events.map((ev) => (
          <tr key={ev.id}>
            <td style={{ padding: "4px 8px" }}>{ev.title}</td>
            <td style={{ padding: "4px 8px" }}>{ev.type}</td>
            <td style={{ padding: "4px 8px" }}>{formatDateTime(ev.start)}</td>
            <td style={{ padding: "4px 8px" }}>{formatDateTime(ev.end)}</td>
            <td style={{ padding: "4px 8px" }}>{ev.location ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [course, setCourse] = useState<BackendCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: replace this with your real embed URL once your calendar is public
  const googleCalendarEmbedUrl =
    "https://calendar.google.com/calendar/embed?src=a01db11882c157a9d7fbd72501759c4580ec8d4de176547a21e7e34036112b39%40group.calendar.google.com&ctz=America%2FToronto";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    try {
      const result = await uploadSyllabus(selectedFile);
      setCourse(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Left side: controls + parsed events */}
      <div style={{ flex: 1, padding: "1.5rem", borderRight: "1px solid #ddd" }}>
        <h1>Planner</h1>

        <section style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
          <h2>1. Upload course outline PDF</h2>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ marginTop: "0.5rem" }}
          />
          <div style={{ marginTop: "0.5rem" }}>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              style={{
                padding: "0.5rem 1rem",
                cursor: selectedFile && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Processing..." : "Upload & Parse"}
            </button>
          </div>
          {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
        </section>

        <section>
  <h2>2. Parsed events</h2>
  {course ? (
    <>
      <p>
        <strong>{course.code}</strong> — {course.name} ({course.term})
      </p>

      <button
        onClick={async () => {
          try {
            await syncCourseToGoogle(course.id);
            alert("Synced to Google Calendar!");
          } catch (err: any) {
            console.error(err);
            alert("Failed to sync: " + (err.message ?? String(err)));
          }
        }}
        style={{ marginBottom: "0.75rem", padding: "0.4rem 0.9rem" }}
      >
        Sync this course to Google Calendar
      </button>

      <EventsTable events={course.events} />
    </>
  ) : (
    <p>No course uploaded yet.</p>
  )}
</section>
      </div>

      {/* Right side: Google Calendar embed */}
      <div style={{ flex: 1.2, padding: "1.5rem" }}>
        <h2>3. Google Calendar view</h2>
        <p style={{ fontSize: "0.9rem", color: "#555" }}>
          This is an embedded Google Calendar. Your backend script (or future API) will create
          events in this calendar using credentials.json / token.json.
        </p>
        <div
          style={{
            marginTop: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            overflow: "hidden",
            height: "600px",
          }}
        >
          <iframe
            src={googleCalendarEmbedUrl}
            style={{ border: 0, width: "100%", height: "100%" }}
            frameBorder="0"
            scrolling="no"
            title="Google Calendar"
          />
        </div>
      </div>
    </div>
  );
}

export default App;