"use client";

import { useFormStatus } from "react-dom";
import { deleteWorkout } from "./actions";

function DeleteSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm("Delete this plan?")) event.preventDefault();
      }}
      className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  return (
    <form action={deleteWorkout}>
      <input type="hidden" name="workoutId" value={workoutId} />
      <DeleteSubmit />
    </form>
  );
}
