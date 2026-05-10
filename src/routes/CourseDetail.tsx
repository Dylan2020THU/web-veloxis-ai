import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useRoadmap } from "@/data/useRoadmap";
import { themeFor } from "@/data/theme";
import type { RoadmapNode } from "@/data/types";

function pickDistrictId(
  id: string,
  byId: Map<string, RoadmapNode>
): string {
  let cur = byId.get(id);
  while (cur && cur.parentId && cur.parentId !== "root") {
    cur = byId.get(cur.parentId);
  }
  return cur?.id ?? "P1";
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const decoded = id ? decodeURIComponent(id) : null;
  const { layout, doc, loading, error } = useRoadmap();

  const node = useMemo(
    () => (decoded && layout ? layout.byId.get(decoded) : null),
    [decoded, layout]
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="font-hand text-2xl text-ink/60">载入课程数据…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-red-500">数据加载失败：{error}</span>
      </div>
    );
  }
  if (!layout || !doc || !node) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <span className="text-ink/60">未找到节点 {decoded ?? "(none)"}</span>
        <Link to="/" className="text-sm text-ink/80 underline">
          ← 返回地图
        </Link>
      </div>
    );
  }

  const districtId = pickDistrictId(node.id, layout.byId);
  const theme = themeFor(districtId);
  const district = layout.byId.get(districtId);

  // Build a flat ordered list of siblings (the chapter or pin level) for the
  // left sidebar. We anchor on the district so the user can navigate within
  // it.
  const districtChapters = district?.children ?? [];

  return (
    <div
      className="grid h-screen w-screen overflow-hidden"
      style={{ gridTemplateColumns: "300px 1fr" }}
    >
      <aside className="overflow-y-auto border-r border-black/5 bg-white/80 p-5 scroll-thin">
        <Link
          to="/"
          className="text-xs text-ink/60 hover:text-ink"
        >
          ← 返回 2.5D 地图
        </Link>
        <div className="mt-4">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: theme.accent }}
          />
          <span className="ml-2 text-xs font-medium" style={{ color: theme.ink }}>
            {theme.name}
          </span>
        </div>
        <h2 className="mt-1 text-lg font-semibold text-ink">
          {district?.label}
        </h2>

        <nav className="mt-5 space-y-1 text-sm">
          {districtChapters.map((chapter) => (
            <ChapterEntry key={chapter.id} chapter={chapter} activeId={node.id} />
          ))}
        </nav>
      </aside>

      <main className="overflow-y-auto p-10 scroll-thin">
        <div className="mx-auto max-w-3xl">
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.accent }}>
            {theme.name} · {theme.subtitle}
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-ink">
            {node.label}
          </h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-ink/60">
            {node.stars > 0 && (
              <span style={{ color: theme.accent }}>
                {"★".repeat(node.stars)}
              </span>
            )}
            <span>层级 L{node.depth}</span>
            {node.children.length > 0 && (
              <span>{node.children.length} 个子项</span>
            )}
          </div>

          <article className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink/85">
            <section>
              <h3 className="mb-2 text-base font-semibold text-ink">课程概述</h3>
              <p>
                该节点对应原 OPML 条目：
                <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px]">
                  {node.rawText}
                </code>
                。详细的讲义、推荐阅读和代码仓库将在后续版本中补充；当前页面提供：
              </p>
              <ul className="mt-2 list-disc pl-5 text-ink/75">
                <li>清晰的层级关系与先修依赖跳转</li>
                <li>同章节其他主题的快速切换</li>
                <li>从 2.5D 地图直接进入的上下文锚点</li>
              </ul>
            </section>

            {node.prereqIds.length > 0 && (
              <section>
                <h3 className="mb-2 text-base font-semibold text-ink">
                  先修依赖
                </h3>
                <ul className="list-disc pl-5">
                  {node.prereqIds.map((pid) => {
                    const p = layout.byId.get(pid);
                    if (!p) return null;
                    return (
                      <li key={pid}>
                        <Link
                          to={`/course/${encodeURIComponent(pid)}`}
                          style={{ color: theme.accent }}
                          className="underline-offset-2 hover:underline"
                        >
                          {p.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {node.children.length > 0 && (
              <section>
                <h3 className="mb-2 text-base font-semibold text-ink">
                  下级内容
                </h3>
                <ul className="list-disc pl-5">
                  {node.children.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/course/${encodeURIComponent(c.id)}`}
                        style={{ color: theme.accent }}
                        className="underline-offset-2 hover:underline"
                      >
                        {c.label}
                      </Link>
                      {c.stars > 0 && (
                        <span className="ml-1" style={{ color: theme.accent }}>
                          {" "}
                          {"★".repeat(c.stars)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-base font-semibold text-ink">资源占位</h3>
              <p className="text-ink/55">
                · 推荐论文清单 / 代码仓库 / 视频讲解将随后填充。
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}

function ChapterEntry({
  chapter,
  activeId,
}: {
  chapter: RoadmapNode;
  activeId: string;
}) {
  const isActive = chapter.id === activeId;
  return (
    <div>
      <Link
        to={`/course/${encodeURIComponent(chapter.id)}`}
        className={`block rounded px-2 py-1.5 ${
          isActive ? "bg-black/5 font-semibold text-ink" : "text-ink/70 hover:bg-black/5"
        }`}
      >
        {chapter.label}
      </Link>
      {chapter.children.length > 0 && (
        <ul className="ml-3 mt-1 space-y-0.5 border-l border-black/5 pl-3">
          {chapter.children.map((c) => (
            <li key={c.id}>
              <Link
                to={`/course/${encodeURIComponent(c.id)}`}
                className={`block rounded px-2 py-1 text-xs ${
                  c.id === activeId
                    ? "bg-black/5 font-semibold text-ink"
                    : "text-ink/60 hover:bg-black/5"
                }`}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
