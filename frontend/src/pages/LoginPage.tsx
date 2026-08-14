import { FaGoogle } from "react-icons/fa";
import type { Navigate } from "../App";
import { ghostButton, primaryButton } from "../ui";

type Props = {
  navigate: Navigate;
};

export function LoginPage({ navigate }: Props) {
  return (
    <div className="ai-grid min-h-screen bg-white text-black">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="ai-panel flex w-full max-w-md flex-col rounded-2xl p-8">
          <p className="m-0 text-sm font-black uppercase tracking-[0.22em] text-orange-600">
            SemesterSync
          </p>
          <h1 className="m-0 mt-1 text-4xl font-black text-black">Log in</h1>
          <p className="m-0 mt-2 text-sm font-bold text-zinc-700">
            Return to your courses, reviews, and calendar sync.
          </p>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl border-[3px] border-black bg-white px-4 py-3 text-sm font-black text-black shadow-[6px_6px_0_#111111] transition hover:-translate-y-[1px] hover:bg-orange-100"
          >
            <FaGoogle className="text-lg" />
            Continue with Google
          </button>

          <label className="mt-6 flex flex-col gap-1">
            <span className="text-sm font-black text-black">Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border-[3px] border-black bg-white px-3 py-2.5 text-sm font-bold text-black placeholder:text-zinc-500 transition focus:border-orange-500 focus:outline-none"
            />
          </label>

          <label className="mt-3 flex flex-col gap-1">
            <span className="text-sm font-black text-black">
              Password
            </span>
            <input
              type="password"
              placeholder="********"
              className="w-full rounded-xl border-[3px] border-black bg-white px-3 py-2.5 text-sm font-bold text-black placeholder:text-zinc-500 transition focus:border-orange-500 focus:outline-none"
            />
          </label>

          <button
            type="button"
            className={`${primaryButton} mt-6 justify-center rounded-lg py-3`}
            onClick={() => navigate("/dashboard")}
          >
            Log in
          </button>

          <button
            type="button"
            className={`${ghostButton} mt-3 justify-center`}
            onClick={() => navigate("/signup")}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
