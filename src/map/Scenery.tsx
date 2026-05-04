import { memo } from "react";
import type { RoadmapLayout } from "@/data/types";
import { isoProject } from "./iso";
import { COLOR } from "./tokens";

interface Props {
  layout: RoadmapLayout;
}

/** A purely decorative layer: distant mountains drawn with a couple of soft
 * polylines, plus a "lake" in the empty (1,1) cell, plus the cream-colored
 * main road that traces the canonical learning path.
 *
 * Drawn beneath everything else. */
function SceneryImpl({ layout }: Props) {
  const { bounds } = layout;
  const padX = 320;
  const padY = 200;
  const x0 = bounds.minX - padX;
  const x1 = bounds.maxX + padX;
  const y0 = bounds.minY - padY;
  const y1 = bounds.maxY + padY;

  // Project the four world corners to set up our background bbox.
  const corners = [
    isoProject(x0, y0, 0),
    isoProject(x1, y0, 0),
    isoProject(x1, y1, 0),
    isoProject(x0, y1, 0),
  ];
  const groundPath = `M ${corners[0].sx} ${corners[0].sy} L ${corners[1].sx} ${corners[1].sy} L ${corners[2].sx} ${corners[2].sy} L ${corners[3].sx} ${corners[3].sy} Z`;

  // Build a soft "far mountain" silhouette along the back edge.
  const mountainPts: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wx = x0 + (x1 - x0) * t;
    const noise =
      Math.sin(t * 8.3 + 0.7) * 16 +
      Math.sin(t * 3.1 + 2.1) * 30 +
      Math.cos(t * 17.2) * 6;
    const wy = y0 - 40 - 70 - noise;
    const p = isoProject(wx, wy, 70 + noise);
    mountainPts.push(`${p.sx.toFixed(1)},${p.sy.toFixed(1)}`);
  }
  const mountainBaseLeft = isoProject(x0, y0 - 40, 0);
  const mountainBaseRight = isoProject(x1, y0 - 40, 0);
  const mountainPath = `M ${mountainBaseLeft.sx} ${mountainBaseLeft.sy} L ${mountainPts.join(
    " L "
  )} L ${mountainBaseRight.sx} ${mountainBaseRight.sy} Z`;

  // Lake in the central empty cell (col=1, row=1) — center is at (0, 0).
  const lakeR = 220;
  const lakePts: string[] = [];
  const lakeSteps = 36;
  for (let i = 0; i <= lakeSteps; i++) {
    const a = (i / lakeSteps) * Math.PI * 2;
    const wobble = 1 + Math.sin(a * 3) * 0.08 + Math.cos(a * 5) * 0.04;
    const wx = Math.cos(a) * lakeR * wobble;
    const wy = Math.sin(a) * lakeR * 0.85 * wobble;
    const p = isoProject(wx, wy, 0);
    lakePts.push(`${p.sx.toFixed(1)},${p.sy.toFixed(1)}`);
  }
  const lakePath = `M ${lakePts.join(" L ")} Z`;

  // Main learning road: connect district centers in canonical order.
  const PATH = ["P0", "P1", "P2", "P3", "P4", "P5", "P6"];
  const stops = PATH.map((id) => layout.districts.find((d) => d.node.id === id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .map((d) => isoProject(d.cx, d.cy, 0));
  let roadPath = "";
  if (stops.length > 1) {
    roadPath = `M ${stops[0].sx} ${stops[0].sy}`;
    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1];
      const cur = stops[i];
      const cx = (prev.sx + cur.sx) / 2;
      const cy = (prev.sy + cur.sy) / 2 - 30;
      roadPath += ` Q ${cx} ${cy} ${cur.sx} ${cur.sy}`;
    }
  }

  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="ground-bg" cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor="#fdfbf4" />
          <stop offset="100%" stopColor="#e7efe5" />
        </radialGradient>
        <linearGradient id="mountain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={COLOR.mountainFar} stopOpacity={0.8} />
          <stop offset="100%" stopColor={COLOR.mountainNear} stopOpacity={0.3} />
        </linearGradient>
      </defs>

      <path d={groundPath} fill="url(#ground-bg)" />
      <path d={mountainPath} fill="url(#mountain-grad)" />
      {/* nearer ridge */}
      <path
        d={mountainPath}
        fill={COLOR.mountainNear}
        opacity={0.45}
        transform="translate(40,28)"
      />

      {/* lake */}
      <path d={lakePath} fill={COLOR.water} stroke="#9bc4d3" strokeOpacity={0.6} strokeWidth={1.2} />
      <path d={lakePath} fill="none" stroke="white" strokeOpacity={0.55} strokeWidth={0.8} transform="translate(2,2)" />

      {/* main road */}
      {roadPath && (
        <>
          <path d={roadPath} fill="none" stroke={COLOR.road} strokeWidth={26} strokeLinecap="round" strokeOpacity={0.9} />
          <path d={roadPath} fill="none" stroke={COLOR.roadInk} strokeWidth={1.2} strokeDasharray="6 8" strokeOpacity={0.6} />
        </>
      )}
    </g>
  );
}

export const Scenery = memo(SceneryImpl);
