"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";

function cleanWorkoutId(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^[0-9a-f-]{32,36}$/i.test(value) ? value : null;
}

export async function saveSharedWorkout(formData: FormData) {
  const workoutId = cleanWorkoutId(formData.get("workoutId"));
  if (!workoutId) redirect("/app/community?state=error");

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/app/community");

  const { data: source, error: sourceError } = await supabase
    .from("workouts")
    .select("id,title,goal,duration_minutes,difficulty,equipment,intake_summary,ai_model,visibility,user_id")
    .eq("id", workoutId)
    .eq("visibility", "community")
    .maybeSingle();

  if (sourceError) redirect(`/app/community?state=error&message=${encodeURIComponent(sourceError.message)}`);
  if (!source) redirect("/app/community?state=missing");

  const copyMarker = `shared-workout-copy:${workoutId}`;
  const { data: existingCopy } = await supabase.from("workouts").select("id").eq("user_id", user.id).eq("ai_model", copyMarker).maybeSingle();

  if (existingCopy?.id) {
    revalidatePath("/app/workouts");
    revalidatePath("/app/community");
    redirect("/app/community?state=saved");
  }

  const { data: newWorkout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      title: `${source.title}`,
      goal: source.goal,
      duration_minutes: source.duration_minutes,
      difficulty: source.difficulty,
      equipment: source.equipment ?? [],
      visibility: "private",
      intake_summary: source.intake_summary,
      ai_model: copyMarker,
    })
    .select("id")
    .single();

  if (workoutError || !newWorkout) redirect(`/app/community?state=error&message=${encodeURIComponent(workoutError?.message ?? "Could not save workout.")}`);

  const { data: items, error: itemsError } = await supabase
    .from("workout_items")
    .select("exercise_id,order_index,block_type,block_title,sets,reps,duration_seconds,rest_seconds,tempo,coaching_note")
    .eq("workout_id", workoutId)
    .order("order_index", { ascending: true });

  if (itemsError) redirect(`/app/community?state=error&message=${encodeURIComponent(itemsError.message)}`);

  const newItems = (items ?? []).map((item) => ({ ...item, workout_id: newWorkout.id }));
  if (newItems.length) {
    const { error: insertItemsError } = await supabase.from("workout_items").insert(newItems);
    if (insertItemsError) redirect(`/app/community?state=error&message=${encodeURIComponent(insertItemsError.message)}`);
  }

  revalidatePath("/app/workouts");
  revalidatePath("/app/community");
  redirect("/app/community?state=saved");
}
