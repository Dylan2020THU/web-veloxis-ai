export interface RoadmapNode {
  id: string;
  label: string;
  rawText: string;
  depth: number;
  stars: number;
  prereq: string[];
  prereqIds: string[];
  parentId: string | null;
  leadingNumber: string | null;
  children: RoadmapNode[];
}

export interface RoadmapStats {
  totalNodes: number;
  leafNodes: number;
  maxDepth: number;
  districts: number;
}

export interface RoadmapDoc {
  version: number;
  generatedAt: string;
  stats: RoadmapStats;
  root: RoadmapNode;
}

export interface IsoPoint {
  sx: number;
  sy: number;
}

export interface PlacedDistrict {
  node: RoadmapNode;
  /** Center of the district plot in world coords (pre-projection). */
  cx: number;
  cy: number;
  /** Half-extent (square plot) in world units. */
  half: number;
  themeId: string;
  /** Reading order along the main learning path (0..n). */
  order: number;
}

export interface PlacedBuilding {
  node: RoadmapNode;
  districtId: string;
  /** World-coordinate footprint center inside the district plot. */
  cx: number;
  cy: number;
  /** Footprint half size (square). */
  half: number;
  /** Visual height (z, world units) for the isometric box. */
  height: number;
  /** Whether this is a "landmark" (3+ stars or contains the district capstone). */
  landmark: boolean;
}

export interface PlacedPin {
  node: RoadmapNode;
  districtId: string;
  buildingId: string;
  /** World coords. */
  cx: number;
  cy: number;
}

export interface PlacedDependency {
  fromId: string;
  toId: string;
  /** Pre-projected screen path (cached). Computed on demand. */
}

export interface RoadmapLayout {
  districts: PlacedDistrict[];
  buildings: PlacedBuilding[];
  pins: PlacedPin[];
  dependencies: PlacedDependency[];
  /** World-space bounds (pre-projection). */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Index by id for O(1) lookups. */
  byId: Map<string, RoadmapNode>;
  positionsById: Map<
    string,
    { cx: number; cy: number; kind: "district" | "building" | "pin" }
  >;
  flat: RoadmapNode[];
}
