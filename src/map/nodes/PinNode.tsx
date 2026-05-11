import { memo, useState } from "react";
import type { PlacedPin } from "@/data/types";
import { themeFor } from "@/data/theme";
import { isoProject } from "@/map/iso";

interface Props {
  pin: PlacedPin;
  mapRotationDeg?: number;
  opacity: number;
  selected: boolean;
  onSelect: (id: string) => void;
  zoom: number;
  showIcons: boolean;
}

function PinNodeImpl({
  pin,
  mapRotationDeg = 0,
  opacity,
  selected,
  onSelect,
  zoom,
  showIcons,
}: Props) {
  const [hover, setHover] = useState(false);
  const theme = themeFor(pin.districtId);
  const headHeight = hover || selected ? 18 : 14;
  const head = isoProject(pin.cx, pin.cy, headHeight);
  const foot = isoProject(pin.cx, pin.cy, 0);

  const r = selected ? 5.2 : 4.4;

  return (
    <g
      style={{ opacity, cursor: "pointer" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(pin.node.id);
      }}
    >
      <ellipse
        cx={foot.sx}
        cy={foot.sy + 1.5}
        rx={r * 0.9}
        ry={r * 0.45}
        fill="rgba(31,41,55,0.25)"
      />
      <line
        x1={foot.sx}
        y1={foot.sy}
        x2={head.sx}
        y2={head.sy}
        stroke={theme.side}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <circle
        cx={head.sx}
        cy={head.sy}
        r={r}
        fill={theme.accent}
        stroke="white"
        strokeWidth={1.4}
      />
      {showIcons && (
        <circle
          cx={head.sx}
          cy={head.sy}
          r={1.4}
          fill="white"
          opacity={0.95}
        />
      )}

      {(hover || selected || zoom > 2.0) && (
        <g
          transform={`translate(${head.sx}, ${head.sy - 12}) rotate(${-mapRotationDeg})`}
          pointerEvents="none"
        >
          <text
            textAnchor="middle"
            className="svg-text"
            style={{
              fontSize: 8.5,
              fontWeight: 600,
              fill: theme.ink,
            }}
          >
            {pin.node.label}
          </text>
        </g>
      )}
    </g>
  );
}

export const PinNode = memo(PinNodeImpl);
