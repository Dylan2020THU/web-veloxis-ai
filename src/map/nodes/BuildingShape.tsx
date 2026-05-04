import { memo, useState } from "react";
import type { PlacedBuilding } from "@/data/types";
import { themeFor } from "@/data/theme";
import { isoBoxPaths, isoProject } from "@/map/iso";

interface Props {
  building: PlacedBuilding;
  /** Pass-through opacity (driven by LOD). */
  opacity: number;
  /** Whether this building is currently selected (clicked). */
  selected: boolean;
  onSelect: (id: string) => void;
  /** Optional zoom factor — used to decide whether to render the chapter label. */
  zoom: number;
}

function BuildingShapeImpl({
  building,
  opacity,
  selected,
  onSelect,
  zoom,
}: Props) {
  const [hover, setHover] = useState(false);
  const theme = themeFor(building.districtId);
  const lift = hover || selected ? 6 : 0;
  const h = building.height + lift;
  const { top, left, right, silhouette, topCenter } = isoBoxPaths(
    building.cx,
    building.cy,
    building.half,
    h
  );

  const labelAnchor = topCenter;

  const showLabel = zoom > 0.85;
  const showStars = zoom > 1.1 && building.node.stars > 0;

  return (
    <g
      style={{ opacity, cursor: "pointer" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(building.node.id);
      }}
    >
      <path
        d={silhouette}
        transform="translate(2,3)"
        fill="rgba(31,41,55,0.18)"
        filter="blur(0.6px)"
        pointerEvents="none"
      />
      <path d={left} fill={theme.side} stroke={theme.ink} strokeOpacity={0.25} strokeWidth={0.7} />
      <path
        d={right}
        fill={theme.side}
        opacity={0.85}
        stroke={theme.ink}
        strokeOpacity={0.2}
        strokeWidth={0.7}
      />
      <path
        d={top}
        fill={theme.roof}
        stroke={theme.ink}
        strokeOpacity={0.35}
        strokeWidth={0.9}
      />
      {building.landmark && (
        <path
          d={top}
          fill="none"
          stroke={theme.accent}
          strokeWidth={2.4}
          strokeOpacity={0.85}
          strokeLinejoin="round"
          transform={`translate(0,-2)`}
        />
      )}
      {/* Tiny "rooftop sign" for landmarks */}
      {building.landmark && (() => {
        const c = isoProject(building.cx, building.cy, h + 12);
        return (
          <g transform={`translate(${c.sx}, ${c.sy})`} pointerEvents="none">
            <rect
              x={-12}
              y={-8}
              width={24}
              height={6}
              rx={2}
              fill={theme.accent}
              opacity={0.95}
            />
          </g>
        );
      })()}

      {showLabel && (
        <g
          transform={`translate(${labelAnchor.sx}, ${labelAnchor.sy - 6})`}
          pointerEvents="none"
        >
          <text
            textAnchor="middle"
            className="svg-text"
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              fill: theme.ink,
            }}
          >
            {building.node.label}
          </text>
          {showStars && (
            <text
              y={11}
              textAnchor="middle"
              style={{ fontSize: 8, fill: theme.accent, fontWeight: 700 }}
            >
              {"★".repeat(Math.min(4, building.node.stars))}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

export const BuildingShape = memo(BuildingShapeImpl);
