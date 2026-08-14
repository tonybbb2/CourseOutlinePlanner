import type { ReactNode } from "react";
import type { Navigate } from "../App";
import type { PlanStatus } from "../api";
import { ghostButton, pill, primaryButton } from "../ui";

type AppShellProps = {
  children: ReactNode;
  navigate: Navigate;
  planStatus?: PlanStatus | null;
};

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Upload", path: "/upload" },
  { label: "Calendar", path: "/calendar" },
  { label: "Assistant", path: "/assistant" },
];

export function AppShell({ children, navigate, planStatus }: AppShellProps) {
  return (
    <div className="ai-grid min-h-screen text-black">
      <header className="sticky top-0 z-20 border-b-[3px] border-black bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => navigate("/dashboard")}
          >
            <span className="h-10 w-10 rounded-xl bg-[url('/SS_logo.png')] bg-cover bg-center bg-no-repeat ring-[3px] ring-black" />
            <span className="text-xl font-black text-black">SemesterSync</span>
          </button>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`${ghostButton} px-3 py-2`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {planStatus && (
              <span className={pill}>
                {planStatus.plan} plan: {planStatus.syllabus_uploads_used}/
                {planStatus.syllabus_upload_limit} uploads
              </span>
            )}
            <button
              type="button"
              className={`${primaryButton} px-4 py-2`}
              onClick={() => navigate("/billing")}
            >
              Upgrade
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
