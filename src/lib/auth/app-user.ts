import { cache } from "react";
import { createAuthClient } from "@/lib/supabase/auth-server";

export const getAuthenticatedUser = cache(async () => {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
});
