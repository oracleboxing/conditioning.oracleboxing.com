import { ExerciseLibrarySearch } from "./exercise-library-search";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  return (
    <div className="space-y-6 pb-4">
      <header className="flex justify-center pt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://sb.oracleboxing.com/logo/long_dark.webp" alt="Oracle Boxing" className="h-7 w-auto object-contain" />
      </header>

      <ExerciseLibrarySearch />
    </div>
  );
}
