// Controlled issue categories. Legacy free-text values are mapped at display time.
export const CATEGORIES = [
  "Transportation & infrastructure",
  "Education & youth services",
  "Parks & public spaces",
  "Housing & development",
  "Environment & sustainability",
  "Public safety",
  "Community services",
  "Other local issues",
] as const;
export type Category = (typeof CATEGORIES)[number];

const MAP: Record<string, Category> = {
  transportation: "Transportation & infrastructure",
  infrastructure: "Transportation & infrastructure",
  education: "Education & youth services",
  youth: "Education & youth services",
  parks: "Parks & public spaces",
  recreation: "Parks & public spaces",
  housing: "Housing & development",
  development: "Housing & development",
  environment: "Environment & sustainability",
  "public safety": "Public safety",
  safety: "Public safety",
  community: "Community services",
  healthcare: "Community services",
  health: "Community services",
};

export function normalizeCategory(raw: string | null | undefined): Category {
  const k = (raw ?? "").trim().toLowerCase();
  if ((CATEGORIES as readonly string[]).includes(raw ?? "")) return raw as Category;
  return MAP[k] ?? "Other local issues";
}
