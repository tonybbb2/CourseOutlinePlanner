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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="m-0 text-base font-semibold text-slate-900">
        Chat with your calendar
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Ask me to cancel, move, or check events (e.g.{" "}
        <span className="italic">
          ƒ?oCancel my COMP 228 lecture for the next 2 weeksƒ??
        </span>
        ).
      </p>

      <div className="mt-3 max-h-[220px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
        {messages.length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-400">
            No messages yet. Start by asking a question about your schedule.
          </div>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`mt-1 rounded-md px-3 py-2 ${
              m.role === "user" ? "bg-indigo-50" : "bg-transparent"
            }`}
          >
            <div className="text-[0.7rem] uppercase tracking-[0.08em] text-gray-400">
              {m.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="text-sm text-slate-900">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="mt-1 rounded-md bg-transparent px-3 py-2">
            <div className="text-[0.7rem] uppercase tracking-[0.08em] text-gray-400">
              Assistant
            </div>
            <div className="text-sm text-slate-900">Thinkingƒ?İ</div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          className="min-h-[80px] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          rows={2}
          placeholder="Type a request and press Enterƒ?İ"
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
          {loading ? "Sendingƒ?İ" : "Send"}
        </button>
      </div>
    </div>
  );
}
