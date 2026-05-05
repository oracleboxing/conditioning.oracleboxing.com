import type { SupabaseClient, User } from "@supabase/supabase-js";

const PREMIUM_TIERS = new Set(["premium", "paid", "pro", "vip", "founder", "admin"]);

function normaliseEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function premiumAllowlist() {
  const raw =
    process.env.PREMIUM_ALLOWLIST_EMAILS ??
    process.env.PREMUIM_ALLOWLIST_EMAILS ??
    "";

  return new Set(
    raw
      .split(",")
      .map((email) => normaliseEmail(email))
      .filter(Boolean),
  );
}

export async function hasPremiumAccess(
  supabase: SupabaseClient,
  user: User,
): Promise<boolean> {
  const email = normaliseEmail(user.email);

  if (email && premiumAllowlist().has(email)) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from("member_access")
      .select("active,tier")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return PREMIUM_TIERS.has(String(data.tier ?? "").toLowerCase());
  } catch {
    return false;
  }
}
