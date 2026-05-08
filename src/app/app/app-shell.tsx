"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FloatingNav } from "@/components/app/floating-nav";

type ShellUser = {
  email: string;
  displayName: string;
  firstName: string;
  avatarUrl: string | null;
};

export function AppShell({ children, user }: { children: ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/app/create");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let timeout: number | null = null;
    const onToast = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      if (!message) return;
      setToast(message);
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setToast(null), 2400);
    };

    window.addEventListener("app-toast", onToast);
    return () => {
      window.removeEventListener("app-toast", onToast);
      if (timeout) window.clearTimeout(timeout);
    };
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* Desktop preview mode: iPhone wrapper temporarily bypassed. */}
      {hideNav ? null : <FloatingNav user={user} position="left" />}
      <div style={{ maxWidth: 500 }} className="mx-auto min-h-screen w-full overflow-x-hidden bg-white">
        <div className={`min-w-0 max-w-full overflow-x-hidden ${hideNav ? "h-screen px-0 pb-0 pt-0" : "min-h-screen px-6 pb-16 pt-10"}`}>{children}</div>
      </div>
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[1000000] -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(15,23,42,0.22)]">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
