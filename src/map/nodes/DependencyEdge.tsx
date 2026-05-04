import { memo } from "react";
import type { PlacedDependency, RoadmapLayout } from "@/data/types";
import { isoProject } from "@/map/iso";

interface Props {
  dep: PlacedDependency;
  layout: RoadmapLayout;
  opacity: number;
}

function DependencyEdgeImpl({ dep, layout, opacity }: Props) {
  const from = layout.positionsById.get(dep.fromId);
  const to = layout.positionsById.get(dep.toId);
  if (!from || !to) return null;

  const a = isoProject(from.cx, from.cy, 6);
  const b = isoProject(to.cx, to.cy, 6);
  const mx = (a.sx + b.sx) / 2;
  // Pull the curve up so it visually arches over the map.
  const dy = -Math.hypot(a.sx - b.sx, a.sy - b.sy) * 0.18;
  const my = (a.sy + b.sy) / 2 + dy;

  const d = `M ${a.sx} ${a.sy} Q ${mx} ${my} ${b.sx} ${b.sy}`;

  return (
    <g style={{ opacity }} pointerEvents="none">
      <path
        d={d}
        fill="none"
        stroke="#1f2937"
        strokeOpacity={0.35}
        strokeWidth={0.9}
        strokeDasharray="3 4"
      />
      <circle cx={b.sx} cy={b.sy} r={1.6} fill="#1f2937" opacity={0.5} />
    </g>
  );
}

export const DependencyEdge = memo(DependencyEdgeImpl);
