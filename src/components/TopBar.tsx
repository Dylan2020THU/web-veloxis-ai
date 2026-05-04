import type { RoadmapStats } from "@/data/types";

interface Props {
  stats?: RoadmapStats;
}

export function TopBar({ stats }: Props) {
  return (
    <header className="absolute left-6 top-6 z-10 rounded-2xl bg-white/90 px-4 py-3 shadow-soft backdrop-blur">
      <div className="flex items-baseline gap-3">
        <h1 className="font-hand text-2xl font-bold text-ink">
          Veloxis<span className="text-ink/40"> · </span>
          <span style={{ color: "#5b3fa0" }}>AI</span>
        </h1>
        <span className="text-xs text-ink/55">True Intelligence Roadmap</span>
      </div>
      {stats && (
        <div className="mt-1 text-[11px] text-ink/55">
          {stats.districts} 个学院 · {stats.totalNodes} 个节点 ·{" "}
          {stats.leafNodes} 个技术点
        </div>
      )}
    </header>
  );
}
