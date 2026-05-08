import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "invalid_workout" }, { status: 400 });

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: workout, error: lookupError } = await supabase.from("workouts").select("id,user_id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (lookupError) return Response.json({ error: "lookup_failed", message: lookupError.message }, { status: 500 });
  if (!workout) return Response.json({ error: "not_found", message: "Workout not found." }, { status: 404 });

  const { error: sessionError } = await supabase.from("workout_chat_sessions").update({ workout_id: null }).eq("workout_id", id).eq("user_id", user.id);
  if (sessionError) return Response.json({ error: "session_cleanup_failed", message: sessionError.message }, { status: 500 });

  const { error: itemsError } = await supabase.from("workout_items").delete().eq("workout_id", id);
  if (itemsError) return Response.json({ error: "items_delete_failed", message: itemsError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  if (deleteError) return Response.json({ error: "delete_failed", message: deleteError.message }, { status: 500 });

  revalidatePath("/app");
  revalidatePath("/app/workouts");
  revalidatePath("/app/community");

  return Response.json({ deleted: true });
}
