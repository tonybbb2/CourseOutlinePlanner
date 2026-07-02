const buttonBase =
  "inline-flex items-center rounded-full px-5 py-2 text-sm font-medium border border-transparent transition-all duration-150 transform disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0";

export const primaryButton = `${buttonBase} bg-orange-500 text-white shadow-[0_10px_18px_rgba(249,115,22,0.35)] hover:bg-orange-600 hover:-translate-y-[1px]`;
export const ghostButton = `${buttonBase} bg-white text-gray-900 border border-gray-800 hover:bg-gray-100`;
export const softButton = `${buttonBase} bg-gray-100 text-gray-900 hover:bg-gray-200`;

export const pill =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200";
export const softPill =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200";
export const stepPill =
  "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] bg-orange-100 text-orange-700";
