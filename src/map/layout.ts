// Pure deterministic layout: roadmap tree -> world-space coordinates.
//
// Three-stage placement:
//  1. The four core departments (P1..P4) are placed by compass bearing on the
//     iso plane (see DISTRICT_POSITIONS). The pedagogical learning path
//     P1 → P2 → P3 → P4 sweeps from the southern entrance up to the northern
//     RL arena, with ML and DL forming the north-east wing.
//  2. Inside a district, child chapters are placed via d3-hierarchy's treemap
//     (squarify), so chapters with more sub-content occupy bigger plots. The
//     chapter footprint becomes a "building" centered in its treemap cell;
//     building height is driven by star difficulty + leaf count, so the tall
//     spires (Transformer / PPO / RLHF / Mamba) genuinely punch up out of the
//     skyline.
//  3. Leaf "tech points" become pins arranged on a halo ring around their
//     parent building's center, with extra rings if the count is large.
//
// The resulting layout is fully deterministic from a given roadmap, so we
// don't need to memo across renders.

import {
  hierarchy,
  treemap,
  treemapSquarify,
  type HierarchyRectangularNode,
} from "d3-hierarchy";
import type {
  PlacedBuilding,
  PlacedDependency,
  PlacedDistrict,
  PlacedPin,
  RoadmapDoc,
  RoadmapLayout,
  RoadmapNode,
} from "@/data/types";
import { ISO_COS, ISO_SIN } from "./iso";
import { WORLD } from "./tokens";

// Veloxis AI Academy keeps only the four core departments. They are placed in
// the four cardinal directions on the iso plane, with a central lake at the
// origin acting as the campus' visual anchor:
//
//                          ┌───────────────────────┐
//                          │ P4 Reinforcement Arena│        ← North
//                          └───────────────────────┘
//                                       │
//      ┌──────────────────┐         ╭───┴───╮         ┌───────────────────┐
//      │ P2 Machine Will  │ ──── W  │  Lake │  E ──── │ P3 Deep Awakening │
//      │   Workshop       │         ╰───┬───╯         │       Lab         │
//      └──────────────────┘             │             └───────────────────┘
//                                       │
//                          ┌──────────────────┐
//                          │ P1 Math Plaza    │       ← South
//                          └──────────────────┘
//
// Roads radiate from the central lake to each department (drawn in
// Scenery.tsx). The lake is rendered on top of the road convergence so the
// visual reads as four spokes terminating at a circular pond.

/**
 * Convert a (bearing-from-screen-north, distance) pair into world-space (x, y)
 * coordinates such that after iso projection the resulting point lies at the
 * given bearing on the screen. This lets us describe district positions in
 * intuitive compass terms:
 *   - 0°  → screen up  (正北)
 *   - 90° → screen right (正东)
 *   - 180° → screen down (正南)
 */
function bearing(degFromNorth: number, dist: number): { x: number; y: number } {
  const θ = (degFromNorth * Math.PI) / 180;
  return {
    x: (dist / 2) * (Math.sin(θ) / ISO_COS - Math.cos(θ) / ISO_SIN),
    y: (dist / 2) * (-Math.sin(θ) / ISO_COS - Math.cos(θ) / ISO_SIN),
  };
}

const DISTRICT_POSITIONS: Record<string, { x: number; y: number }> = {
  P1: bearing(180, 700),  // 数学广场       —— 正南
  P2: bearing(270, 700),  // 机器意志工坊   —— 正西
  P3: bearing(90, 700),   // 深度觉醒实验室 —— 正东
  P4: bearing(0, 700),    // 强化训练竞技场 —— 正北
};

const ALLOWED_DISTRICTS = new Set(Object.keys(DISTRICT_POSITIONS));

/** Canonical learning path used by the road / mini-map / animations. */
export const DISTRICT_PATH = ["P1", "P2", "P3", "P4"];

function rebuildParentLinks(node: RoadmapNode, parent: RoadmapNode | null) {
  // RoadmapNode is plain JSON when loaded; ensure parentId is set even if
  // upstream serialization missed it. (No-op in practice.)
  if (node.parentId === undefined) (node as any).parentId = parent?.id ?? null;
  node.children.forEach((c) => rebuildParentLinks(c, node));
}

function buildIndex(root: RoadmapNode) {
  const byId = new Map<string, RoadmapNode>();
  const all: RoadmapNode[] = [];
  const walk = (n: RoadmapNode) => {
    byId.set(n.id, n);
    all.push(n);
    n.children.forEach(walk);
  };
  walk(root);
  return { byId, all };
}

/** Recursively count leaves to weight the treemap. */
function leafCount(n: RoadmapNode): number {
  if (n.children.length === 0) return 1;
  return n.children.reduce((s, c) => s + leafCount(c), 0);
}

/** Pick a building's height from star difficulty + leaf count. */
function buildingHeight(node: RoadmapNode): number {
  const stars = Math.max(0, Math.min(4, node.stars));
  const leaves = leafCount(node);
  const starWeight = stars / 4; // 0..1
  const leafWeight = Math.min(1, leaves / 12);
  const t = 0.45 * starWeight + 0.55 * leafWeight;
  return (
    WORLD.minBuildingHeight +
    t * (WORLD.maxBuildingHeight - WORLD.minBuildingHeight)
  );
}

/** Layout the chapters of one district inside its plot. */
function placeBuildings(
  district: PlacedDistrict
): { buildings: PlacedBuilding[]; pins: PlacedPin[] } {
  const buildings: PlacedBuilding[] = [];
  const pins: PlacedPin[] = [];
  const chapters = district.node.children;
  if (chapters.length === 0) return { buildings, pins };

  const padding = 28;
  const w = district.half * 2 - padding * 2;
  const h = district.half * 2 - padding * 2;

  // Build a treemap over the chapters using leaf count as weight. We clone the
  // chapters with empty children so d3 doesn't recurse into sub-trees, but we
  // pre-compute the original leaf counts so the cells get sized by content
  // depth rather than uniformly.
  const weights = new Map<string, number>();
  chapters.forEach((c) => weights.set(c.id, leafCount(c) + 1));
  const hierarchyRoot = hierarchy<RoadmapNode>(
    {
      ...district.node,
      children: chapters.map((c) => ({ ...c, children: [] })),
    } as RoadmapNode,
    (d: RoadmapNode) => d.children
  ).sum((d: RoadmapNode) => weights.get(d.id) ?? 1);

  const root: HierarchyRectangularNode<RoadmapNode> = treemap<RoadmapNode>()
    .size([w, h])
    .padding(8)
    .round(true)
    .tile(treemapSquarify)(hierarchyRoot);

  // Origin of the treemap rectangle in world coords (top-left of the inner area)
  const x0 = district.cx - district.half + padding;
  const y0 = district.cy - district.half + padding;

  for (const cell of root.leaves()) {
    const node = chapters.find((c) => c.id === cell.data.id);
    if (!node) continue;

    const cellW = cell.x1 - cell.x0 || 0;
    const cellH = cell.y1 - cell.y0 || 0;
    const cx = x0 + cell.x0 + cellW / 2;
    const cy = y0 + cell.y0 + cellH / 2;
    // Footprint is the largest square that fits within the cell, scaled down
    // a touch so neighbors don't kiss.
    const half = Math.max(12, Math.min(cellW, cellH) / 2 - 6);

    const bld: PlacedBuilding = {
      node,
      districtId: district.node.id,
      cx,
      cy,
      half,
      height: buildingHeight(node),
      landmark: node.stars >= 3,
    };
    buildings.push(bld);

    // pins around the building
    const leaves: RoadmapNode[] = [];
    const walk = (n: RoadmapNode) => {
      if (n.children.length === 0 && n.id !== node.id) leaves.push(n);
      else n.children.forEach(walk);
    };
    node.children.forEach(walk);

    if (leaves.length > 0) {
      const ringRadius = Math.max(half + 14, half + 8 + leaves.length * 0.4);
      const cap = 18;
      const visible = leaves.slice(0, Math.min(leaves.length, cap * 3));
      visible.forEach((leaf, i) => {
        const ringIndex = Math.floor(i / cap);
        const inRing = visible.length > cap ? cap : visible.length;
        const angle =
          ((i % cap) / inRing) * Math.PI * 2 + ringIndex * 0.32;
        const r = ringRadius + ringIndex * 18;
        pins.push({
          node: leaf,
          districtId: district.node.id,
          buildingId: node.id,
          cx: cx + Math.cos(angle) * r,
          cy: cy + Math.sin(angle) * r * 0.85, // slight squish so rings read isometric
        });
      });
    }
  }

  return { buildings, pins };
}

export function buildLayout(doc: RoadmapDoc): RoadmapLayout {
  // Prune the tree to the 4 districts we actually render. Keeping the unused
  // OPML branches in `byId` would let search hit them and silently fail to fly
  // (their positions never get registered). Filtering at this boundary keeps
  // the rest of the layout / search / sidebar code blissfully unaware that
  // anything was dropped.
  const root: RoadmapNode = {
    ...doc.root,
    children: doc.root.children.filter((c) => ALLOWED_DISTRICTS.has(c.id)),
  };
  rebuildParentLinks(root, null);
  const { byId, all } = buildIndex(root);

  // -------- 1. Place districts by compass bearing --------
  const districts: PlacedDistrict[] = [];

  root.children.forEach((child) => {
    const pos = DISTRICT_POSITIONS[child.id];
    if (!pos) return;
    districts.push({
      node: child,
      cx: pos.x,
      cy: pos.y,
      half: WORLD.districtHalf,
      themeId: child.id,
      order: DISTRICT_PATH.indexOf(child.id),
    });
  });

  // -------- 2. For each district, place its chapter buildings --------
  const buildings: PlacedBuilding[] = [];
  const pins: PlacedPin[] = [];

  districts.forEach((d) => {
    const { buildings: b, pins: p } = placeBuildings(d);
    buildings.push(...b);
    pins.push(...p);
  });

  // -------- 3. Build a positions index used by everything else --------
  const positionsById = new Map<
    string,
    { cx: number; cy: number; kind: "district" | "building" | "pin" }
  >();
  districts.forEach((d) =>
    positionsById.set(d.node.id, { cx: d.cx, cy: d.cy, kind: "district" })
  );
  buildings.forEach((b) =>
    positionsById.set(b.node.id, { cx: b.cx, cy: b.cy, kind: "building" })
  );
  pins.forEach((p) =>
    positionsById.set(p.node.id, { cx: p.cx, cy: p.cy, kind: "pin" })
  );

  // -------- 4. Resolve dependency edges to existing positions --------
  const dependencies: PlacedDependency[] = [];
  all.forEach((n) => {
    n.prereqIds.forEach((from) => {
      if (positionsById.has(from) && positionsById.has(n.id)) {
        dependencies.push({ fromId: from, toId: n.id });
      }
    });
  });

  // -------- 5. Compute world-bounds for camera fit --------
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  districts.forEach((d) => {
    minX = Math.min(minX, d.cx - d.half);
    maxX = Math.max(maxX, d.cx + d.half);
    minY = Math.min(minY, d.cy - d.half);
    maxY = Math.max(maxY, d.cy + d.half);
  });

  return {
    districts,
    buildings,
    pins,
    dependencies,
    bounds: { minX, minY, maxX, maxY },
    byId,
    positionsById,
    flat: all,
  };
}
