import { NextRequest } from "next/server";
import { searchExercises } from "@/lib/exercises/search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const result = await searchExercises({
      q: searchParams.get("q"),
      equipment: searchParams.get("equipment"),
      category: searchParams.get("category"),
      muscle: searchParams.get("muscle"),
      level: searchParams.get("level"),
      difficulty: searchParams.get("difficulty"),
      limit: searchParams.get("limit"),
    });

    return Response.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Exercise search failed.";

    return Response.json(
      {
        error: "exercise_search_failed",
        message,
      },
      { status: 500 },
    );
  }
}
