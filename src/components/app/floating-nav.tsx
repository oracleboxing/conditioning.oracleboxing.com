"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type FloatingNavUser = {
  avatarUrl?: string | null;
  firstName?: string | null;
  displayName?: string | null;
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

function ProfileAvatar({ user }: { user?: FloatingNavUser }) {
  const initial = (user?.firstName || user?.displayName || "M").trim().charAt(0).toUpperCase() || "M";

  if (user?.avatarUrl) {
    return (
      <span className="block h-6 w-6 overflow-hidden rounded-full bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">{initial}</span>;
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
  { href: "/app/profile", label: "Profile", icon: () => null },
];

export function FloatingNav({ user, contained = false, position = "bottom" }: { user?: FloatingNavUser; contained?: boolean; position?: "top" | "bottom" | "left" }) {
  const pathname = usePathname();
  const [chooserOpen, setChooserOpen] = useState(false);
  const chooserRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!chooserRef.current?.contains(event.target as Node)) setChooserOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChooserOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const navPlacement =
    position === "left"
      ? "inset-x-0 bottom-4 justify-center lg:inset-x-auto lg:left-6 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2"
      : `inset-x-0 justify-center ${position === "top" ? "top-4" : "bottom-4"}`;
  const leftResponsiveStack = position === "left" ? "items-center lg:flex-col" : "items-center";

  return (
    <nav aria-label="Primary" className={`${contained ? "absolute" : "fixed"} z-50 flex px-2 ${navPlacement}`}>
      <div className={`flex max-w-full gap-1.5 ${leftResponsiveStack}`}>
        <div className={`flex min-w-0 gap-1.5 rounded-full border border-slate-200 bg-white/95 p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur ${leftResponsiveStack}`}>
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`grid place-items-center content-center rounded-full px-1 pb-0.5 font-semibold transition ${position === "left" ? "h-11 w-[3.75rem] text-[8.5px] min-[390px]:w-16 min-[390px]:text-[9px] sm:h-12 sm:w-[4.6rem] sm:text-[10px] lg:h-[4.25rem] lg:w-[4.25rem] lg:text-[10px]" : "h-11 w-[3.75rem] text-[8.5px] min-[390px]:w-16 min-[390px]:text-[9px] sm:h-12 sm:w-[4.6rem] sm:text-[10px]"} ${
                  active ? "bg-slate-100 text-slate-950" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {item.label === "Profile" ? <ProfileAvatar user={user} /> : item.icon(active)}
                {item.label === "Profile" ? null : <span className="mt-0.5 max-w-full truncate leading-none">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <div ref={chooserRef} className="relative">
          {chooserOpen ? (
            <div className={`absolute w-56 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 text-sm font-semibold text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${position === "left" ? "right-0 bottom-[calc(100%+0.75rem)] lg:right-auto lg:bottom-auto lg:left-[calc(100%+0.75rem)] lg:top-0" : `right-0 ${position === "top" ? "top-[calc(100%+0.75rem)]" : "bottom-[calc(100%+0.75rem)]"}`}`}>
              <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">New workout</p>
              <Link href={{ pathname: "/app/create/manual", query: { next: pathname } }} onClick={() => setChooserOpen(false)} className="block rounded-2xl px-3 py-3 transition hover:bg-slate-100">
                Choose exercises
              </Link>
              <Link href={{ pathname: "/app/create", query: { next: pathname } }} onClick={() => setChooserOpen(false)} className="block rounded-2xl px-3 py-3 transition hover:bg-slate-100">
                Describe a workout
              </Link>
            </div>
          ) : null}
          <button
            type="button"
            aria-label="New plan"
            aria-haspopup="menu"
            aria-expanded={chooserOpen}
            onClick={() => setChooserOpen((open) => !open)}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#007aff] text-white shadow-[0_18px_44px_rgba(0,122,255,0.32)] transition hover:bg-[#2f96ff] min-[390px]:h-14 min-[390px]:w-14 sm:h-16 sm:w-16"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    </nav>
  );
}
