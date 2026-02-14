import { useEffect, useState, type ChangeEvent } from "react";
import {
  uploadSyllabus,
  type BackendCourse,
  syncCourseToGoogle,
  disconnectGoogle,
  type AuthStatus,
} from "./api";
import { HeroSection } from "./components/HeroSection";
import { PlannerSection } from "./components/PlannerSection";
import { SignupPage } from "./pages/SignupPage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [course, setCourse] = useState<BackendCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    connected: false,
  });
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [googleCalendarEmbedUrl, setGoogleCalendarEmbedUrl] = useState(
    "https://calendar.google.com/calendar/embed?src=a01db11882c157a9d7fbd72501759c4580ec8d4de176547a21e7e34036112b39%40group.calendar.google.com&ctz=America%2FToronto"
  );

  const isSignup =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/signup");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/status`, {
          credentials: "include",
        });

        const data = (await res.json()) as AuthStatus;
        setAuthStatus(data);

        if (data.connected) {
          const srcCalendar = data.email ?? "primary";
          setGoogleCalendarEmbedUrl(
            `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
              srcCalendar
            )}&ctz=America%2FToronto`
          );
        }
      } catch {
        setAuthStatus({ connected: false });
      }
    })();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;

    setSelectedFiles((prev) => {
      const merged = [...prev, ...incoming];
      const limited = merged.slice(0, 2);

      if (merged.length > 2) {
        setError("You can upload up to 2 PDFs; extra files were ignored.");
      } else {
        setError(null);
      }

      return limited;
    });

    setCourse(null);
    setSyncMessage(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogle();
      setAuthStatus({ connected: false, email: null });
      setGoogleCalendarEmbedUrl(
        "https://calendar.google.com/calendar/embed?src=a01db11882c157a9d7fbd72501759c4580ec8d4de176547a21e7e34036112b39%40group.calendar.google.com&ctz=America%2FToronto"
      );
      setCalendarRefreshKey((prev) => prev + 1);
    } catch {
      // ignore
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || loading) return;

    setLoading(true);
    setError(null);
    setSyncMessage(null);

    try {
      const result = await uploadSyllabus(selectedFiles[0]);
      setCourse(result);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!course || isSyncing) return;

    if (!authStatus.connected) {
      setSyncMessage("Please connect your Google Calendar first in Step 3.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      await syncCourseToGoogle(course.id);
      setSyncMessage("Course events synced to Google Calendar!");
      setCalendarRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      const msg = err?.message ?? String(err ?? "Unknown error");
      setSyncMessage("Failed to sync: " + msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalEvents = course?.events.length ?? 0;
  const classEvents =
    course?.events.filter((e) => e.type.toLowerCase().includes("class"))
      .length ?? 0;
  const examEvents =
    course?.events.filter((e) => e.type.toLowerCase().includes("exam"))
      .length ?? 0;

  const handleConnectGoogle = async () => {
    setConnectError(null);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/google/url`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        setConnectError(`Backend error: ${text}`);
        return;
      }

      const data = await res.json();
      if (!data.url) {
        setConnectError("No auth URL returned from server.");
        return;
      }

      window.location.href = data.url;
    } catch (err: any) {
      setConnectError(String(err));
    }
  };

  if (isSignup) {
    return <SignupPage />;
  }

  return (
    <div className="min-h-screen bg-[#fff8ee] text-slate-900">
      <style>
        {`
          @keyframes floatYou {
            0% { transform: translateX(8px); }
            50% { transform: translateX(-8px); }
            100% { transform: translateX(8px); }
          }
          @keyframes floatAiTag {
            0% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0); }
          }
          @keyframes pulseGlow {
            0% { transform: scale(0.95); opacity: 0.6; }
            45% { transform: scale(1.08); opacity: 0.08; }
            100% { transform: scale(0.95); opacity: 0.6; }
          }
        `}
      </style>

      <HeroSection
        selectedFiles={selectedFiles}
        handleFileChange={handleFileChange}
        removeFile={removeFile}
        handleUpload={handleUpload}
        loading={loading}
      />

      <PlannerSection
        selectedFiles={selectedFiles}
        handleFileChange={handleFileChange}
        removeFile={removeFile}
        handleUpload={handleUpload}
        loading={loading}
        error={error}
        course={course}
        totalEvents={totalEvents}
        classEvents={classEvents}
        examEvents={examEvents}
        handleSync={handleSync}
        isSyncing={isSyncing}
        syncMessage={syncMessage}
        authStatus={authStatus}
        handleDisconnectGoogle={handleDisconnectGoogle}
        handleConnectGoogle={handleConnectGoogle}
        connectError={connectError}
        googleCalendarEmbedUrl={googleCalendarEmbedUrl}
        calendarRefreshKey={calendarRefreshKey}
      />
    </div>
  );
}

export default App;
