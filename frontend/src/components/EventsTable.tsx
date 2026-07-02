import type { BackendEvent } from "../api";
import { softPill } from "../ui";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

export function EventsTable({ events }: { events: BackendEvent[] }) {
  if (!events.length)
    return (
      <p className="mt-1 text-sm text-gray-500">
        No events were detected in this syllabus. Double-check your PDF and try
        again.
      </p>
    );

  return (
    <div className="mt-2 overflow-hidden rounded-[10px] border border-gray-200 bg-white">
      <div className="w-full overflow-x-auto">
        <table className="min-w-[640px] w-full border-collapse text-[0.82rem]">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
                Title
              </th>
              <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
                Type
              </th>
              <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
                Start
              </th>
              <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
                End
              </th>
              <th className="border-b border-gray-200 px-3 py-2.5 font-semibold">
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, idx) => (
              <tr
                key={ev.id}
                className={`${
                  idx % 2 === 1 ? "bg-gray-50" : ""
                } transition-colors hover:bg-orange-50`}
              >
                <td className="px-3 py-2.5">{ev.title}</td>
                <td className="px-3 py-2.5">
                  <span className={softPill}>{ev.type}</span>
                </td>
                <td className="px-3 py-2.5">{formatDateTime(ev.start)}</td>
                <td className="px-3 py-2.5">{formatDateTime(ev.end)}</td>
                <td className="px-3 py-2.5">{ev.location ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
