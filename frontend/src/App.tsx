import { useEffect, useState, type ChangeEvent } from "react";
import {
  disconnectGoogle,
  getPlanStatus,
  syncCourseToGoogle,
  uploadSyllabus,
  type AuthStatus,
  type BackendCourse,
  type PlanStatus,
} from "./api";
import { AssistantPage } from "./pages/AssistantPage";
import { BillingPage } from "./pages/BillingPage";
import { CalendarPage } from "./pages/CalendarPage";
import { CourseReviewPage } from "./pages/CourseReviewPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { UploadPage } from "./pages/UploadPage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const DEMO_CAL_URL =
  "https://calendar.google.com/calendar/embed?src=a01db11882c157a9d7fbd72501759c4580ec8d4de176547a21e7e34036112b39%40group.calendar.google.com&ctz=America%2FToronto";

export type Navigate = (path: string) => void;

export type AppPageProps = {
  selectedFiles: File[];
  course: BackendCourse | null;
  coursesVersion: number;
  loading: boolean;
  error: string | null;
  authStatus: AuthStatus;
  connectError: string | null;
  googleCalendarEmbedUrl: string;
  calendarRefreshKey: number;
  isSyncing: boolean;
  syncMessage: string | null;
  planStatus: PlanStatus | null;
  navigate: Navigate;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeFile: (idx: number) => void;
  handleUpload: () => Promise<void>;
  handleSync: (courseToSync?: BackendCourse | null) => Promise<void>;
  handleConnectGoogle: () => Promise<void>;
  handleDisconnectGoogle: () => Promise<void>;
  setCourse: (course: BackendCourse | null) => void;
  refreshPlan: () => Promise<void>;
};

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { pathname, navigate };
}

function App() {
  const { pathname, navigate } = usePathname();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [course, setCourse] = useState<BackendCourse | null>(null);
  const [coursesVersion, setCoursesVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    connected: false,
  });
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [googleCalendarEmbedUrl, setGoogleCalendarEmbedUrl] =
    useState(DEMO_CAL_URL);

  const refreshPlan = async () => {
    try {
      setPlanStatus(await getPlanStatus());
    } catch {
      setPlanStatus(null);
    }
  };

  useEffect(() => {
    refreshPlan();

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
        } else {
          setGoogleCalendarEmbedUrl(DEMO_CAL_URL);
        }
      } catch {
        setAuthStatus({ connected: false });
        setGoogleCalendarEmbedUrl(DEMO_CAL_URL);
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
        setError("Free plan supports up to 2 PDFs in this prototype.");
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

  const handleUpload = async () => {
    if (!selectedFiles.length || loading) return;

    setLoading(true);
    setError(null);
    setSyncMessage(null);

    try {
      const result = await uploadSyllabus(selectedFiles[0]);
      setCourse(result);
      setCoursesVersion((prev) => prev + 1);
      await refreshPlan();
      navigate(`/courses/${result.id}/review`);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (courseToSync: BackendCourse | null = course) => {
    if (!courseToSync || isSyncing) return;

    if (!authStatus.connected) {
      setSyncMessage("Connect Google Calendar before syncing.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      await syncCourseToGoogle(courseToSync.id);
      setSyncMessage("Course events synced to Google Calendar.");
      setCalendarRefreshKey((prev) => prev + 1);
      setCoursesVersion((prev) => prev + 1);
    } catch (err: any) {
      const msg = err?.message ?? String(err ?? "Unknown error");
      setSyncMessage("Failed to sync: " + msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectError(null);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/google/url`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        setConnectError(`Backend error: ${await res.text()}`);
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

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogle();
      setAuthStatus({ connected: false, email: null });
      setGoogleCalendarEmbedUrl(DEMO_CAL_URL);
      setCalendarRefreshKey((prev) => prev + 1);
    } catch {
      // Keep logout non-blocking in the prototype.
    }
  };

  const pageProps: AppPageProps = {
    selectedFiles,
    course,
    coursesVersion,
    loading,
    error,
    authStatus,
    connectError,
    googleCalendarEmbedUrl,
    calendarRefreshKey,
    isSyncing,
    syncMessage,
    planStatus,
    navigate,
    handleFileChange,
    removeFile,
    handleUpload,
    handleSync,
    handleConnectGoogle,
    handleDisconnectGoogle,
    setCourse,
    refreshPlan,
  };

  if (pathname === "/signup") return <SignupPage navigate={navigate} />;
  if (pathname === "/login") return <LoginPage navigate={navigate} />;
  if (pathname === "/dashboard") return <DashboardPage {...pageProps} />;
  if (pathname === "/upload") return <UploadPage {...pageProps} />;
  if (pathname === "/calendar") return <CalendarPage {...pageProps} />;
  if (pathname === "/assistant") return <AssistantPage {...pageProps} />;
  if (pathname === "/billing") return <BillingPage {...pageProps} />;

  const courseReviewMatch = pathname.match(/^\/courses\/([^/]+)\/review$/);
  if (courseReviewMatch) {
    return <CourseReviewPage {...pageProps} courseId={courseReviewMatch[1]} />;
  }

  return <LandingPage {...pageProps} />;
}

export default App;
