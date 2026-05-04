import { useEffect, useMemo, useState } from "react";
import { buildLayout } from "@/map/layout";
import type { RoadmapDoc, RoadmapLayout } from "./types";

interface UseRoadmapResult {
  doc: RoadmapDoc | null;
  layout: RoadmapLayout | null;
  error: string | null;
  loading: boolean;
}

let _cache: { doc: RoadmapDoc; layout: RoadmapLayout } | null = null;

export function useRoadmap(): UseRoadmapResult {
  const [doc, setDoc] = useState<RoadmapDoc | null>(_cache?.doc ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cache) return;
    let aborted = false;
    fetch(import.meta.env.BASE_URL + "data/roadmap.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<RoadmapDoc>;
      })
      .then((d) => {
        if (aborted) return;
        const layout = buildLayout(d);
        _cache = { doc: d, layout };
        setDoc(d);
      })
      .catch((e) => !aborted && setError(String(e?.message ?? e)));
    return () => {
      aborted = true;
    };
  }, []);

  const layout = useMemo(() => {
    if (!doc) return null;
    if (_cache?.doc === doc) return _cache.layout;
    return buildLayout(doc);
  }, [doc]);

  return { doc, layout, error, loading: !doc && !error };
}
