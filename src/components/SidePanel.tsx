import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { RoadmapLayout, RoadmapNode } from "@/data/types";
import { themeFor } from "@/data/theme";

interface Props {
  nodeId: string | null;
  layout: RoadmapLayout;
  onClose: () => void;
  onJumpTo: (id: string) => void;
}

function nodeBreadcrumb(id: string, layout: RoadmapLayout): RoadmapNode[] {
  const out: RoadmapNode[] = [];
  let cur = layout.byId.get(id);
  while (cur) {
    out.unshift(cur);
    if (!cur.parentId) break;
    cur = layout.byId.get(cur.parentId);
  }
  return out;
}

function pickDistrictId(node: RoadmapNode, layout: RoadmapLayout): string {
  let cur: RoadmapNode | undefined = node;
  while (cur && cur.parentId && cur.parentId !== "root") {
    cur = layout.byId.get(cur.parentId);
  }
  return cur?.id ?? "P0";
}

export function SidePanel({ nodeId, layout, onClose, onJumpTo }: Props) {
  const node = nodeId ? layout.byId.get(nodeId) ?? null : null;

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          key={node.id}
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="absolute right-4 top-4 bottom-4 z-20 w-[360px] rounded-2xl bg-white/95 shadow-soft backdrop-blur"
        >
          <Inner
            node={node}
            layout={layout}
            onClose={onClose}
            onJumpTo={onJumpTo}
          />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Inner({
  node,
  layout,
  onClose,
  onJumpTo,
}: {
  node: RoadmapNode;
  layout: RoadmapLayout;
  onClose: () => void;
  onJumpTo: (id: string) => void;
}) {
  const districtId = pickDistrictId(node, layout);
  const theme = themeFor(districtId);
  const trail = nodeBreadcrumb(node.id, layout).slice(1); // skip the synthetic root

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: theme.accent }}
          />
          <span className="text-xs font-medium" style={{ color: theme.ink }}>
            {theme.name} · {theme.subtitle}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-ink/60 hover:bg-black/5"
          aria-label="close"
        >
          ✕
        </button>
      </div>

      <h2 className="mt-3 text-xl font-semibold leading-tight text-ink">
        {node.label}
      </h2>
      {node.stars > 0 && (
        <div className="mt-1 text-sm" style={{ color: theme.accent }}>
          {"★".repeat(Math.min(4, node.stars))}
          <span className="ml-2 text-xs text-ink/50">难度</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1 text-xs text-ink/60">
        {trail.map((b, i) => (
          <span key={b.id} className="inline-flex items-center gap-1">
            <button
              onClick={() => onJumpTo(b.id)}
              className="rounded px-1 hover:bg-black/5"
            >
              {b.label.length > 22 ? b.label.slice(0, 22) + "…" : b.label}
            </button>
            {i < trail.length - 1 && <span className="opacity-50">›</span>}
          </span>
        ))}
      </div>

      <div className="my-4 h-px bg-black/5" />

      <div className="flex-1 overflow-y-auto scroll-thin pr-1">
        {node.prereqIds.length > 0 && (
          <Section title="先修依赖">
            <div className="flex flex-wrap gap-1.5">
              {node.prereqIds.map((id) => {
                const p = layout.byId.get(id);
                if (!p) return null;
                return (
                  <button
                    key={id}
                    onClick={() => onJumpTo(id)}
                    className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs hover:bg-black/5"
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {node.children.length > 0 && (
          <Section title={`下级内容（${node.children.length}）`}>
            <ul className="space-y-1">
              {node.children.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onJumpTo(c.id)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-black/5"
                  >
                    <span>{c.label}</span>
                    {c.stars > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: theme.accent }}
                      >
                        {"★".repeat(c.stars)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="资源占位">
          <ul className="space-y-2 text-sm text-ink/70">
            <li className="flex items-center gap-2">
              <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px]">论文</span>
              <span className="text-ink/40">待补充推荐论文清单</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px]">代码</span>
              <span className="text-ink/40">待补充参考实现</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px]">视频</span>
              <span className="text-ink/40">待补充讲解视频</span>
            </li>
          </ul>
        </Section>
      </div>

      <Link
        to={`/course/${encodeURIComponent(node.id)}`}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
        style={{ background: theme.accent }}
      >
        打开详情页 →
      </Link>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink/45">
        {title}
      </h3>
      {children}
    </div>
  );
}
