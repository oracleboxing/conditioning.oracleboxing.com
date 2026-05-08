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

function rowHasPremiumTier(row: { active?: boolean | null; tier?: string | null } | null) {
  return Boolean(row?.active && PREMIUM_TIERS.has(String(row.tier ?? "").toLowerCase()));
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
    const query = supabase
      .from("member_access")
      .select("active,tier")
      .eq("active", true);

    const { data, error } = email
      ? await query.or(`user_id.eq.${user.id},email.eq.${email}`)
      : await query.eq("user_id", user.id);

    if (error) {
      return false;
    }

    return (data ?? []).some((row) => rowHasPremiumTier(row));
  } catch {
    return false;
  }
}
