import type { ReactNode } from "react";

export function IPhonePreview({ children, nav, scroll = true }: { children: ReactNode; nav?: ReactNode; scroll?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-3 py-4 text-slate-950">
      <div className="relative h-[844px] max-h-[calc(100vh-2rem)] w-[390px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[3rem] border-[10px] border-slate-950 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.28)]">
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 h-6 w-32 -translate-x-1/2 rounded-b-3xl bg-slate-950" />
        <div className={`h-full bg-white ${scroll ? "overflow-y-auto" : "overflow-hidden"}`}>{children}</div>
        {nav}
      </div>
    </div>
  );
}
