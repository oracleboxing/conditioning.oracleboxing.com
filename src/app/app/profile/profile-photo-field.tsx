"use client";

import { useRef, useState } from "react";

export function ProfilePhotoField({ avatarUrl, initials }: { avatarUrl: string; initials: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState(avatarUrl);

  return (
    <div className="flex items-center gap-4">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-full bg-slate-100 object-cover" />
      ) : (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-slate-100 text-base font-semibold text-slate-600">{initials}</div>
      )}

      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
          Edit photo
        </button>
        <p className="mt-2 text-xs text-slate-400">JPG, PNG, WebP or GIF. Max 5MB.</p>
      </div>

      <input
        ref={inputRef}
        name="avatar"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPreviewUrl(URL.createObjectURL(file));
        }}
      />
    </div>
  );
}
