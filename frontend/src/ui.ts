const buttonBase =
  "inline-flex items-center rounded-full px-5 py-2 text-sm font-medium border border-transparent transition-all duration-150 transform disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0";

export const primaryButton = `${buttonBase} bg-blue-600 text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:-translate-y-[1px]`;
export const ghostButton = `${buttonBase} bg-white text-gray-900 border border-gray-300 hover:bg-gray-100`;
export const softButton = `${buttonBase} bg-gray-100 text-gray-900 hover:bg-gray-200`;

export const pill =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-indigo-100 text-indigo-700";
export const softPill =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-cyan-50 text-cyan-600";
export const stepPill =
  "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] bg-[#e0edff] text-blue-700";
