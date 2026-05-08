import Link from "next/link";
import type { ReactNode } from "react";

type WorkoutCardProps = {
  id: string;
  title: string;
  imageUrl?: string | null;
  durationMinutes?: number | null;
  difficulty?: string | null;
  equipment?: string[] | null;
  actionSlot?: ReactNode;
  footerSlot?: ReactNode;
  className?: string;
};

function cleanDifficulty(value?: string | null) {
  return value?.replace(/-/g, " ") || null;
}

export function WorkoutCard({ id, title, imageUrl, durationMinutes, difficulty, equipment, actionSlot, footerSlot, className = "" }: WorkoutCardProps) {
  const meta = [durationMinutes ? `${durationMinutes} min` : null, cleanDifficulty(difficulty), equipment?.slice(0, 2).join(", ")].filter(Boolean);

  return (
    <article
      className={`group relative cursor-pointer border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md ${className}`}
      style={{
        boxSizing: "border-box",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        height: 90,
        overflow: "visible",
        borderRadius: 24,
      }}
    >
      <Link href={`/workouts/${id}`} aria-label={title} className="absolute inset-0 z-10 rounded-3xl" />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 78,
          overflow: "hidden",
          background: "#f1f5f9",
          borderTopLeftRadius: 24,
          borderBottomLeftRadius: 24,
          pointerEvents: "none",
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Plan</div>
        )}
      </div>

      <div style={{ minWidth: 0, height: 90, overflow: "hidden", padding: actionSlot ? "11px 52px 11px 92px" : "11px 14px 11px 92px", pointerEvents: "none" }}>
        <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{title}</h2>
        {meta.length ? <p className="mt-2 text-xs leading-5 text-slate-500" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.join(" · ")}</p> : null}
        {footerSlot ? <div className="mt-3" style={{ pointerEvents: "auto" }}>{footerSlot}</div> : null}
      </div>

      {actionSlot ? <div className="workout-card-action-slot" style={{ position: "absolute", right: 8, top: 8, zIndex: 30 }}>{actionSlot}</div> : null}
    </article>
  );
}
