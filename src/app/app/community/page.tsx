import { getAuthenticatedUser } from "@/lib/auth/app-user";
import { getCommunityWorkouts } from "@/lib/community/workouts";
import { CommunityGallery } from "./community-gallery";

export const metadata = {
  title: "Team | Oracle Conditioning",
};

type CommunityPageProps = {
  searchParams: Promise<{ state?: "saved" | "missing" | "error"; message?: string }>;
};

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const params = await searchParams;
  const { user } = await getAuthenticatedUser();
  const { workouts } = await getCommunityWorkouts(user?.id);

  return (
    <div className="space-y-5 text-slate-950">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-2 text-sm leading-5 text-slate-500">See workouts the team has shared and save the ones you want to try.</p>
      </div>
      {params.state === "error" ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{params.message ?? "Could not save workout."}</p> : null}
      <CommunityGallery workouts={workouts} />
    </div>
  );
}
