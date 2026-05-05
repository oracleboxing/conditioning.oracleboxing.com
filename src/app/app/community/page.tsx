import { CommunityGallery } from "./community-gallery";
import { getCommunityWorkouts } from "@/lib/community/workouts";

export const metadata = {
  title: "Community | Oracle Conditioning",
};

export default async function CommunityPage() {
  const { workouts } = await getCommunityWorkouts();

  return (
    <div className="space-y-6 text-slate-950">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <p className="mt-2 text-sm text-slate-500">Member-shared workouts.</p>
      </div>
      <CommunityGallery workouts={workouts} />
    </div>
  );
}
