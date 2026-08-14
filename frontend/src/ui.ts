const buttonBase =
  "inline-flex items-center rounded-xl px-5 py-2 text-sm font-semibold border border-transparent transition-all duration-150 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0";

export const primaryButton = `${buttonBase} bg-orange-500 text-white shadow-[0_16px_34px_rgba(249,115,22,0.36)] hover:bg-black hover:text-white hover:-translate-y-[1px]`;
export const ghostButton = `${buttonBase} bg-white text-black border-2 border-black hover:bg-black hover:text-white hover:-translate-y-[1px]`;
export const softButton = `${buttonBase} bg-orange-100 text-black border-2 border-orange-500 hover:bg-orange-500 hover:text-white`;

export const pill =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-orange-500 text-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.9)]";
export const softPill =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-white text-black border-2 border-black";
export const stepPill =
  "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] bg-black text-white border-2 border-orange-500";
