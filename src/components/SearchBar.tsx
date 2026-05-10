import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RoadmapLayout, RoadmapNode } from "@/data/types";
import { themeFor } from "@/data/theme";

interface Props {
  open: boolean;
  layout: RoadmapLayout;
  onClose: () => void;
  onPick: (id: string) => void;
}

interface Hit {
  node: RoadmapNode;
  score: number;
  districtId: string;
}

function pickDistrictId(node: RoadmapNode, byId: Map<string, RoadmapNode>) {
  let cur: RoadmapNode | undefined = node;
  while (cur && cur.parentId && cur.parentId !== "root") {
    cur = byId.get(cur.parentId);
  }
  return cur?.id ?? "P1";
}

export function SearchBar({ open, layout, onClose, onPick }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  // Reset on every open and focus the input.
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      // Default suggestions: top-level districts.
      return layout.districts.map((d) => ({
        node: d.node,
        score: 1,
        districtId: d.themeId,
      }));
    }
    const results: Hit[] = [];
    layout.flat.forEach((n) => {
      const text = (n.label + " " + n.rawText).toLowerCase();
      const idx = text.indexOf(query);
      if (idx === -1) return;
      // Prefer earlier matches and shorter labels.
      const score = (idx === 0 ? 0 : 0.4) + Math.min(1, n.label.length / 60);
      results.push({
        node: n,
        score,
        districtId: pickDistrictId(n, layout.byId),
      });
    });
    results.sort((a, b) => a.score - b.score);
    return results.slice(0, 30);
  }, [q, layout]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, hits.length - 1)));
  }, [hits.length]);

  function pickActive() {
    const hit = hits[active];
    if (hit) {
      onPick(hit.node.id);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-start justify-center bg-black/30 pt-[12vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[min(640px,90vw)] overflow-hidden rounded-2xl bg-white shadow-soft"
          >
            <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
              <span className="text-ink/50">⌘K</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索任意章节、技术点（如 Transformer、PPO、LoRA…）"
                className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink/35"
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(hits.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    pickActive();
                  }
                }}
              />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto scroll-thin py-1">
              {hits.length === 0 && (
                <li className="px-4 py-3 text-sm text-ink/50">没有匹配项</li>
              )}
              {hits.map((hit, i) => {
                const theme = themeFor(hit.districtId);
                return (
                  <li key={hit.node.id}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        onPick(hit.node.id);
                        onClose();
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                        i === active ? "bg-black/5" : "hover:bg-black/5"
                      }`}
                    >
                      <span
                        className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: theme.accent }}
                      />
                      <span className="flex-1 truncate text-ink">
                        {hit.node.label}
                      </span>
                      <span className="text-[11px] text-ink/45">
                        {theme.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
