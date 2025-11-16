import { useState } from "react";
import { uploadSyllabus, type BackendCourse, syncCourseToGoogle } from "./api";
import { FileUpload } from "./components/FileUpload";
import { ParsedEvents } from "./components/ParsedEvents";
import { SyncButton } from "./components/SyncButton";
import { CalendarView } from "./components/CalendarView";
import { Toast, ToastType } from "./components/Toast";
import "./App.css";

interface ToastState {
  message: string;
  type: ToastType;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [course, setCourse] = useState<BackendCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setLoading(true);
    setError(null);

    try {
      const result = await uploadSyllabus(file);
      setCourse(result);
      setToast({
        message: "Course outline parsed successfully!",
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.message ?? "Upload failed";
      setError(errorMsg);
      setToast({
        message: errorMsg,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (courseId: string) => {
    try {
      await syncCourseToGoogle(courseId);
      setToast({
        message: "Successfully synced to Google Calendar!",
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      setToast({
        message: err.message ?? "Failed to sync",
        type: "error",
      });
      throw err;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h1>Course Planner</h1>
            </div>
            <p className="header-subtitle">Transform your course outline into a smart calendar</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="main-grid">
          <div className="left-panel">
            <section className="section">
              <div className="section-header">
                <div className="step-badge">1</div>
                <h2>Upload Course Outline</h2>
              </div>
              <FileUpload
                onFileSelect={handleFileSelect}
                loading={loading}
                error={error}
              />
            </section>

            <section className="section">
              <div className="section-header">
                <div className="step-badge">2</div>
                <div className="section-header-content">
                  <h2>Course Events</h2>
                  {course && (
                    <div className="course-info">
                      <span className="course-code">{course.code}</span>
                      <span className="course-name">{course.name}</span>
                      <span className="course-term">{course.term}</span>
                    </div>
                  )}
                </div>
              </div>

              {course && (
                <div className="section-actions">
                  <SyncButton courseId={course.id} onSync={handleSync} />
                  <div className="events-count">
                    {course.events.length} {course.events.length === 1 ? "event" : "events"} found
                  </div>
                </div>
              )}

              <ParsedEvents events={course?.events ?? []} />
            </section>
          </div>

          <div className="right-panel">
            <section className="section">
              <div className="section-header">
                <div className="step-badge">3</div>
                <h2>Calendar View</h2>
              </div>
              <CalendarView course={course} onExport={handleSync} />
            </section>
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast-container">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
