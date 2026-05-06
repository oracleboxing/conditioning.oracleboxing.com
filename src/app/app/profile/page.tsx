import { redirect } from "next/navigation";
import type { ProfileRow } from "@/lib/supabase/types";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  searchParams: Promise<{
    state?: "saved" | "error";
    message?: string;
  }>;
};

function fallbackName(userMetadata: Record<string, unknown>, key: string) {
  const value = userMetadata[key];
  return typeof value === "string" ? value : "";
}

function initials(firstName: string, lastName: string, email: string) {
  const source = [firstName, lastName].filter(Boolean).join(" ") || email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "M";
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/app/profile");

  const { data, error } = await supabase.from("profiles").select("id,email,first_name,last_name,display_name,avatar_url,created_at,updated_at").eq("id", user.id).maybeSingle();
  const profile = error ? null : (data as ProfileRow | null);
  const metadata = user.user_metadata ?? {};
  const fullName = fallbackName(metadata, "full_name") || fallbackName(metadata, "name");
  const splitName = fullName.split(" ").filter(Boolean);
  const firstName = profile?.first_name || fallbackName(metadata, "first_name") || splitName[0] || "";
  const lastName = profile?.last_name || fallbackName(metadata, "last_name") || splitName.slice(1).join(" ") || "";
  const avatarUrl = profile?.avatar_url || fallbackName(metadata, "avatar_url") || "";
  const email = user.email ?? profile?.email ?? "Member";

  return (
    <main className="w-full text-slate-950">
      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Profile</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your account</h1>
          <p className="mt-2 text-sm leading-5 text-slate-500">Update your name and profile picture.</p>
        </div>

        {params.state === "saved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Profile updated.</div>
        ) : null}
        {params.state === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{params.message ?? "Could not update profile."}</div>
        ) : null}

        <form action={updateProfile} className="space-y-4">
          <input type="hidden" name="currentAvatarUrl" value={avatarUrl} />
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover" />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-slate-100 text-xl font-semibold text-slate-600">{initials(firstName, lastName, email)}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold tracking-tight text-slate-950">{[firstName, lastName].filter(Boolean).join(" ") || email}</p>
                <p className="mt-1 truncate text-sm text-slate-500">{email}</p>
                <label htmlFor="avatar" className="mt-3 inline-flex cursor-pointer rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                  Edit photo
                </label>
              </div>
              <input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">PNG, JPG, WebP, or GIF. Max 5MB.</p>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Name</p>
              <p className="mt-1 text-sm text-slate-500">Shown across your account.</p>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="firstName">
                  First name
                </label>
                <input id="firstName" name="firstName" defaultValue={firstName} autoComplete="given-name" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="lastName">
                  Last name
                </label>
                <input id="lastName" name="lastName" defaultValue={lastName} autoComplete="family-name" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-slate-400" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Email</p>
            <p className="mt-2 truncate text-sm font-medium text-slate-950">{email}</p>
          </div>

          <button type="submit" className="h-12 w-full rounded-2xl bg-black px-5 text-sm font-semibold text-white hover:bg-slate-800">
            Save profile
          </button>
        </form>
      </section>
    </main>
  );
}
