import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "invalid_workout" }, { status: 400 });

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("id,title,user_id,ai_model")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (workoutError) return Response.json({ error: "lookup_failed", message: workoutError.message }, { status: 500 });
  if (!workout) return Response.json({ error: "not_found", message: "Workout not found." }, { status: 404 });
  if (workout.ai_model?.startsWith("shared-workout-copy:")) return Response.json({ error: "not_editable", message: "Saved copies cannot be edited." }, { status: 403 });

  const { data: existing, error: existingError } = await supabase
    .from("workout_chat_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("workout_id", id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return Response.json({ error: "session_lookup_failed", message: existingError.message }, { status: 500 });
  if (existing?.id) return Response.json({ sessionId: existing.id, url: `/app/create?sessionId=${existing.id}&next=${encodeURIComponent(`/workouts/${id}`)}` });

  const { data: session, error: sessionError } = await supabase
    .from("workout_chat_sessions")
    .insert({
      user_id: user.id,
      workout_id: id,
      title: workout.title,
      status: "active",
      intake_summary: {},
    })
    .select("id")
    .single();

  if (sessionError || !session) return Response.json({ error: "session_create_failed", message: sessionError?.message ?? "Could not create edit chat." }, { status: 500 });

  revalidatePath("/app/workouts");
  revalidatePath(`/workouts/${id}`);

  return Response.json({ sessionId: session.id, url: `/app/create?sessionId=${session.id}&next=${encodeURIComponent(`/workouts/${id}`)}` });
}
