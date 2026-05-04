// Sizing tokens, in world units. All map geometry is laid out in this space;
// the SVG outer <g> applies a single zoom transform on top.

export const WORLD = {
  /** Half-side of every district plot (square), in world units. */
  districtHalf: 320,
  /** Spacing between district plots. */
  districtGap: 80,
  /** Buildings inside a district occupy a sub-grid; each cell side. */
  buildingSize: 70,
  /** Height (z) range for buildings, low → tall. */
  minBuildingHeight: 22,
  maxBuildingHeight: 90,
  /** Pin radius (world units) in ground space. */
  pinRadius: 8,
  /** Distance from a building's footprint to its surrounding pin halo. */
  pinHaloRadius: 60,
};

export const ZOOM = {
  min: 0.32,
  max: 4,
  initial: 0.55,
  /** Threshold above which the next layer of detail starts to fade in. */
  showBuildings: 0.6,
  showPins: 1.4,
  showIcons: 2.4,
};

export const COLOR = {
  ground: "#fbf9f3",
  groundEdge: "#eaf3ec",
  road: "#f3e7c8",
  roadInk: "#cdb87f",
  water: "#cfe6f0",
  pinShadow: "rgba(31,41,55,0.18)",
  ink: "#1f2937",
  inkSoft: "#4b5563",
  // far-mountain decoration
  mountainFar: "#cdd9c8",
  mountainNear: "#b9cab2",
};

export const PATH_ORDER = ["P0", "P1", "P2", "P3", "P4", "P5", "P6"];
