import { FaGoogle } from "react-icons/fa";

export function SignupPage() {
  const handleGoogle = () => {
    // Placeholder for real Google OAuth
    alert("Google signup coming soon");
  };

  return (
    <div className="min-h-screen bg-[#fff8ee] text-slate-900">
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.18),rgba(249,115,22,0.04),transparent)] blur-3xl" />
        </div>
        <div className="flex w-full max-w-xl flex-col rounded-3xl border border-orange-100 bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10">
          <div className="mb-6">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.22em] text-orange-600">
              SemesterSync
            </p>
            <h1 className="m-0 mt-1 text-3xl font-extrabold text-slate-900">
              Sign up
            </h1>
            <p className="m-0 mt-2 text-sm text-gray-600">
              Create an account to auto-sync syllabi to your calendar.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg"
          >
            <FaGoogle className="text-lg" />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            OR
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-800">
                First name
              </label>
              <input
                type="text"
                placeholder="Alex"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-inner transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-800">
                Last name
              </label>
              <input
                type="text"
                placeholder="Park"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-inner transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-800">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-inner transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-800">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-inner transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <button
            type="button"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,0.35)] transition hover:-translate-y-[1px] hover:bg-orange-600 hover:shadow-[0_12px_34px_rgba(249,115,22,0.4)]"
          >
            Create an account
          </button>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a className="font-semibold text-orange-600 hover:underline" href="#">
              Sign in
            </a>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          By creating or entering an account, you agree to the{" "}
          <a className="font-semibold text-orange-600 hover:underline" href="#">
            Terms of Service
          </a>{" "}
          and{" "}
          <a className="font-semibold text-orange-600 hover:underline" href="#">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
