// One theme per top-level district. Tones picked to match a "morning-mist
// watercolor" feel — pastel grass / soft roof / ink-dark accent — so the whole
// map reads like a hand-drawn campus guide.
export interface DistrictTheme {
  id: string;
  /** Friendly English name shown on signage. */
  name: string;
  /** Subtitle in 中文, used on the district arch. */
  subtitle: string;
  /** Soft tint for the plot ground. */
  ground: [string, string]; // gradient stops
  /** Roof tone for buildings within the district. */
  roof: string;
  /** Side / shadow tone for buildings. */
  side: string;
  /** Accent color (pin head / landmark band). */
  accent: string;
  /** Ink color for labels in this district. */
  ink: string;
}

export const DISTRICT_THEMES: Record<string, DistrictTheme> = {
  P0: {
    id: "P0",
    name: "Orientation Plaza",
    subtitle: "课程总览",
    ground: ["#f6efe2", "#ede1c8"],
    roof: "#d5b78d",
    side: "#a98762",
    accent: "#b1672a",
    ink: "#3f2d18",
  },
  P1: {
    id: "P1",
    name: "Foundation Plaza",
    subtitle: "数学基础",
    ground: ["#eef4eb", "#dceadb"],
    roof: "#a8c79a",
    side: "#6f9968",
    accent: "#3f7a44",
    ink: "#1f3a25",
  },
  P2: {
    id: "P2",
    name: "Machine Will District",
    subtitle: "机器学习",
    ground: ["#f3eef7", "#e3d6ee"],
    roof: "#b59cd1",
    side: "#7d68a3",
    accent: "#5b3fa0",
    ink: "#2e2150",
  },
  P3: {
    id: "P3",
    name: "Deep Awakening Tower",
    subtitle: "深度学习",
    ground: ["#e8eef8", "#cfdcef"],
    roof: "#7fa5d6",
    side: "#4d6fa6",
    accent: "#1e4f9c",
    ink: "#142a55",
  },
  P4: {
    id: "P4",
    name: "Decision Awakening Arena",
    subtitle: "强化学习",
    ground: ["#fbeee0", "#f4d6b5"],
    roof: "#e29a6f",
    side: "#b06438",
    accent: "#a83b1b",
    ink: "#451c0c",
  },
  P5: {
    id: "P5",
    name: "Horizontal Stack Lab",
    subtitle: "横向能力栈",
    ground: ["#eaf2f3", "#cfe1e3"],
    roof: "#85b6b8",
    side: "#4f8385",
    accent: "#266b6e",
    ink: "#0f3132",
  },
  P6: {
    id: "P6",
    name: "Capstone Harbor",
    subtitle: "综合实战",
    ground: ["#eef4f9", "#cee2f0"],
    roof: "#7eb1d6",
    side: "#3f6f95",
    accent: "#1a4f7a",
    ink: "#0f2a40",
  },
};

export const FALLBACK_THEME: DistrictTheme = {
  id: "_fallback",
  name: "District",
  subtitle: "",
  ground: ["#eee", "#ddd"],
  roof: "#bbb",
  side: "#999",
  accent: "#666",
  ink: "#333",
};

export function themeFor(districtId: string): DistrictTheme {
  return DISTRICT_THEMES[districtId] ?? FALLBACK_THEME;
}
