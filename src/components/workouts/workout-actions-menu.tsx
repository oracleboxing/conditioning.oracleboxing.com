"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MenuItem = "edit" | "download" | "save" | "delete";

const WORKOUT_MENU_ITEMS: MenuItem[] = ["edit", "download", "save", "delete"];

export function WorkoutActionsMenu({ workoutId, saveTargetWorkoutId, chatSessionId, canEdit = false, canDelete = false, canSave = false, initiallySaved = false, compact = false }: { workoutId: string; saveTargetWorkoutId?: string | null; chatSessionId?: string | null; canEdit?: boolean; canDelete?: boolean; canSave?: boolean; initiallySaved?: boolean; compact?: boolean }) {
  const router = useRouter();
  const startsSaved = initiallySaved || Boolean(saveTargetWorkoutId);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(startsSaved);
  const [saveLabel, setSaveLabel] = useState(startsSaved ? "Remove" : "Save workout");
  const [editLabel, setEditLabel] = useState("Edit");
  const [deleteLabel, setDeleteLabel] = useState("Delete");
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !dropdownRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function toggleMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 172;
      const padding = 12;
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: Math.max(padding, Math.min(rect.right - width, window.innerWidth - width - padding)),
        width,
        zIndex: 999999,
      });
    }
    setOpen((current) => !current);
  }


  function downloadPdf() {
    setOpen(false);
    window.location.href = `/api/workouts/${workoutId}/pdf`;
  }

  async function openEditChat() {
    if (chatSessionId) {
      setOpen(false);
      router.push(`/app/create?sessionId=${chatSessionId}&next=${encodeURIComponent(`/workouts/${workoutId}`)}`);
      return;
    }

    setEditLabel("Opening...");
    try {
      const response = await fetch(`/api/workouts/${workoutId}/edit-session`, { method: "POST" });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) throw new Error(payload.message ?? "Could not open edit chat.");
      setOpen(false);
      router.push(payload.url);
      router.refresh();
    } catch {
      setEditLabel("Try again");
      window.setTimeout(() => setEditLabel("Edit"), 1600);
    }
  }

  async function deleteWorkout() {
    if (!window.confirm("Delete this plan?")) return;

    setDeleteLabel("Deleting...");
    try {
      const response = await fetch(`/api/workouts/${workoutId}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not delete workout.");
      setOpen(false);
      window.dispatchEvent(new CustomEvent("workout-removed", { detail: { workoutId } }));
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: "Plan deleted" } }));
      router.push("/app/workouts");
      router.refresh();
    } catch {
      setDeleteLabel("Try again");
      window.setTimeout(() => setDeleteLabel("Delete"), 1600);
    }
  }

  async function toggleSaveWorkout() {
    setSaveLabel(saved ? "Unsaving..." : "Saving...");
    try {
      const response = await fetch(`/api/workouts/${saveTargetWorkoutId ?? workoutId}/save`, { method: saved ? "DELETE" : "POST" });
      const payload = (await response.json()) as { saved?: boolean; message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not update save state.");

      const nextSaved = Boolean(payload.saved);
      setSaved(nextSaved);
      setSaveLabel(nextSaved ? "Remove" : "Save workout");
      setOpen(false);
      if (!nextSaved) {
        window.dispatchEvent(new CustomEvent("workout-removed", { detail: { workoutId } }));
        window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: "Plan removed" } }));
      }
      router.refresh();
    } catch {
      setSaveLabel("Try again");
      window.setTimeout(() => setSaveLabel(saved ? "Remove" : "Save workout"), 1600);
    }
  }

  function renderItem(item: MenuItem) {
    if (item === "edit" && canEdit) {
      return (
        <button key={item} type="button" onClick={() => void openEditChat()} className="block w-full rounded-2xl px-4 py-3 text-left transition hover:bg-zinc-100">
          {editLabel}
        </button>
      );
    }

    if (item === "download") {
      return (
        <button key={item} type="button" onClick={downloadPdf} className="block w-full rounded-2xl px-4 py-3 text-left transition hover:bg-zinc-100">
          Download PDF
        </button>
      );
    }

    if (item === "save" && canSave) {
      return (
        <button key={item} type="button" onClick={() => void toggleSaveWorkout()} className="block w-full rounded-2xl px-4 py-3 text-left transition hover:bg-zinc-100">
          {saveLabel}
        </button>
      );
    }


    if (item === "delete" && canDelete) {
      return (
        <button key={item} type="button" onClick={() => void deleteWorkout()} className="block w-full rounded-2xl px-4 py-3 text-left text-red-600 transition hover:bg-red-50">
          {deleteLabel}
        </button>
      );
    }

    return null;
  }

  return (
    <div ref={menuRef} className="relative" style={{ position: "relative", zIndex: open ? 1000 : 1 }}>
      <button
        type="button"
        aria-label="Workout actions"
        aria-haspopup="menu"
        aria-expanded={open}
        ref={buttonRef}
        onClick={toggleMenu}
        style={{
          display: "grid",
          placeItems: "center",
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          borderRadius: 9999,
          border: "1px solid #e4e4e7",
          background: "rgba(255,255,255,0.96)",
          color: "#52525b",
          fontSize: compact ? 16 : 18,
          fontWeight: 800,
          lineHeight: 1,
          boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
          cursor: "pointer",
        }}
      >
        ⋯
      </button>

      {open ? createPortal(
        <div
          ref={dropdownRef}
          role="menu"
          style={{
            ...menuStyle,
            overflow: "hidden",
            borderRadius: 18,
            border: "1px solid #e4e4e7",
            background: "rgba(255,255,255,0.98)",
            padding: 6,
            fontSize: 12.5,
            fontWeight: 650,
            lineHeight: 1.1,
            color: "#3f3f46",
            boxShadow: "0 18px 50px rgba(15,23,42,0.18)",
            whiteSpace: "nowrap",
          }}
        >
          {WORKOUT_MENU_ITEMS.map((item) => renderItem(item))}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
