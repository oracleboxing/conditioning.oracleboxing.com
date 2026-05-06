import { CommunityGallery } from "./community-gallery";
import { getCommunityWorkouts } from "@/lib/community/workouts";

export const metadata = {
  title: "Team | Oracle Conditioning",
};

export default async function CommunityPage() {
  const { workouts } = await getCommunityWorkouts();

  return (
    <div className="space-y-5 text-slate-950">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Team</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Shared plans</h1>
        <p className="mt-2 text-sm leading-5 text-slate-500">Browse conditioning sessions from the Oracle crew.</p>
      </div>
      <CommunityGallery workouts={workouts} />
    </div>
  );
}
