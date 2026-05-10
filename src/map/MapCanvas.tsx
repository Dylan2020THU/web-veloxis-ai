// MapCanvas — the core 2.5D roadmap viewport.
//
// Architecture:
//   <svg> (full screen)
//     <g class="world" [transform from d3-zoom]>
//       <Scenery />              // ground, lake, main roads
//       <g class="districts" />  // L0
//       <g class="dependencies" />  // prereq edges; same LOD as pins (zoom in)
//       <g class="buildings" />  // L1
//       <g class="pins" />       // L2
//     </g>
//
// The d3-zoom instance lives outside React state to avoid re-renders during
// user pan/zoom. Whenever the transform changes we mutate the world <g>'s
// transform attribute directly *and* push the latest k into a tiny piece of
// React state (throttled by rAF) so LOD-driven opacities can update.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { select } from "d3-selection";
import "d3-transition"; // augments d3-selection's Selection with .transition()
import {
  zoom as d3zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
} from "d3-zoom";

import type { RoadmapLayout } from "@/data/types";
import { ZOOM } from "./tokens";
import { pickVisible } from "./lod";
import { isoProject } from "./iso";
import { Scenery } from "./Scenery";
import { DistrictShape } from "./nodes/DistrictShape";
import { BuildingShape } from "./nodes/BuildingShape";
import { PinNode } from "./nodes/PinNode";
import { DependencyEdge } from "./nodes/DependencyEdge";

export interface MapCanvasHandle {
  /** Smoothly fly the camera so a node fills the viewport. */
  flyTo(id: string, opts?: { zoom?: number; durationMs?: number }): void;
  /** Reset to the initial overview transform. */
  reset(durationMs?: number): void;
  /** Increment zoom by a multiplicative factor (e.g. 1.4 / 0.7). */
  zoomBy(factor: number): void;
  getZoom(): number;
}

interface Props {
  layout: RoadmapLayout;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onZoomChange?: (k: number) => void;
}

export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  { layout, selectedId, onSelect, onZoomChange },
  ref
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const worldRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 800 : window.innerHeight,
  });

  // Zoom k pushed into React on a rAF — rest of d3 state stays out of React.
  const [zoomK, setZoomK] = useState<number>(ZOOM.initial);
  const pendingFrame = useRef<number | null>(null);

  // ----- Resize observer -----
  useLayoutEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ----- Iso-projected layout points (memoized) -----
  const projected = useMemo(() => {
    const districts = layout.districts.map((d) => ({
      d,
      proj: isoProject(d.cx, d.cy, 0),
    }));
    return { districts };
  }, [layout]);

  // Camera overview / reset anchor: the decorative lake sits at world (0, 0)
  // (see Scenery.tsx). The four districts are arranged symmetrically around it,
  // so centering on the bbox midpoint would bias the frame — we align on the hub.
  const fit = useMemo(() => {
    const center = isoProject(0, 0, 0);
    return { centerSX: center.sx, centerSY: center.sy };
  }, []);

  // ----- d3-zoom setup -----
  useEffect(() => {
    if (!svgRef.current || !worldRef.current) return;
    const svg = select(svgRef.current);
    const world = select(worldRef.current);

    const behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([ZOOM.min, ZOOM.max])
      .filter((event: any) => {
        // Allow wheel zoom anywhere; allow primary-button drag for panning.
        if (event.type === "wheel") return true;
        if (event.type === "mousedown") return event.button === 0;
        if (event.type === "touchstart") return true;
        return !event.button;
      })
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = event.transform;
        world.attr(
          "transform",
          `translate(${t.x}, ${t.y}) scale(${t.k})`
        );
        if (pendingFrame.current != null) cancelAnimationFrame(pendingFrame.current);
        pendingFrame.current = requestAnimationFrame(() => {
          setZoomK(t.k);
          onZoomChange?.(t.k);
        });
      });

    svg.call(behavior).on("dblclick.zoom", null);
    zoomBehaviorRef.current = behavior;

    // Set the initial transform: center the lake hub (world origin) in the
    // viewport at ZOOM.initial scale.
    const initial = zoomIdentity
      .translate(
        viewport.w / 2 - fit.centerSX * ZOOM.initial,
        viewport.h / 2 - fit.centerSY * ZOOM.initial
      )
      .scale(ZOOM.initial);
    svg.call(behavior.transform, initial);

    return () => {
      svg.on(".zoom", null);
      if (pendingFrame.current != null) cancelAnimationFrame(pendingFrame.current);
    };
    // We intentionally only run this once: re-running it would reset the camera
    // on every viewport change. The viewport is read fresh in flyTo/reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Camera helpers (imperative handle) -----
  const flyTo = useCallback(
    (id: string, opts?: { zoom?: number; durationMs?: number }) => {
      const svg = svgRef.current;
      const beh = zoomBehaviorRef.current;
      if (!svg || !beh) return;
      const pos = layout.positionsById.get(id);
      if (!pos) return;
      const proj = isoProject(pos.cx, pos.cy, 0);
      const targetK =
        opts?.zoom ??
        (pos.kind === "district" ? 0.85 : pos.kind === "building" ? 1.7 : 2.6);
      const dur = opts?.durationMs ?? 700;
      const target = zoomIdentity
        .translate(
          viewport.w / 2 - proj.sx * targetK,
          viewport.h / 2 - proj.sy * targetK
        )
        .scale(targetK);
      select(svg).transition().duration(dur).call(beh.transform as any, target);
    },
    [layout, viewport]
  );

  const reset = useCallback(
    (durationMs = 600) => {
      const svg = svgRef.current;
      const beh = zoomBehaviorRef.current;
      if (!svg || !beh) return;
      const target = zoomIdentity
        .translate(
          viewport.w / 2 - fit.centerSX * ZOOM.initial,
          viewport.h / 2 - fit.centerSY * ZOOM.initial
        )
        .scale(ZOOM.initial);
      select(svg)
        .transition()
        .duration(durationMs)
        .call(beh.transform as any, target);
    },
    [fit, viewport]
  );

  const zoomBy = useCallback((factor: number) => {
    const svg = svgRef.current;
    const beh = zoomBehaviorRef.current;
    if (!svg || !beh) return;
    select(svg).transition().duration(220).call(beh.scaleBy as any, factor);
  }, []);

  const getZoom = useCallback(() => {
    return zoomK;
  }, [zoomK]);

  useImperativeHandle(
    ref,
    () => ({ flyTo, reset, zoomBy, getZoom }),
    [flyTo, reset, zoomBy, getZoom]
  );

  // Selection -> auto fly when chosen via search etc.
  // (Search calls flyTo directly; we keep this side-effect-free.)

  const lod = pickVisible(zoomK);

  // Highlight context: dim other districts when one is "in focus" (selected
  // node belongs to it).
  const focusDistrictId = useMemo(() => {
    if (!selectedId) return null;
    const node = layout.byId.get(selectedId);
    if (!node) return null;
    let cur = node;
    while (cur.parentId && cur.parentId !== "root") {
      const next = layout.byId.get(cur.parentId);
      if (!next) break;
      cur = next;
    }
    return cur.id;
  }, [selectedId, layout]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, display: "block" }}
      onClick={() => onSelect(null)}
    >
      <g ref={worldRef} className="world">
        <Scenery layout={layout} />

        <g className="districts">
          {projected.districts.map(({ d }) => (
            <DistrictShape
              key={d.node.id}
              district={d}
              highlight={
                !focusDistrictId || focusDistrictId === d.node.id ? 1 : 0.35
              }
              onSelect={(id) => onSelect(id)}
            />
          ))}
        </g>

        {lod.showPins && (
          <g className="dependencies" style={{ opacity: lod.pinOpacity }}>
            {layout.dependencies.map((dep, i) => (
              <DependencyEdge
                key={`${dep.fromId}->${dep.toId}-${i}`}
                dep={dep}
                layout={layout}
                opacity={
                  selectedId &&
                  (selectedId === dep.fromId || selectedId === dep.toId)
                    ? 1
                    : 0.35
                }
              />
            ))}
          </g>
        )}

        {lod.showBuildings && (
          <g className="buildings" style={{ opacity: lod.buildingOpacity }}>
            {layout.buildings.map((b) => (
              <BuildingShape
                key={b.node.id}
                building={b}
                opacity={1}
                selected={selectedId === b.node.id}
                onSelect={onSelect}
                zoom={zoomK}
              />
            ))}
          </g>
        )}

        {lod.showPins && (
          <g className="pins" style={{ opacity: lod.pinOpacity }}>
            {layout.pins.map((p) => (
              <PinNode
                key={p.node.id}
                pin={p}
                opacity={1}
                selected={selectedId === p.node.id}
                onSelect={onSelect}
                zoom={zoomK}
                showIcons={lod.showIcons}
              />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
});
