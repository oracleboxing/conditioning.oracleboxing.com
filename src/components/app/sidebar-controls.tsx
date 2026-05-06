export function SidebarToggleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SidebarMenuButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`grid place-items-center rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-950 ${className}`}>
      <SidebarToggleIcon />
    </button>
  );
}
