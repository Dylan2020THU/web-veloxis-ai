// Pure deterministic layout: roadmap tree -> world-space coordinates.
//
// Two-stage placement:
//  1. Each top-level child (P0..P6) gets a fixed cell in a 3x3 grid that
//     traces the "learning path" from west (Foundation) to southeast (Capstone
//     Harbor). A gentle Y offset for odd columns makes the layout feel less
//     gridlike, more like a real campus.
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
import { WORLD } from "./tokens";

// 3x3 grid cells (col, row). The 7 districts occupy 7 cells; we leave the
// other 2 empty so far-corner mountain decoration has room to breathe.
//
// Layout (col,row), origin top-left:
//   (0,0) P1 Foundation   (1,0) P2 Machine Will   (2,0) P3 Deep Awakening
//   (0,1) P0 Orientation  (1,1) (empty - lake)    (2,1) P5 Horizontal Stack
//   (0,2) (empty)         (1,2) P4 Decision       (2,2) P6 Capstone Harbor
const GRID_CELLS: Record<string, { col: number; row: number }> = {
  P1: { col: 0, row: 0 },
  P2: { col: 1, row: 0 },
  P3: { col: 2, row: 0 },
  P0: { col: 0, row: 1 },
  P5: { col: 2, row: 1 },
  P4: { col: 1, row: 2 },
  P6: { col: 2, row: 2 },
};

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
  const root = doc.root;
  rebuildParentLinks(root, null);
  const { byId, all } = buildIndex(root);

  // -------- 1. Place districts on the 3x3 grid --------
  const cellSize = WORLD.districtHalf * 2 + WORLD.districtGap;
  const districts: PlacedDistrict[] = [];

  // The "main learning path" order, used for animations and connecting paths.
  const PATH = ["P0", "P1", "P2", "P3", "P4", "P5", "P6"];

  root.children.forEach((child) => {
    const cell = GRID_CELLS[child.id];
    if (!cell) return; // unknown top-level — skip
    const cx = (cell.col - 1) * cellSize;
    // Slight y-jitter on odd columns so the layout feels more "campus" than "grid"
    const jitter = cell.col === 1 ? -22 : cell.col === 2 ? 14 : 0;
    const cy = (cell.row - 1) * cellSize + jitter;
    districts.push({
      node: child,
      cx,
      cy,
      half: WORLD.districtHalf,
      themeId: child.id,
      order: PATH.indexOf(child.id),
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
