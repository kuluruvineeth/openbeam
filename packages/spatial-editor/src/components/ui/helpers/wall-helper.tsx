export function WallHelper() {
  return (
    <div className="-translate-y-1/2 pointer-events-none fixed top-1/2 right-4 z-40 flex flex-col gap-2 rounded-[14px] border border-[#3b3b36] bg-[#242422] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2 text-sm">
        <kbd className="rounded bg-[#353530] px-2 py-1 font-medium text-xs">
          Shift
        </kbd>
        <span className="text-[#76766e]">Allow non-45° angles</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <kbd className="rounded bg-[#353530] px-2 py-1 font-medium text-xs">
          Esc
        </kbd>
        <span className="text-[#76766e]">Cancel</span>
      </div>
    </div>
  );
}
