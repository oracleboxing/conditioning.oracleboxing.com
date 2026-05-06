import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkoutDetail } from "@/components/workouts/workout-detail";
import { getWorkoutById } from "@/lib/workouts/data";

type WorkoutPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: WorkoutPageProps): Promise<Metadata> {
  await params;

  return {
    title: "Plan | Oracle Conditioning",
    description: "Saved Oracle Conditioning plan.",
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
