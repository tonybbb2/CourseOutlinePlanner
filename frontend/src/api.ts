const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type BackendEvent = {
  id: string;
  course_id: string;
  title: string;
  type: string;
  start: string;         // ISO
  end: string | null;
  location: string | null;
  notes?: string | null;
  source_page?: number | null;
};

export type BackendCourse = {
  id: string;
  name: string | null;
  code: string | null;
  term: string | null;
  events: BackendEvent[];
  reviewed: boolean;
  synced: boolean;
};

export type AuthStatus = {
  connected: boolean;
  email?: string | null;
};

export type PlanStatus = {
  plan: "free" | "paid" | string;
  syllabus_upload_limit: number;
  syllabus_uploads_used: number;
  assistant_message_limit: number;
  assistant_messages_used: number;
  paid_features: string[];
};

export type EventUpdate = Partial<
  Pick<BackendEvent, "title" | "type" | "start" | "end" | "location" | "notes">
>;

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

export async function listCourses(): Promise<BackendCourse[]> {
  const res = await fetch(`${BASE_URL}/api/courses`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function getCourse(courseId: string): Promise<BackendCourse> {
  const res = await fetch(`${BASE_URL}/api/courses/${courseId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function getPlanStatus(): Promise<PlanStatus> {
  const res = await fetch(`${BASE_URL}/api/me/plan`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function updateCourseReview(
  courseId: string,
  reviewed = true
): Promise<BackendCourse> {
  const res = await fetch(`${BASE_URL}/api/courses/${courseId}/review`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ reviewed }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function updateCourseEvent(
  courseId: string,
  eventId: string,
  updates: EventUpdate
): Promise<BackendEvent> {
  const res = await fetch(`${BASE_URL}/api/courses/${courseId}/events/${eventId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function deleteCourseEvent(
  courseId: string,
  eventId: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/courses/${courseId}/events/${eventId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function syncCourseToGoogle(courseId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/courses/${courseId}/sync-google`, {
    method: "POST",
    credentials: "include",
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
    credentials: "include",
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat failed: ${text}`);
  }

  const data = await res.json();
  return data.reply as string;
}
