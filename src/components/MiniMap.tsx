import { useMemo } from "react";
import type { RoadmapLayout } from "@/data/types";
import { themeFor } from "@/data/theme";
import { isoProject } from "@/map/iso";

interface Props {
  layout: RoadmapLayout;
  onJumpTo: (id: string) => void;
}

const MM_W = 220;
const MM_H = 150;

export function MiniMap({ layout, onJumpTo }: Props) {
  const data = useMemo(() => {
    // Project all districts and find screen-bounding box for the mini-map.
    const dots = layout.districts.map((d) => ({
      id: d.node.id,
      label: themeFor(d.themeId).subtitle,
      theme: themeFor(d.themeId),
      proj: isoProject(d.cx, d.cy, 0),
      half: d.half,
    }));
    const corners = layout.districts.flatMap((d) => [
      isoProject(d.cx - d.half, d.cy - d.half, 0),
      isoProject(d.cx + d.half, d.cy + d.half, 0),
      isoProject(d.cx + d.half, d.cy - d.half, 0),
      isoProject(d.cx - d.half, d.cy + d.half, 0),
    ]);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    corners.forEach((p) => {
      if (p.sx < minX) minX = p.sx;
      if (p.sx > maxX) maxX = p.sx;
      if (p.sy < minY) minY = p.sy;
      if (p.sy > maxY) maxY = p.sy;
    });
    const padX = 30;
    const padY = 22;
    minX -= padX;
    maxX += padX;
    minY -= padY;
    maxY += padY;
    const sx = MM_W / (maxX - minX);
    const sy = MM_H / (maxY - minY);
    const s = Math.min(sx, sy);
    const tx = -minX * s + (MM_W - (maxX - minX) * s) / 2;
    const ty = -minY * s + (MM_H - (maxY - minY) * s) / 2;
    return { dots, s, tx, ty };
  }, [layout]);

  return (
    <div className="absolute bottom-6 right-6 z-10 overflow-hidden rounded-2xl bg-white/85 p-2 shadow-soft backdrop-blur">
      <svg width={MM_W} height={MM_H} className="block">
        <rect
          x={0}
          y={0}
          width={MM_W}
          height={MM_H}
          fill="#dceef3"
          rx={10}
        />
        <g transform={`translate(${data.tx}, ${data.ty}) scale(${data.s})`}>
          {data.dots.map((dot) => (
            <g
              key={dot.id}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onJumpTo(dot.id);
              }}
            >
              <circle
                cx={dot.proj.sx}
                cy={dot.proj.sy}
                r={dot.half * 0.55}
                fill={dot.theme.ground[1]}
                stroke={dot.theme.side}
                strokeWidth={3}
                opacity={0.85}
              />
              <text
                x={dot.proj.sx}
                y={dot.proj.sy + 4}
                textAnchor="middle"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fill: dot.theme.ink,
                }}
              >
                {dot.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <div className="mt-1 px-1 text-[10px] uppercase tracking-wider text-ink/50">
        Mini Map · 点击区块快速跳转
      </div>
    </div>
  );
}
