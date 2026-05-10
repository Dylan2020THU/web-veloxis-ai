import { memo } from "react";
import type { RoadmapLayout } from "@/data/types";
import { isoProject } from "./iso";
import { COLOR } from "./tokens";

interface Props {
  layout: RoadmapLayout;
}

/** A purely decorative layer: full-bleed ground tint, a circular "lake" at the
 * world origin (geometric centre of the four cardinal departments), and four
 * straight cream-coloured roads radiating from the lake out to each department.
 *
 * Render order is `ground → road → lake` so the lake masks the central road
 * convergence — visually the roads "enter" the pond.
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

  // Central lake sitting at the world origin — the geometric centre of the
  // four cardinal departments. The Y-axis radius is squished a touch so the
  // post-iso-projection footprint reads as a pleasingly round pond rather
  // than an over-elongated ellipse.
  const lakeCenter = { x: 0, y: 0 };
  const lakeR = 220;
  const lakePts: string[] = [];
  const lakeSteps = 36;
  for (let i = 0; i <= lakeSteps; i++) {
    const a = (i / lakeSteps) * Math.PI * 2;
    const wobble = 1 + Math.sin(a * 3) * 0.08 + Math.cos(a * 5) * 0.04;
    const wx = lakeCenter.x + Math.cos(a) * lakeR * wobble;
    const wy = lakeCenter.y + Math.sin(a) * lakeR * 0.85 * wobble;
    const p = isoProject(wx, wy, 0);
    lakePts.push(`${p.sx.toFixed(1)},${p.sy.toFixed(1)}`);
  }
  const lakePath = `M ${lakePts.join(" L ")} Z`;

  // Cross-shaped road network: four straight spokes from the central lake out
  // to each cardinal department. Drawn before the lake so the lake hides the
  // central convergence — visually the roads appear to terminate at the pond.
  const center = isoProject(0, 0, 0);
  let roadPath = "";
  layout.districts.forEach((d) => {
    const cur = isoProject(d.cx, d.cy, 0);
    roadPath += `M ${center.sx} ${center.sy} L ${cur.sx} ${cur.sy} `;
  });
  roadPath = roadPath.trim();

  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="ground-bg" cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor="#fdfbf4" />
          <stop offset="100%" stopColor="#e7efe5" />
        </radialGradient>
      </defs>

      <path d={groundPath} fill="url(#ground-bg)" />

      {/* main road — drawn first so the central lake covers the convergence */}
      {roadPath && (
        <>
          <path d={roadPath} fill="none" stroke={COLOR.road} strokeWidth={26} strokeLinecap="round" strokeOpacity={0.9} />
          <path d={roadPath} fill="none" stroke={COLOR.roadInk} strokeWidth={1.2} strokeDasharray="6 8" strokeOpacity={0.6} />
        </>
      )}

      {/* lake — sits on top of the road crossover at the world origin */}
      <path d={lakePath} fill={COLOR.water} stroke="#9bc4d3" strokeOpacity={0.6} strokeWidth={1.2} />
      <path d={lakePath} fill="none" stroke="white" strokeOpacity={0.55} strokeWidth={0.8} transform="translate(2,2)" />
    </g>
  );
}

export const Scenery = memo(SceneryImpl);
