import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkoutDetail } from "@/components/workouts/workout-detail";
import { getWorkoutById } from "@/lib/workouts/data";

type WorkoutPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: WorkoutPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getWorkoutById(id);

  if (result.status === "not-found") {
    return { title: "Workout not found | Oracle Conditioning" };
  }

  return {
    title: `${result.workout.title} | Oracle Conditioning`,
    description: result.workout.goal ?? "Saved Oracle Conditioning workout.",
  };
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const { id } = await params;
  const result = await getWorkoutById(id);

  if (result.status === "not-found") {
    notFound();
  }

  return <WorkoutDetail workout={result.workout} notice={result.notice} />;
}
