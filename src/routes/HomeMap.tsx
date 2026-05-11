import { useCallback, useEffect, useRef, useState } from "react";
import { useRoadmap } from "@/data/useRoadmap";
import { MapCanvas, type MapCanvasHandle } from "@/map/MapCanvas";
import { ZOOM } from "@/map/tokens";
import { TopBar } from "@/components/TopBar";
import { ZoomControls } from "@/components/ZoomControls";
import { SidePanel } from "@/components/SidePanel";
import { SearchBar } from "@/components/SearchBar";
import { MiniMap } from "@/components/MiniMap";

export default function HomeMap() {
  const { doc, layout, loading, error } = useRoadmap();
  const canvasRef = useRef<MapCanvasHandle | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [zoom, setZoom] = useState(ZOOM.initial);

  // Ctrl + F opens search (capture phase tries to beat the browser Find bar).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCtrlF =
        e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "f";
      if (isCtrlF) {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const handleJumpTo = useCallback((id: string) => {
    setSelectedId(id);
    canvasRef.current?.flyTo(id);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="font-hand text-3xl text-ink/60">
          Veloxis AI · loading roadmap…
        </span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <span className="text-red-500">数据加载失败：{error}</span>
        <span className="text-xs text-ink/50">
          请确认 public/data/roadmap.json 已生成（npm run data）
        </span>
      </div>
    );
  }
  if (!layout || !doc) return null;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MapCanvas
        ref={canvasRef}
        layout={layout}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        onZoomChange={setZoom}
      />
      <TopBar />
      <ZoomControls
        zoom={zoom}
        onZoomIn={() => canvasRef.current?.zoomBy(1.4)}
        onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.4)}
        onReset={() => {
          setSelectedId(null);
          canvasRef.current?.reset();
        }}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <MiniMap layout={layout} onJumpTo={handleJumpTo} />
      <SidePanel
        nodeId={selectedId}
        layout={layout}
        onClose={() => setSelectedId(null)}
        onJumpTo={handleJumpTo}
      />
      <SearchBar
        open={searchOpen}
        layout={layout}
        onClose={() => setSearchOpen(false)}
        onPick={handleJumpTo}
      />
    </div>
  );
}
