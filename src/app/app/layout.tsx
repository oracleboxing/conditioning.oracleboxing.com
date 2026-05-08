import { redirect } from "next/navigation";
import { hasPremiumAccess } from "@/lib/auth/access";
import { getAuthenticatedUser } from "@/lib/auth/app-user";
import { getProfileForUser } from "@/lib/auth/profile";
import { signOut } from "../login/actions";
import { AppShell } from "./app-shell";

export const dynamic = "force-dynamic";

function PremiumRequired({ email }: { email?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-8 text-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Premium access required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {email ? `${email} is signed in, but does not have access yet.` : "This account does not have access yet."}
        </p>
        <form action={signOut} className="mt-6">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) redirect("/login?next=/app");

  const premium = await hasPremiumAccess(supabase, user);
  if (!premium) return <PremiumRequired email={user.email ?? undefined} />;

  const profile = await getProfileForUser(user.id);
  const metadata = user.user_metadata ?? {};
  const metadataName = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : "";
  const firstName = profile?.first_name || (typeof metadata.first_name === "string" ? metadata.first_name : "") || metadataName.split(" ").filter(Boolean)[0] || user.email?.split("@")[0] || "Member";
  const displayName = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || metadataName || user.email?.split("@")[0] || "Member";
  const avatarUrl = profile?.avatar_url || (typeof metadata.avatar_url === "string" ? metadata.avatar_url : null);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AppShell user={{ email: user.email ?? "Member", displayName, firstName, avatarUrl }}>
        {children}
      </AppShell>
    </main>
  );
}
