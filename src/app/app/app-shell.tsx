"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ChatSessionLink = {
  id: string;
  title: string | null;
};

export function AppShell({ children, sessions }: { children: ReactNode; sessions: ChatSessionLink[] }) {
  const pathname = usePathname();
  const showHistorySidebar = pathname === "/app/create";

  return (
    <div className="flex">
      {showHistorySidebar ? (
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-r border-slate-200 bg-white px-3 py-4 lg:block">
          <div className="flex items-center justify-between px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">History</p>
            <a href="/app/create" className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">
              New
            </a>
          </div>
          <div className="mt-4 space-y-1 overflow-y-auto">
            {sessions.length ? (
              sessions.map((session) => (
                <Link key={session.id} href={`/app/create?sessionId=${session.id}`} prefetch={false} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">
                  <span className="block truncate">{session.title || "Workout"}</span>
                </Link>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-400">No workouts yet.</p>
            )}
          </div>
        </aside>
      ) : null}
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
