import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/app-user";
import { getProfileForUser } from "@/lib/auth/profile";
import { AppShell } from "./app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) redirect("/login?next=/app");

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
