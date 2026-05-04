// Isometric helpers. We use a true 30°/30° dimetric projection (cos30, sin30),
// which gives a balanced "2.5D campus map" look without overly stretching one
// axis. World coords (x, y, z) — with y being the ground depth and z the
// vertical height — map to screen coords (sx, sy).
//
// All numbers are in world units; the SVG outer transform handles pan/zoom.

export const ISO_COS = Math.cos(Math.PI / 6); // ~0.866
export const ISO_SIN = Math.sin(Math.PI / 6); // 0.5

export interface Iso {
  sx: number;
  sy: number;
}

export function isoProject(x: number, y: number, z = 0): Iso {
  return {
    sx: (x - y) * ISO_COS,
    sy: (x + y) * ISO_SIN - z,
  };
}

/** Project a 2D ground polygon (array of [x, y]) into screen coords. */
export function isoPolygon(points: Array<[number, number]>, z = 0): Iso[] {
  return points.map(([x, y]) => isoProject(x, y, z));
}

/** Convert a list of iso points to an SVG polygon `points` string. */
export function toPointsAttr(pts: Iso[]): string {
  return pts.map((p) => `${p.sx.toFixed(2)},${p.sy.toFixed(2)}`).join(" ");
}

/** Build the SVG path for the four faces of an iso box footprint at (cx, cy)
 * with half-extent `half` and visual height `h`. Returns the three visible
 * faces as separate `d` strings (top, left, right) so the caller can color
 * them individually. */
export interface IsoBoxPaths {
  top: string;
  left: string;
  right: string;
  /** A single combined silhouette path, useful for shadows. */
  silhouette: string;
  /** The center of the top face, in screen coords. */
  topCenter: Iso;
}

export function isoBoxPaths(
  cx: number,
  cy: number,
  half: number,
  h: number
): IsoBoxPaths {
  const groundCorners: Array<[number, number]> = [
    [cx - half, cy - half], // back  (north)
    [cx + half, cy - half], // right (east)
    [cx + half, cy + half], // front (south)
    [cx - half, cy + half], // left  (west)
  ];

  const ground = groundCorners.map(([x, y]) => isoProject(x, y, 0));
  const roof = groundCorners.map(([x, y]) => isoProject(x, y, h));

  // top face: roof[0..3] in order
  const top = `M ${roof[0].sx} ${roof[0].sy} L ${roof[1].sx} ${roof[1].sy} L ${roof[2].sx} ${roof[2].sy} L ${roof[3].sx} ${roof[3].sy} Z`;

  // right (east) face: ground[1] -> ground[2] -> roof[2] -> roof[1]
  const right = `M ${ground[1].sx} ${ground[1].sy} L ${ground[2].sx} ${ground[2].sy} L ${roof[2].sx} ${roof[2].sy} L ${roof[1].sx} ${roof[1].sy} Z`;

  // left (south) face: ground[2] -> ground[3] -> roof[3] -> roof[2]
  const left = `M ${ground[2].sx} ${ground[2].sy} L ${ground[3].sx} ${ground[3].sy} L ${roof[3].sx} ${roof[3].sy} L ${roof[2].sx} ${roof[2].sy} Z`;

  // silhouette path used for soft drop shadow
  const silhouette = `M ${ground[3].sx} ${ground[3].sy} L ${ground[2].sx} ${ground[2].sy} L ${ground[1].sx} ${ground[1].sy} L ${roof[1].sx} ${roof[1].sy} L ${roof[0].sx} ${roof[0].sy} L ${roof[3].sx} ${roof[3].sy} Z`;

  const topCenter = isoProject(cx, cy, h);

  return { top, left, right, silhouette, topCenter };
}

/** Approximate world-radius -> screen-radius for circular pins; we use the
 * vertical squish factor of an iso projection since pins are rendered as
 * tilted ellipses on the ground plane. */
export function isoPinEllipse(
  cx: number,
  cy: number,
  r: number,
  z = 0
): { center: Iso; rx: number; ry: number } {
  const center = isoProject(cx, cy, z);
  return { center, rx: r * ISO_COS, ry: r * ISO_SIN };
}
