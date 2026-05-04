import { memo } from "react";
import type { PlacedDistrict } from "@/data/types";
import { themeFor } from "@/data/theme";
import { isoPolygon, toPointsAttr } from "@/map/iso";

interface Props {
  district: PlacedDistrict;
  /** Visual emphasis 0..1 (1 = fully highlighted, 0 = dim other districts). */
  highlight?: number;
  onSelect?: (id: string) => void;
}

function DistrictShapeImpl({ district, highlight = 1, onSelect }: Props) {
  const theme = themeFor(district.themeId);
  const { cx, cy, half } = district;

  const ground: Array<[number, number]> = [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
  ];
  const groundProj = isoPolygon(ground, 0);

  // Slightly inset polygon for the inner walking area
  const inset = 16;
  const inner: Array<[number, number]> = [
    [cx - half + inset, cy - half + inset],
    [cx + half - inset, cy - half + inset],
    [cx + half - inset, cy + half - inset],
    [cx - half + inset, cy + half - inset],
  ];
  const innerProj = isoPolygon(inner, 0);

  const archCenter = isoPolygon([[cx, cy - half - 6]], 0)[0];
  const archHeight = 32;
  const archHalfW = 78;

  return (
    <g
      className="district"
      style={{ opacity: 0.55 + 0.45 * highlight, cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(district.node.id);
      }}
    >
      <defs>
        <linearGradient
          id={`grad-${theme.id}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={theme.ground[0]} />
          <stop offset="100%" stopColor={theme.ground[1]} />
        </linearGradient>
      </defs>

      <polygon
        points={toPointsAttr(groundProj)}
        fill={`url(#grad-${theme.id})`}
        stroke="rgba(31,41,55,0.12)"
        strokeWidth={1.2}
      />
      <polygon
        points={toPointsAttr(innerProj)}
        fill="rgba(255,255,255,0.18)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={0.6}
        strokeDasharray="2 4"
      />

      <g
        transform={`translate(${archCenter.sx}, ${archCenter.sy})`}
        pointerEvents="none"
      >
        <rect
          x={-archHalfW}
          y={-archHeight - 4}
          width={archHalfW * 2}
          height={archHeight}
          rx={6}
          fill={theme.roof}
          stroke={theme.side}
          strokeWidth={1.2}
        />
        <rect
          x={-archHalfW + 4}
          y={-archHeight - 1}
          width={archHalfW * 2 - 8}
          height={3}
          fill={theme.accent}
          opacity={0.85}
        />
        <text
          x={0}
          y={-archHeight / 2 - 6}
          textAnchor="middle"
          className="svg-text"
          style={{ fontSize: 13, fontWeight: 700, fill: theme.ink }}
        >
          {theme.name}
        </text>
        <text
          x={0}
          y={-archHeight / 2 + 8}
          textAnchor="middle"
          className="svg-text"
          style={{ fontSize: 10.5, fontWeight: 500, fill: theme.ink, opacity: 0.85 }}
        >
          {theme.subtitle}
        </text>
      </g>
    </g>
  );
}

export const DistrictShape = memo(DistrictShapeImpl);
