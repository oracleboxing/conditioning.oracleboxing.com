export type CreateBackTarget = {
  href: string;
  label: string;
};

function safeLocalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/app/create")) return null;
  return value;
}

function labelForPath(path: string) {
  if (path === "/app") return "home";
  if (path.startsWith("/app/workouts")) return "plans";
  if (path.startsWith("/app/community")) return "team";
  if (path.startsWith("/app/profile")) return "profile";
  if (path.startsWith("/workouts/")) return "plan";
  return "home";
}

export function createBackTarget(nextPath: string | null, sessionId: string | null): CreateBackTarget {
  const safeNext = safeLocalPath(nextPath);
  if (safeNext) return { href: safeNext, label: labelForPath(safeNext) };
  if (sessionId) return { href: "/app/workouts", label: "plans" };
  return { href: "/app", label: "home" };
}
