import { cache } from "react";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { ProfileRow } from "@/lib/supabase/types";

export const getProfileForUser = cache(async (userId: string): Promise<ProfileRow | null> => {
  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,first_name,last_name,display_name,avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return error ? null : ((data as ProfileRow | null) ?? null);
});
