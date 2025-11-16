const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export type BackendEvent = {
  id: string;
  course_id: string;
  title: string;
  type: string;
  start: string;         // ISO
  end: string | null;
  location: string | null;
};

export type BackendCourse = {
  id: string;
  name: string | null;
  code: string | null;
  term: string | null;
  events: BackendEvent[];
};

export async function uploadSyllabus(file: File): Promise<BackendCourse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/upload-syllabus`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.detail || "";
    } catch {
      detail = await res.text();
    }
    throw new Error(`Upload failed: ${detail}`);
  }

  return res.json();
}

export async function syncCourseToGoogle(courseId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/courses/${courseId}/sync-google`, {
    method: "POST",
  });
  if (!res.ok) {
    let msg: string;
    try {
      const body = await res.json();
      msg = body.detail || JSON.stringify(body);
    } catch {
      msg = await res.text();
    }
    throw new Error(msg);
  }
}

export async function disconnectGoogle(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to disconnect");
  }
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function chatWithCalendar(
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/chat/calendar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat failed: ${text}`);
  }

  const data = await res.json();
  return data.reply as string;
}
