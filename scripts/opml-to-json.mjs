// Parse the True-Intelligence OPML and emit a normalized roadmap.json.
//
// Design choices:
// - We hand-roll a tiny stateful XML walker. The OPML uses two forms only:
//     <outline text="..."/>          (self-closing leaf)
//     <outline text="...">           (open tag, with children)
//     </outline>                     (close)
//   so we don't need a full XML parser and avoid pulling in deps.
// - Each node gets a stable, slug-style `id` derived from its prefix
//   (e.g. "1.1", "2.5.3", "P3") so urls /course/:id stay readable.
// - We extract difficulty stars (★ count) and prerequisite refs like
//   "[需 1.1, 1.2, 1.5]" into structured fields and strip them from the label.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const OPML_PATH = resolve(ROOT, "AI课程总体系_True_Intelligence_v2.opml");
const OUT_PATH = resolve(ROOT, "public/data/roadmap.json");

/** @typedef {{
 *   id: string,
 *   label: string,
 *   rawText: string,
 *   depth: number,
 *   stars: number,
 *   prereq: string[],
 *   parentId: string | null,
 *   path: string[],
 *   leadingNumber: string | null,
 *   children: Node[],
 * }} Node */

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseAttr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : null;
}

function tokenize(xml) {
  // Strip XML declaration and head/body wrappers we don't care about.
  const tokens = [];
  const re = /<([^>]+)>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const inner = m[1].trim();
    if (inner.startsWith("?") || inner.startsWith("!")) continue;
    tokens.push(inner);
  }
  return tokens;
}

function extractMeta(rawText) {
  let label = rawText;
  let stars = 0;
  const prereq = [];

  const starMatch = label.match(/(★+)/);
  if (starMatch) {
    stars = starMatch[1].length;
    label = label.replace(/★+/g, "").trim();
  }

  const reqMatch = label.match(/\[\s*需\s*([^\]]+)\]/);
  if (reqMatch) {
    const body = reqMatch[1];
    // Capture both "1.1, 1.2, 1.5" style refs and "Part Ⅰ" / "Part Ⅱ" style refs.
    const tokens = [];
    const partRe = /Part\s*([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ])/g;
    let pm;
    while ((pm = partRe.exec(body)) !== null) tokens.push(`Part ${pm[1]}`);
    const numRe = /[0-9]+(?:\.[0-9]+){0,3}/g;
    let nm;
    while ((nm = numRe.exec(body)) !== null) tokens.push(nm[0]);
    tokens.forEach((t) => prereq.push(t));
    label = label.replace(/\[\s*需[^\]]+\]/, "").trim();
  }

  // Trim trailing authoring notes like "（新增）" / "（独立章节）" / "（重点）".
  // Keep them in rawText so the detail page can still surface them later.
  const noteWords = [
    "新增",
    "独立章节",
    "重点",
    "重磅",
    "工程化",
    "整理",
    "自 ML 模块迁移",
  ];
  const notePattern = new RegExp(
    `[（(][^()）]*?(?:${noteWords.join("|")})[^()）]*?[)）]`,
    "g"
  );
  label = label.replace(notePattern, "").replace(/\s+/g, " ").trim();

  return { label, stars, prereq };
}

function leadingNumberOf(text) {
  // Match patterns like "1.1", "3.6", "2.10", "0.4"
  const m = text.match(/^([0-9]+(?:\.[0-9]+){0,3})\b/);
  return m ? m[1] : null;
}

const PART_ID_RE = /Part\s*([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ])/;
const PART_TO_NUM = {
  Ⅰ: 1, Ⅱ: 2, Ⅲ: 3, Ⅳ: 4, Ⅴ: 5, Ⅵ: 6, Ⅶ: 7, Ⅷ: 8, Ⅸ: 9, Ⅹ: 10,
};

function makeIdFor(rawText, parent, siblingIdx) {
  const num = leadingNumberOf(rawText);
  if (num) return num;
  const partMatch = rawText.match(PART_ID_RE);
  if (partMatch) return `P${PART_TO_NUM[partMatch[1]] ?? partMatch[1]}`;
  if (rawText.startsWith("第 0 章") || rawText.startsWith("第0章")) return "P0";
  if (parent && parent.id) return `${parent.id}.${siblingIdx + 1}`;
  return `n${siblingIdx + 1}`;
}

function parse(xml) {
  const tokens = tokenize(xml);
  /** @type {Node | null} */
  let root = null;
  /** @type {Node[]} */
  const stack = [];
  let outlineDepth = -1; // -1 means we haven't met the first outline yet

  for (const raw of tokens) {
    if (raw === "/outline") {
      stack.pop();
      outlineDepth--;
      continue;
    }
    if (!raw.startsWith("outline")) continue;

    const text = parseAttr(raw, "text");
    if (text == null) continue;
    const selfClosing = raw.endsWith("/");

    const parent = stack[stack.length - 1] ?? null;
    const siblingIdx = parent ? parent.children.length : 0;
    const meta = extractMeta(text);

    let id;
    if (parent === null) {
      id = "root";
    } else {
      id = makeIdFor(text, parent, siblingIdx);
    }

    const node = {
      id,
      label: meta.label || text,
      rawText: text,
      depth: outlineDepth + 1,
      stars: meta.stars,
      prereq: meta.prereq,
      parentId: parent ? parent.id : null,
      path: parent ? [...parent.path, parent.id] : [],
      leadingNumber: leadingNumberOf(text),
      children: [],
    };

    if (parent) parent.children.push(node);
    else root = node;

    if (!selfClosing) {
      stack.push(node);
      outlineDepth++;
    }
  }

  if (!root) throw new Error("OPML root not found");
  return root;
}

function flatten(root) {
  const list = [];
  function walk(n) {
    list.push(n);
    n.children.forEach(walk);
  }
  walk(root);
  return list;
}

function main() {
  const raw = readFileSync(OPML_PATH, "utf8");
  const root = parse(raw);

  // Promote level-1 children of the synthetic top label to be the top-level
  // "districts". The OPML wraps everything inside a single outermost outline
  // that says "真实智能（True Intelligence）· 课程总图 v2"; we keep that as the
  // root but expose it explicitly so the front-end can read root.children.
  const all = flatten(root);
  const idIndex = new Map(all.map((n) => [n.id, n]));
  const numberIndex = new Map();
  all.forEach((n) => {
    if (n.leadingNumber) numberIndex.set(n.leadingNumber, n.id);
  });

  // Resolve prereq strings (which refer to leading numbers like "1.1" or
  // "Part Ⅰ") into canonical node ids when possible.
  all.forEach((n) => {
    n.prereqIds = n.prereq
      .map((p) => {
        const partMatch = p.match(PART_ID_RE);
        if (partMatch) return `P${PART_TO_NUM[partMatch[1]] ?? partMatch[1]}`;
        return numberIndex.get(p);
      })
      .filter((id) => id && id !== n.id);
  });

  // Build a slim serializable shape (no circular parent refs).
  function serialize(n) {
    return {
      id: n.id,
      label: n.label,
      rawText: n.rawText,
      depth: n.depth,
      stars: n.stars,
      prereq: n.prereq,
      prereqIds: n.prereqIds ?? [],
      parentId: n.parentId,
      leadingNumber: n.leadingNumber,
      children: n.children.map(serialize),
    };
  }

  const serialized = serialize(root);

  const stats = {
    totalNodes: all.length,
    leafNodes: all.filter((n) => n.children.length === 0).length,
    maxDepth: all.reduce((m, n) => Math.max(m, n.depth), 0),
    districts: root.children.length,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      { version: 2, generatedAt: new Date().toISOString(), stats, root: serialized },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `[opml-to-json] wrote ${OUT_PATH} · ${stats.totalNodes} nodes (${stats.leafNodes} leaves), depth=${stats.maxDepth}, districts=${stats.districts}`
  );
  if (idIndex.size !== all.length) {
    // Defensive: if duplicate ids ever appear, surface them so we can fix the heuristic.
    console.warn(
      `[opml-to-json] WARNING duplicate ids detected (${
        all.length - idIndex.size
      }). Inspect heuristic.`
    );
  }
}

main();
