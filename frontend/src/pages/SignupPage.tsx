import { FaGoogle } from "react-icons/fa";
import type { Navigate } from "../App";
import { primaryButton } from "../ui";

type Props = {
  navigate: Navigate;
};

export function SignupPage({ navigate }: Props) {
  return (
    <div className="ai-grid min-h-screen bg-white text-black">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="ai-panel flex w-full max-w-xl flex-col rounded-2xl p-8 sm:p-10">
          <div className="mb-6">
            <p className="m-0 text-sm font-black uppercase tracking-[0.22em] text-orange-600">
              SemesterSync
            </p>
            <h1 className="m-0 mt-1 text-4xl font-black text-black">
              Sign up
            </h1>
            <p className="m-0 mt-2 text-sm font-bold text-zinc-700">
              Create an account to save courses and sync syllabi to your
              calendar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border-[3px] border-black bg-white px-4 py-3 text-sm font-black text-black shadow-[6px_6px_0_#111111] transition hover:-translate-y-[1px] hover:bg-orange-100"
          >
            <FaGoogle className="text-lg" />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
            <span className="h-[3px] flex-1 bg-black" />
            OR
            <span className="h-[3px] flex-1 bg-black" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-black text-black">
                First name
              </span>
              <input
                type="text"
                placeholder="Alex"
                className="w-full rounded-xl border-[3px] border-black bg-white px-3 py-2.5 text-sm font-bold text-black placeholder:text-zinc-500 transition focus:border-orange-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-black text-black">
                Last name
              </span>
              <input
                type="text"
                placeholder="Park"
                className="w-full rounded-xl border-[3px] border-black bg-white px-3 py-2.5 text-sm font-bold text-black placeholder:text-zinc-500 transition focus:border-orange-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="mt-3 flex flex-col gap-1">
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
            Create an account
          </button>

          <p className="mt-5 text-center text-sm font-bold text-zinc-700">
            Already have an account?{" "}
            <button
              type="button"
              className="font-black text-orange-600 hover:underline"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs font-bold text-zinc-600">
          By creating an account, you agree to the Terms of Service and Privacy
          Policy.
        </p>
      </div>
    </div>
  );
}
