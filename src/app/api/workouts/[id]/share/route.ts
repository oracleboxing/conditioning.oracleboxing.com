import { NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/auth-server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "invalid_workout" }, { status: 400 });

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("workouts").update({ visibility: "community" }).eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: "share_failed", message: error.message }, { status: 500 });

  const url = new URL(`/workouts/${id}`, request.url).toString();
  return Response.json({ url });
}
