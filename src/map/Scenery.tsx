import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import type { RoadmapLayout } from "@/data/types";
import { isoProject } from "./iso";
import { COLOR } from "./tokens";

interface Props {
  layout: RoadmapLayout;
}

const TAU = Math.PI * 2;

function maxRadiusFromOrigin(
  bounds: RoadmapLayout["bounds"],
  pad: number,
): number {
  const minX = bounds.minX - pad;
  const maxX = bounds.maxX + pad;
  const minY = bounds.minY - pad;
  const maxY = bounds.maxY + pad;
  return Math.max(
    Math.hypot(minX, minY),
    Math.hypot(maxX, minY),
    Math.hypot(maxX, maxY),
    Math.hypot(minX, maxY),
  );
}

/** Gentle irregularity — scaled back for softer, rounder bays. */
function shorelineWobble(a: number): number {
  return (
    42 * Math.sin(3 * a + 0.45) +
    30 * Math.cos(5 * a - 0.35) +
    22 * Math.sin(7 * a + 1.05) +
    16 * Math.cos(11 * a + 0.2)
  );
}

/**
 * Near-heart polar silhouette: swollen toward NE (~π/4), pinched toward SW (~5π/4),
 * south / SW tightened for tapered “tail”; extra ripple keeps outline organic.
 */
function islandRadiusMultiplier(a: number): number {
  const t = ((a % TAU) + TAU) % TAU;
  const towardNE = Math.cos(t - Math.PI / 4);
  const swell = 0.26 * Math.max(0, towardNE) ** 1.25;
  const towardSW = Math.cos(t - (5 * Math.PI) / 4);
  const pinch = 0.3 * Math.max(0, towardSW) ** 1.35;
  const south = Math.max(0, -Math.sin(t));
  const ripple =
    0.055 * Math.sin(3 * t + 0.25) +
    0.04 * Math.cos(5 * t - 0.15) +
    0.03 * Math.sin(7 * t + 0.9);
  return 1 + swell - pinch + south * 0.07 + ripple;
}

type ShoreVertex = { wx: number; wy: number; sx: number; sy: number; a: number };

function buildIslandRing(baseRWorld: number, steps: number): ShoreVertex[] {
  const pts: ShoreVertex[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const mul = islandRadiusMultiplier(a);
    const r = baseRWorld * mul + shorelineWobble(a);
    const wx = Math.cos(a) * r;
    const wy = Math.sin(a) * r;
    const p = isoProject(wx, wy, 0);
    pts.push({ wx, wy, sx: p.sx, sy: p.sy, a });
  }
  return pts;
}

function ringToClosedPath(ring: ShoreVertex[]): string {
  const pts = ring.map((v) => `${v.sx.toFixed(2)},${v.sy.toFixed(2)}`).join(" L ");
  return `M ${pts} Z`;
}

/** Subpath indices for SW–S cliff-facing arc (eroded sea cliffs). */
function cliffArcIndices(ring: ShoreVertex[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const t = (((ring[i]?.a ?? 0) % TAU) + TAU) % TAU;
    const southWest = t >= Math.PI * 0.55 && t <= Math.PI * 1.52;
    if (southWest) out.push(i);
  }
  return out.length > 3 ? out : [];
}

const EAST_SPAN = 1.12;

function isEastFacingShore(a: number): boolean {
  const t = ((a % TAU) + TAU) % TAU;
  return t <= EAST_SPAN || t >= TAU - EAST_SPAN;
}

/** Boundary order preserved across the 2π seam for sandy east coast. */
function eastShoreOrdered(ring: ShoreVertex[]): ShoreVertex[] {
  const sample = ring.slice(0, -1);
  const east = sample.filter((v) => isEastFacingShore(v.a));
  if (east.length < 5) return [];
  const hi = east.filter((v) => v.a >= TAU - EAST_SPAN).sort((x, y) => x.a - y.a);
  const lo = east.filter((v) => v.a <= EAST_SPAN).sort((x, y) => x.a - y.a);
  return [...hi, ...lo];
}

/** East-sector ribbon — sand strip slightly inset toward campus. */
function sandRibbonPath(ring: ShoreVertex[], inwardWorld: number): string | null {
  const ordered = eastShoreOrdered(ring);
  if (ordered.length < 5) return null;
  const outer: string[] = [];
  const inner: string[] = [];
  for (const { wx, wy, sx, sy } of ordered) {
    const len = Math.hypot(wx, wy) || 1;
    const ix = wx - (wx / len) * inwardWorld;
    const iy = wy - (wy / len) * inwardWorld;
    const pi = isoProject(ix, iy, 0);
    outer.push(`${sx.toFixed(2)},${sy.toFixed(2)}`);
    inner.push(`${pi.sx.toFixed(2)},${pi.sy.toFixed(2)}`);
  }
  const oPath = outer.join(" L ");
  inner.reverse();
  const iPath = inner.join(" L ");
  return `M ${oPath} L ${iPath} Z`;
}

function foamSparkles(ring: ShoreVertex[]): ReactNode {
  const nodes: ReactNode[] = [];
  let key = 0;
  const sample = ring.slice(0, -1);
  for (let i = 0; i < sample.length; i += 3) {
    const { wx, wy, sx, sy, a } = sample[i]!;
    if (isEastFacingShore(a)) continue;
    const len = Math.hypot(wx, wy) || 1;
    const nx = (wx / len) * 14;
    const ny = (wy / len) * 14;
    const ox = sx + nx;
    const oy = sy + ny;
    const phase = (i * 0.37) % 1;
    const op = 0.35 + phase * 0.35;
    nodes.push(
      <path
        key={key++}
        d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${(sx + ox) / 2 + 4} ${(sy + oy) / 2 - 3} ${ox.toFixed(1)} ${oy.toFixed(1)}`}
        fill="none"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.2 + phase * 0.8}
        strokeLinecap="round"
        opacity={op}
      />,
    );
  }
  return <g>{nodes}</g>;
}

function cliffStrokePath(ring: ShoreVertex[], indices: number[]): string | null {
  if (indices.length < 2) return null;
  const pts = indices.map((i) => {
    const v = ring[i];
    return v ? `${v.sx.toFixed(2)},${v.sy.toFixed(2)}` : "";
  }).filter(Boolean);
  if (pts.length < 2) return null;
  return `M ${pts.join(" L ")}`;
}

/**
 * Island scenery: clear turquoise offshore water, near-heart landmass (NE wide / SW narrow),
 * forested hill shading, SW–S cliff rim, east sand ribbon, white surf flecks on rock coast.
 */
function SceneryImpl({ layout }: Props) {
  const { bounds } = layout;
  const islandPad = 340;
  const steps = 128;

  const baseRWorld = useMemo(
    () => maxRadiusFromOrigin(bounds, islandPad) + 220,
    [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY],
  );

  const ring = useMemo(() => buildIslandRing(baseRWorld, steps), [baseRWorld]);
  const islandPath = useMemo(() => ringToClosedPath(ring), [ring]);
  const hub = useMemo(() => isoProject(0, 0, 0), []);

  const beachPath = useMemo(() => sandRibbonPath(ring, 62), [ring]);
  const cliffIdx = useMemo(() => cliffArcIndices(ring), [ring]);
  const cliffPath = useMemo(() => cliffStrokePath(ring, cliffIdx), [ring, cliffIdx]);

  const seaPad = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 900) * 0.95 + 1800;
  const x0 = bounds.minX - seaPad;
  const x1 = bounds.maxX + seaPad;
  const y0 = bounds.minY - seaPad;
  const y1 = bounds.maxY + seaPad;
  const corners = [
    isoProject(x0, y0, 0),
    isoProject(x1, y0, 0),
    isoProject(x1, y1, 0),
    isoProject(x0, y1, 0),
  ];
  const seaPath = `M ${corners[0].sx} ${corners[0].sy} L ${corners[1].sx} ${corners[1].sy} L ${corners[2].sx} ${corners[2].sy} L ${corners[3].sx} ${corners[3].sy} Z`;

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

  const center = hub;
  let roadPath = "";
  layout.districts.forEach((d) => {
    const cur = isoProject(d.cx, d.cy, 0);
    roadPath += `M ${center.sx} ${center.sy} L ${cur.sx} ${cur.sy} `;
  });
  roadPath = roadPath.trim();

  const spread =
    Math.max(
      ...ring.map((v) => Math.max(Math.abs(v.sx - hub.sx), Math.abs(v.sy - hub.sy))),
    ) * 1.15;

  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="sea-bg" cx="42%" cy="36%" r="82%">
          <stop offset="0%" stopColor={COLOR.seaGlass} stopOpacity={0.95} />
          <stop offset="28%" stopColor={COLOR.seaBright} />
          <stop offset="58%" stopColor={COLOR.seaShallow} />
          <stop offset="100%" stopColor={COLOR.seaDeep} />
        </radialGradient>

        <radialGradient
          id="forest-hill"
          gradientUnits="userSpaceOnUse"
          cx={hub.sx}
          cy={hub.sy}
          r={spread}
        >
          <stop offset="0%" stopColor={COLOR.forestHighlight} />
          <stop offset="32%" stopColor={COLOR.forestCanopy} />
          <stop offset="68%" stopColor={COLOR.forestMid} />
          <stop offset="100%" stopColor={COLOR.forestDeep} />
        </radialGradient>

        <linearGradient id="terrain-sun" x1="12%" y1="8%" x2="92%" y2="96%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="rgba(255,250,230,0.22)" />
          <stop offset="48%" stopColor="rgba(40,70,55,0.08)" />
          <stop offset="100%" stopColor="rgba(10,22,18,0.55)" />
        </linearGradient>

        <filter id="foliage-grain" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="7" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.12
                    0 0 0 0 0.22
                    0 0 0 0 0.14
                    0 0 0 0.22 0"
            result="g"
          />
        </filter>
      </defs>

      <path d={seaPath} fill="url(#sea-bg)" />

      {/* Subtle nearshore lens around land */}
      <path
        d={islandPath}
        fill="none"
        stroke={COLOR.seaBright}
        strokeOpacity={0.28}
        strokeWidth={48}
        strokeLinejoin="round"
      />

      {/* Forested mass + gentle central hill read */}
      <path d={islandPath} fill="url(#forest-hill)" stroke="none" />
      <path
        d={islandPath}
        fill="url(#terrain-sun)"
        style={{ mixBlendMode: "multiply" as const }}
        opacity={0.92}
      />
      <path d={islandPath} fill="none" filter="url(#foliage-grain)" opacity={0.55} style={{ mixBlendMode: "overlay" as const }} />

      {/* East sand — warm band inside shoreline */}
      {beachPath && (
        <path d={beachPath} fill={COLOR.sandWarm} fillOpacity={0.55} stroke={COLOR.sandPale} strokeWidth={1.2} strokeOpacity={0.5} />
      )}

      {/* SW–S sea-cliff rim (rocky, darker) */}
      {cliffPath && (
        <path
          d={cliffPath}
          fill="none"
          stroke={COLOR.cliffRock}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.88}
        />
      )}
      {cliffPath && (
        <path
          d={cliffPath}
          fill="none"
          stroke={COLOR.cliffShadow}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="3 7"
          opacity={0.7}
        />
      )}

      {/* Mixed coast: warm sand stroke on north / NE bulge, cool rock hint elsewhere */}
      <path
        d={islandPath}
        fill="none"
        stroke={COLOR.sandPale}
        strokeWidth={5}
        strokeOpacity={0.35}
      />
      <path
        d={islandPath}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={2.5}
      />

      {foamSparkles(ring)}

      {roadPath && (
        <>
          <path d={roadPath} fill="none" stroke={COLOR.road} strokeWidth={26} strokeLinecap="round" strokeOpacity={0.88} />
          <path d={roadPath} fill="none" stroke={COLOR.roadInk} strokeWidth={1.2} strokeDasharray="6 8" strokeOpacity={0.55} />
        </>
      )}

      <path d={lakePath} fill={COLOR.water} stroke="#9bc4d3" strokeOpacity={0.55} strokeWidth={1.2} />
      <path d={lakePath} fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={0.8} transform="translate(2,2)" />
    </g>
  );
}

export const Scenery = memo(SceneryImpl);
