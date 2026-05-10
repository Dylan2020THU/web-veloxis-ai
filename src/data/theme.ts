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
  P1: {
    id: "P1",
    name: "Foundation Plaza",
    subtitle: "数学广场",
    ground: ["#eef4eb", "#dceadb"],
    roof: "#a8c79a",
    side: "#6f9968",
    accent: "#3f7a44",
    ink: "#1f3a25",
  },
  P2: {
    id: "P2",
    name: "Machine Will Workshop",
    subtitle: "机器意志工坊",
    ground: ["#f3eef7", "#e3d6ee"],
    roof: "#b59cd1",
    side: "#7d68a3",
    accent: "#5b3fa0",
    ink: "#2e2150",
  },
  P3: {
    id: "P3",
    name: "Deep Awakening Lab",
    subtitle: "深度觉醒实验室",
    ground: ["#e8eef8", "#cfdcef"],
    roof: "#7fa5d6",
    side: "#4d6fa6",
    accent: "#1e4f9c",
    ink: "#142a55",
  },
  P4: {
    id: "P4",
    name: "Reinforcement Training Arena",
    subtitle: "强化训练竞技场",
    ground: ["#fbeee0", "#f4d6b5"],
    roof: "#e29a6f",
    side: "#b06438",
    accent: "#a83b1b",
    ink: "#451c0c",
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
