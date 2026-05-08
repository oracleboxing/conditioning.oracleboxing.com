import { redirect } from "next/navigation";
import type { ProfileRow } from "@/lib/supabase/types";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { signOut } from "../../login/actions";
import { updateProfile } from "./actions";
import { ProfilePhotoField } from "./profile-photo-field";

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
      <section className="space-y-5 px-1 pb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Profile</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your account</h1>
          <p className="mt-2 text-sm leading-5 text-slate-500">Update your photo and name.</p>
        </div>

        {params.state === "saved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Profile updated.</div>
        ) : null}
        {params.state === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{params.message ?? "Could not update profile."}</div>
        ) : null}

        <form action={updateProfile} className="space-y-5">
          <input type="hidden" name="currentAvatarUrl" value={avatarUrl} />
          <ProfilePhotoField avatarUrl={avatarUrl} initials={initials(firstName, lastName, email)} />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600" htmlFor="firstName">
                First name
              </label>
              <input id="firstName" name="firstName" defaultValue={firstName} autoComplete="given-name" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/15" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600" htmlFor="lastName">
                Last name
              </label>
              <input id="lastName" name="lastName" defaultValue={lastName} autoComplete="family-name" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/15" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Email</p>
              <p className="mt-2 truncate text-sm text-slate-950">{email}</p>
            </div>
          </div>

          <button type="submit" className="h-12 w-full rounded-2xl bg-[#007aff] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f96ff]">
            Save profile
          </button>
        </form>

        <form action={signOut} className="pt-1 text-center">
          <button type="submit" className="text-sm font-semibold text-slate-400 hover:text-slate-700">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
