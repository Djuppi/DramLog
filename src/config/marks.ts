export type MarkCategory = "collection" | "region" | "country";

export interface MarkStats {
  collectionCount: number;
  regionCounts: Record<string, number>;
  countryCounts: Record<string, number>;
}

export interface MarkDefinition {
  id: string;
  name: string;
  description: string;
  category: MarkCategory;
  svgPath: string;
  check: (stats: MarkStats) => boolean;
}

// All paths use a 60×60 viewBox
export const MARKS: MarkDefinition[] = [
  // ── Collection ──────────────────────────────────────────────────────────────
  {
    id: "first_dram",
    name: "First Dram",
    description: "Add your first bottle to your collection",
    category: "collection",
    // Whisky drop shape
    svgPath:
      "M 30,8 L 48,34 C 48,46 40,54 30,54 C 20,54 12,46 12,34 Z",
    check: (s) => s.collectionCount >= 1,
  },
  {
    id: "home_bar",
    name: "The Home Bar",
    description: "Collect 5 bottles",
    category: "collection",
    // Three bottles on a shelf
    svgPath:
      "M 12,44 L 18,44 L 18,30 L 16,26 L 14,26 L 12,30 Z " +
      "M 27,44 L 33,44 L 33,24 L 31,20 L 29,20 L 27,24 Z " +
      "M 42,44 L 48,44 L 48,28 L 46,24 L 44,24 L 42,28 Z " +
      "M 8,46 L 52,46 L 52,48 L 8,48 Z",
    check: (s) => s.collectionCount >= 5,
  },

  // ── Scottish Regions ────────────────────────────────────────────────────────
  {
    id: "region_speyside",
    name: "Speyside Soul",
    description: "5 bottles from Speyside",
    category: "region",
    // NE Scotland diamond-ish region
    svgPath:
      "M 10,18 L 26,10 L 44,12 L 52,22 L 50,36 L 36,46 L 18,44 L 8,32 Z",
    check: (s) => (s.regionCounts["speyside"] ?? 0) >= 5,
  },
  {
    id: "region_islay",
    name: "Islay Pilgrim",
    description: "3 bottles from Islay",
    category: "region",
    // Islay island with Rhinns peninsula and Loch Indaal bay
    svgPath:
      "M 28,8 L 36,8 L 46,14 L 48,24 L 42,34 L 36,42 L 28,44 " +
      "L 22,40 L 14,34 L 16,26 L 20,20 L 20,12 Z",
    check: (s) => (s.regionCounts["islay"] ?? 0) >= 3,
  },
  {
    id: "region_highlands",
    name: "Highland Wanderer",
    description: "5 bottles from the Highlands",
    category: "region",
    // Large northern Scottish Highland region
    svgPath:
      "M 12,10 L 28,8 L 46,10 L 52,20 L 50,32 L 42,40 L 30,44 L 18,40 L 10,30 L 8,20 Z",
    check: (s) =>
      (s.regionCounts["highlands"] ?? 0) + (s.regionCounts["highland"] ?? 0) >= 5,
  },
  {
    id: "region_lowlands",
    name: "Lowland Drifter",
    description: "3 bottles from the Lowlands",
    category: "region",
    // Broad central-belt strip of Scotland
    svgPath:
      "M 8,20 L 20,14 L 38,14 L 52,22 L 52,36 L 44,44 L 28,48 L 10,42 L 6,32 Z",
    check: (s) =>
      (s.regionCounts["lowlands"] ?? 0) + (s.regionCounts["lowland"] ?? 0) >= 3,
  },
  {
    id: "region_campbeltown",
    name: "Campbeltown Dram",
    description: "2 bottles from Campbeltown",
    category: "region",
    // Kintyre peninsula — narrow elongated shape pointing south
    svgPath:
      "M 22,6 L 38,6 L 42,14 L 40,24 L 38,34 L 34,46 L 30,54 " +
      "L 26,46 L 22,34 L 20,24 L 18,14 Z",
    check: (s) => (s.regionCounts["campbeltown"] ?? 0) >= 2,
  },
  {
    id: "region_islands",
    name: "Island Hopper",
    description: "3 bottles from the Islands",
    category: "region",
    // Scattered Scottish island shapes (Skye, Mull, Arran, Orkney, Jura)
    svgPath:
      "M 10,8 L 20,6 L 28,12 L 24,20 L 18,22 L 10,18 Z " +
      "M 8,28 L 16,26 L 22,30 L 20,38 L 14,40 L 8,36 Z " +
      "M 14,46 L 20,44 L 24,50 L 20,56 L 14,54 Z " +
      "M 34,8 L 44,6 L 50,10 L 48,16 L 40,18 L 34,16 Z " +
      "M 34,26 L 40,24 L 44,30 L 42,40 L 36,42 L 32,38 Z",
    check: (s) =>
      (s.regionCounts["islands"] ?? 0) + (s.regionCounts["island"] ?? 0) >= 3,
  },

  // ── Countries ────────────────────────────────────────────────────────────────
  {
    id: "country_ireland",
    name: "Irish Heritage",
    description: "3 bottles from Ireland",
    category: "country",
    // Ireland island outline
    svgPath:
      "M 32,6 L 42,8 L 48,14 L 50,22 L 46,32 L 40,42 L 30,50 " +
      "L 20,48 L 12,40 L 10,30 L 12,22 L 16,14 L 24,8 Z",
    check: (s) => (s.countryCounts["ireland"] ?? 0) >= 3,
  },
  {
    id: "country_usa",
    name: "Bourbon Trail",
    description: "3 bottles from the USA",
    category: "country",
    // Continental US silhouette with Florida peninsula
    svgPath:
      "M 8,18 L 16,14 L 32,12 L 46,14 L 54,20 L 54,28 L 50,32 " +
      "L 48,36 L 46,38 L 44,44 L 42,50 L 38,52 L 36,46 " +
      "L 28,38 L 18,32 L 8,28 Z",
    check: (s) =>
      (s.countryCounts["united states"] ?? 0) +
        (s.countryCounts["usa"] ?? 0) +
        (s.countryCounts["us"] ?? 0) >= 3,
  },
  {
    id: "country_japan",
    name: "Rising Dram",
    description: "3 bottles from Japan",
    category: "country",
    // Japanese main islands (Hokkaido, Honshu, Shikoku, Kyushu)
    svgPath:
      "M 32,10 L 44,8 L 52,12 L 50,20 L 40,22 L 32,18 Z " +
      "M 20,24 L 32,20 L 44,24 L 50,32 L 46,40 L 36,46 L 24,44 L 16,38 L 14,30 Z " +
      "M 28,48 L 38,46 L 40,52 L 30,54 Z " +
      "M 12,42 L 22,40 L 26,48 L 22,54 L 14,52 Z",
    check: (s) => (s.countryCounts["japan"] ?? 0) >= 3,
  },
];

export const MARK_CATEGORIES: { key: MarkCategory; label: string }[] = [
  { key: "collection", label: "Collection" },
  { key: "region", label: "Scottish Regions" },
  { key: "country", label: "Countries" },
];
