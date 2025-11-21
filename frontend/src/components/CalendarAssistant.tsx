// src/components/CalendarAssistant.tsx
import { useState } from "react";
import { chatWithCalendar, type ChatMessage } from "../api";

export function CalendarAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const reply = await chatWithCalendar(updatedMessages);
      setMessages([...updatedMessages, { role: "assistant", content: reply }]);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Chat request failed");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-panel">
      <h3 className="chat-title">Chat with your calendar</h3>
      <p className="chat-subtitle">
        Ask me to cancel, move, or check events (e.g.{" "}
        <span className="chat-example">
          “Cancel my COMP 228 lecture for the next 2 weeks”
        </span>
        ).
      </p>

      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            No messages yet. Start by asking a question about your schedule.
          </div>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`chat-msg chat-msg--${m.role === "user" ? "user" : "assistant"}`}
          >
            <div className="chat-msg-role">
              {m.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="chat-msg-content">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg chat-msg--assistant">
            <div className="chat-msg-role">Assistant</div>
            <div className="chat-msg-content">Thinking…</div>
          </div>
        )}
      </div>

      {error && <p className="chat-error">{error}</p>}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          rows={2}
          placeholder="Type a request and press Enter…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="btn btn--primary chat-send"
          disabled={loading || !input.trim()}
          onClick={send}
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
