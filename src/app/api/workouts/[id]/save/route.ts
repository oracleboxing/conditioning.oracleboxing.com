import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function currentUser() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "invalid_workout" }, { status: 400 });

  const { supabase, user } = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: source, error: sourceError } = await supabase
    .from("workouts")
    .select("id,title,goal,duration_minutes,difficulty,equipment,intake_summary,visibility,user_id")
    .eq("id", id)
    .eq("visibility", "community")
    .maybeSingle();

  if (sourceError) return Response.json({ error: "lookup_failed", message: sourceError.message }, { status: 500 });
  if (!source) return Response.json({ error: "not_found" }, { status: 404 });
  if (source.user_id === user.id) return Response.json({ saved: false, ownWorkout: true });

  const copyMarker = `shared-workout-copy:${id}`;
  const { data: existingCopy } = await supabase.from("workouts").select("id").eq("user_id", user.id).eq("ai_model", copyMarker).maybeSingle();
  if (existingCopy?.id) return Response.json({ saved: true, workoutId: existingCopy.id });

  const { data: newWorkout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      title: source.title,
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

  if (workoutError || !newWorkout) return Response.json({ error: "save_failed", message: workoutError?.message ?? "Could not save workout." }, { status: 500 });

  const { data: items, error: itemsError } = await supabase
    .from("workout_items")
    .select("exercise_id,order_index,block_type,block_title,sets,reps,duration_seconds,rest_seconds,tempo,coaching_note")
    .eq("workout_id", id)
    .order("order_index", { ascending: true });

  if (itemsError) return Response.json({ error: "items_failed", message: itemsError.message }, { status: 500 });

  const newItems = (items ?? []).map((item) => ({ ...item, workout_id: newWorkout.id }));
  if (newItems.length) {
    const { error: insertItemsError } = await supabase.from("workout_items").insert(newItems);
    if (insertItemsError) return Response.json({ error: "items_insert_failed", message: insertItemsError.message }, { status: 500 });
  }

  revalidatePath("/app/workouts");
  revalidatePath("/app/community");
  revalidatePath(`/workouts/${id}`);

  return Response.json({ saved: true, workoutId: newWorkout.id });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "invalid_workout" }, { status: 400 });

  const { supabase, user } = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const copyMarker = `shared-workout-copy:${id}`;
  const { data: copies, error: lookupError } = await supabase.from("workouts").select("id").eq("user_id", user.id).eq("ai_model", copyMarker);
  if (lookupError) return Response.json({ error: "lookup_failed", message: lookupError.message }, { status: 500 });

  const { data: directCopy, error: directLookupError } = await supabase.from("workouts").select("id,ai_model").eq("user_id", user.id).eq("id", id).maybeSingle();
  if (directLookupError) return Response.json({ error: "lookup_failed", message: directLookupError.message }, { status: 500 });

  const copyIds = [
    ...(copies ?? []).map((copy) => copy.id).filter(Boolean),
    ...(directCopy?.ai_model?.startsWith("shared-workout-copy:") ? [directCopy.id] : []),
  ].filter((value, index, values) => values.indexOf(value) === index);
  if (!copyIds.length) return Response.json({ saved: false });

  const { error: sessionError } = await supabase.from("workout_chat_sessions").update({ workout_id: null }).eq("user_id", user.id).in("workout_id", copyIds);
  if (sessionError) return Response.json({ error: "session_cleanup_failed", message: sessionError.message }, { status: 500 });

  const { error: itemsError } = await supabase.from("workout_items").delete().in("workout_id", copyIds);
  if (itemsError) return Response.json({ error: "items_delete_failed", message: itemsError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from("workouts").delete().eq("user_id", user.id).in("id", copyIds);
  if (deleteError) return Response.json({ error: "delete_failed", message: deleteError.message }, { status: 500 });

  revalidatePath("/app/workouts");
  revalidatePath("/app/community");
  revalidatePath(`/workouts/${id}`);

  return Response.json({ saved: false });
}
