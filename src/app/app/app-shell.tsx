"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FloatingNav } from "@/components/app/floating-nav";
import { IPhonePreview } from "@/components/app/iphone-preview";

type ShellUser = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export function AppShell({ children, user }: { children: ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/app/create");

  return (
    <IPhonePreview nav={hideNav ? null : <FloatingNav user={user} contained />} scroll={!hideNav}>
      <div className={`min-w-0 pt-10 ${hideNav ? "h-full px-0 pb-4" : "min-h-full px-4 pb-28"}`}>{children}</div>
    </IPhonePreview>
  );
}
