"use client";

import Image from "next/image";
import type { PlanPreviewItem, PlanPreviewModel } from "./plan-preview-adapters";

function ExerciseImage({ item }: { item: PlanPreviewItem }) {
  if (!item.imageUrls.length) {
    return (
      <div className="flex h-56 items-center justify-center border-b border-dashed border-zinc-300 bg-zinc-50 text-center text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Exercise image
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden border-b border-zinc-200 bg-zinc-100">
      {item.imageUrls.map((image, imageIndex) => (
        <Image
          key={image}
          src={image}
          alt={`${item.name} image ${imageIndex + 1}`}
          width={720}
          height={540}
          unoptimized
          className={`h-56 min-w-0 flex-1 object-cover sm:h-64 lg:h-72 ${item.imageUrls.length > 1 && imageIndex > 0 ? "border-l border-zinc-200" : ""}`}
        />
      ))}
    </div>
  );
}

function PlanExerciseCard({ item }: { item: PlanPreviewItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <ExerciseImage item={item} />
      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <h3 className="text-lg font-semibold tracking-tight text-black sm:text-xl">{item.name}</h3>
          <p className="text-left text-base font-semibold leading-6 text-black sm:max-w-xs sm:text-right sm:text-lg">{item.prescription}</p>
        </div>
        {item.instructions.length ? (
          <details className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-sm font-semibold text-zinc-700">
              <span>Instructions</span>
              <span className="text-lg leading-none text-zinc-400 transition group-open:rotate-45">+</span>
            </summary>
            <div className="mt-3 space-y-1.5 text-sm leading-6 text-zinc-600">
              {item.instructions.map((instruction, index) => (
                <p key={`${item.id}-instruction-${index}`}>{instruction}</p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export function PlanPreview({ plan }: { plan: PlanPreviewModel }) {
  return (
    <div>
      <header>
        <div className="mt-2">
          <h1 className="max-w-4xl text-2xl font-semibold leading-[1.08] tracking-tight text-black sm:text-3xl">{plan.title}</h1>
        </div>
      </header>

      <div className="mt-6 space-y-5">
        {plan.sections.map((section) => (
          <section key={section.id} className="space-y-5">
            {section.items.map((item) => (
              <PlanExerciseCard key={item.id} item={item} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
