"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type FloatingNavUser = {
  avatarUrl?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: (active: boolean) => ReactNode;
  exact?: boolean;
};

function HomeIcon(active: boolean) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <path d="M4.5 10.5 12 4l7.5 6.5V20a1 1 0 0 1-1 1H15v-6H9v6H5.5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlansIcon(active: boolean) {
  return (
    <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none">
      <path d="M6.5 8.5v7M17.5 8.5v7M4 10v4M20 10v4M8 12h8" stroke="currentColor" strokeWidth={active ? "2.3" : "1.9"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TeamIcon(active: boolean) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 19.5v-1.2c0-2.3 1.8-4.1 4-4.1s4 1.8 4 4.1v1.2M11.5 16.1a4 4 0 0 1 4-1.9c2.2 0 4 1.8 4 4.1v1.2" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon(active: boolean) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const navItems: NavItem[] = [
  { href: "/app", label: "Home", icon: HomeIcon, exact: true },
  { href: "/app/workouts", label: "Plans", icon: PlansIcon },
  { href: "/app/community", label: "Team", icon: TeamIcon },
  { href: "/app/profile", label: "Profile", icon: ProfileIcon },
];

export function FloatingNav({ user, contained = false }: { user?: FloatingNavUser; contained?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className={`${contained ? "absolute" : "fixed"} inset-x-0 bottom-4 z-50 flex justify-center px-2`}>
      <div className="flex max-w-full items-center gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`grid h-11 w-[3.75rem] place-items-center content-center rounded-full px-1 pb-0.5 text-[8.5px] font-semibold transition min-[390px]:w-16 min-[390px]:text-[9px] sm:h-12 sm:w-[4.6rem] sm:text-[10px] ${
                  active ? "bg-slate-100 text-slate-950" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {item.label === "Profile" && user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-[18px] w-[18px] rounded-full object-cover" />
                ) : (
                  item.icon(active)
                )}
                <span className="mt-0.5 max-w-full truncate leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <Link
          href={{ pathname: "/app/create", query: { next: pathname } }}
          aria-label="New plan"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-900 bg-slate-950 text-white shadow-[0_18px_44px_rgba(15,23,42,0.32)] transition hover:bg-slate-800 min-[390px]:h-14 min-[390px]:w-14 sm:h-16 sm:w-16"
        >
          <PlusIcon />
        </Link>
      </div>
    </nav>
  );
}
