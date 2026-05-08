"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";

function cleanWorkoutId(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^[0-9a-f-]{32,36}$/i.test(value) ? value : null;
}

export async function deleteWorkout(formData: FormData) {
  const workoutId = cleanWorkoutId(formData.get("workoutId"));
  if (!workoutId) redirect("/app/workouts?state=error");

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/app/workouts");

  const { data: workout, error: lookupError } = await supabase.from("workouts").select("id").eq("id", workoutId).eq("user_id", user.id).maybeSingle();
  if (lookupError) redirect(`/app/workouts?state=error&message=${encodeURIComponent(lookupError.message)}`);
  if (!workout) redirect("/app/workouts?state=missing");

  await supabase.from("workout_chat_sessions").update({ workout_id: null }).eq("workout_id", workoutId).eq("user_id", user.id);

  const { error: itemsError } = await supabase.from("workout_items").delete().eq("workout_id", workoutId);
  if (itemsError) redirect(`/app/workouts?state=error&message=${encodeURIComponent(itemsError.message)}`);

  const { error: workoutError } = await supabase.from("workouts").delete().eq("id", workoutId).eq("user_id", user.id);
  if (workoutError) redirect(`/app/workouts?state=error&message=${encodeURIComponent(workoutError.message)}`);

  revalidatePath("/app/workouts");
  revalidatePath("/app");
  redirect("/app/workouts?state=deleted");
}
