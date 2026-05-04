import { pickVisible } from "@/map/lod";

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onOpenSearch: () => void;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onOpenSearch,
}: Props) {
  const lod = pickVisible(zoom);
  return (
    <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl bg-white/90 p-2 shadow-soft backdrop-blur">
        <button
          aria-label="zoom in"
          onClick={onZoomIn}
          className="h-9 w-9 rounded-xl bg-black/5 text-lg hover:bg-black/10"
        >
          +
        </button>
        <button
          aria-label="zoom out"
          onClick={onZoomOut}
          className="h-9 w-9 rounded-xl bg-black/5 text-lg hover:bg-black/10"
        >
          −
        </button>
        <button
          aria-label="reset"
          onClick={onReset}
          className="h-9 rounded-xl bg-black/5 px-3 text-sm hover:bg-black/10"
        >
          重置
        </button>
        <button
          aria-label="search"
          onClick={onOpenSearch}
          className="h-9 rounded-xl bg-ink px-3 text-sm font-semibold text-white hover:opacity-90"
        >
          搜索 ⌘K
        </button>
      </div>
      <div className="rounded-xl bg-white/85 px-3 py-1.5 text-xs text-ink/70 shadow-soft">
        {lod.hint}
        <span className="ml-2 text-ink/40">×{zoom.toFixed(2)}</span>
      </div>
    </div>
  );
}
