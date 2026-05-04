// Level-of-detail logic. Pure function of zoom factor `k` so we can call it
// from anywhere (canvas, mini-map, side-panel hints, search results).

import { ZOOM } from "./tokens";

export interface VisibleLayers {
  showDistricts: boolean;
  /** Continuous opacity for the district arch + ground (1 when zoomed out, fades when zoomed in). */
  districtOpacity: number;
  showBuildings: boolean;
  buildingOpacity: number;
  showPins: boolean;
  pinOpacity: number;
  showIcons: boolean;
  iconOpacity: number;
  /** A textual hint showing user "what zoom level am I at". */
  hint: string;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function pickVisible(k: number): VisibleLayers {
  // Districts are always visible but get a touch dimmer when we're zoomed deep
  // so chapter buildings and pins can pop.
  const districtOpacity = 1 - 0.45 * smoothstep(ZOOM.showBuildings, ZOOM.showPins + 0.3, k);

  const buildingOpacity = smoothstep(
    ZOOM.showBuildings - 0.05,
    ZOOM.showBuildings + 0.25,
    k
  );

  const pinOpacity = smoothstep(ZOOM.showPins - 0.1, ZOOM.showPins + 0.3, k);

  const iconOpacity = smoothstep(ZOOM.showIcons - 0.1, ZOOM.showIcons + 0.3, k);

  let hint = "宏观视角 · 学院总览";
  if (k > ZOOM.showIcons) hint = "微观视角 · 技术点 + 资源标记";
  else if (k > ZOOM.showPins) hint = "细节视角 · 章节 + 技术点";
  else if (k > ZOOM.showBuildings) hint = "中观视角 · 章节楼宇";

  return {
    showDistricts: districtOpacity > 0.001,
    districtOpacity,
    showBuildings: buildingOpacity > 0.001,
    buildingOpacity,
    showPins: pinOpacity > 0.001,
    pinOpacity,
    showIcons: iconOpacity > 0.001,
    iconOpacity,
    hint,
  };
}
