import { useState } from "react";

interface SyncButtonProps {
  courseId: string;
  onSync: (courseId: string) => Promise<void>;
}

export function SyncButton({ courseId, onSync }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync(courseId);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      className="sync-button"
      onClick={handleSync}
      disabled={syncing}
    >
      {syncing ? (
        <>
          <div className="button-spinner"></div>
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Sync to Google Calendar</span>
        </>
      )}
    </button>
  );
}
