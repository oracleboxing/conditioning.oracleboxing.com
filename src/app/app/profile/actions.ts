"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";

function cleanName(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 80) : "";
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function isMissingProfilesTable(error: { code?: string; message: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || /profiles.*(does not exist|schema cache)/i.test(error.message);
}

export async function updateProfile(formData: FormData) {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/app/profile");

  const firstName = cleanName(formData.get("firstName"));
  const lastName = cleanName(formData.get("lastName"));
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Member";
  const avatarFile = formData.get("avatar");
  let avatarUrl = typeof formData.get("currentAvatarUrl") === "string" ? String(formData.get("currentAvatarUrl")) : "";

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith("image/")) {
      redirect("/app/profile?state=error&message=Upload%20an%20image%20file.");
    }

    if (avatarFile.size > 5 * 1024 * 1024) {
      redirect("/app/profile?state=error&message=Profile%20picture%20must%20be%20under%205MB.");
    }

    const path = `${user.id}/avatar-${Date.now()}.${extensionFor(avatarFile)}`;
    const { error: uploadError } = await supabase.storage.from("profile-images").upload(path, avatarFile, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) {
      redirect(`/app/profile?state=error&message=${encodeURIComponent(uploadError.message)}`);
    }

    const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
    avatarUrl = data.publicUrl;
  }

  const profilePayload = {
    id: user.id,
    email: user.email ?? null,
    first_name: firstName || null,
    last_name: lastName || null,
    display_name: displayName,
    avatar_url: avatarUrl || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(
    profilePayload,
    { onConflict: "id" },
  );

  if (error && !isMissingProfilesTable(error)) {
    redirect(`/app/profile?state=error&message=${encodeURIComponent(error.message)}`);
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      first_name: firstName || null,
      last_name: lastName || null,
      avatar_url: avatarUrl || null,
      full_name: displayName,
      name: displayName,
    },
  });

  if (authError) redirect(`/app/profile?state=error&message=${encodeURIComponent(authError.message)}`);

  revalidatePath("/app");
  revalidatePath("/app/profile");
  redirect("/app/profile?state=saved");
}
