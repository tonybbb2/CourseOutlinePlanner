import { useState } from "react";
import { chatWithCalendar, type ChatMessage } from "../api";
import { primaryButton } from "../ui";

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
    <div className="ai-panel rounded-2xl p-4">
      <h3 className="m-0 text-xl font-black text-black">
        Chat with your calendar
      </h3>
      <p className="mt-1 text-sm font-bold text-zinc-600">
        Ask to check, create, move, or delete events after Google Calendar is
        connected.
      </p>

      <div className="mt-3 max-h-[320px] overflow-y-auto rounded-2xl border-[3px] border-black bg-orange-50 p-2">
        {messages.length === 0 && (
          <div className="px-3 py-2 text-xs font-bold text-zinc-600">
            No messages yet. Start with a question about your schedule.
          </div>
        )}
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`mt-1 rounded-xl px-3 py-2 ${
              message.role === "user" ? "bg-white" : "bg-orange-100"
            }`}
          >
            <div className="text-[0.7rem] font-black uppercase tracking-[0.08em] text-orange-600">
              {message.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="text-sm font-bold text-black">{message.content}</div>
          </div>
        ))}
        {loading && (
          <div className="mt-1 rounded-xl bg-orange-100 px-3 py-2">
            <div className="text-[0.7rem] font-black uppercase tracking-[0.08em] text-orange-600">
              Assistant
            </div>
            <div className="text-sm font-bold text-black">Thinking...</div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm font-bold text-orange-700">{error}</p>}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          className="min-h-[88px] flex-1 resize-none rounded-xl border-[3px] border-black bg-white px-3 py-2 text-sm font-bold text-black placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
          rows={3}
          placeholder="Type a request and press Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className={primaryButton}
          disabled={loading || !input.trim()}
          onClick={send}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
