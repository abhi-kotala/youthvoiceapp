// Browser-safe constants for "Bring Youth Voice to Your Community".
export const INTEREST_MIN = 5; // distinct devices before a community's interest is shown publicly

export const COMMUNITY_TYPES = {
  city: "City or town",
  school: "School",
  district: "School district",
  youth_org: "Youth organization",
  other: "Other",
} as const;

export const INTEREST_STATUSES = ["received", "under_review", "more_info", "outreach", "approved_pilot", "official_confirmed", "declined", "on_hold"] as const;
export const INTEREST_LABEL: Record<string, string> = {
  received: "Received", under_review: "Under review", more_info: "More information needed", outreach: "Outreach in progress",
  approved_pilot: "Approved for pilot", official_confirmed: "Official partner confirmed", declined: "Declined", on_hold: "On hold",
};

/** Normalized key so "St. Paul", "st paul " and "Saint Paul" don't all become separate requests. */
export function communityKey(name: string, state: string) {
  const n = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\bst\.?\b/g, "saint").replace(/\bft\.?\b/g, "fort").replace(/\bmt\.?\b/g, "mount")
    .replace(/\b(city of|town of|the)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return `${n}|${state.toUpperCase()}`;
}
