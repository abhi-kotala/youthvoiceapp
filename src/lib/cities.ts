// Shared, browser-safe city helpers.
export type CityStatus = "official" | "pilot" | "listed" | "pending";

export const STATUS_LABEL: Record<CityStatus, string> = {
  official: "Official Partner",
  pilot: "Pilot",
  listed: "Not Yet Participating",
  pending: "Pending Approval",
};

export const STATUS_HELP: Record<CityStatus, string> = {
  official: "Formally verified partnership approved by the Youth Voice founder.",
  pilot: "Explicitly designated for testing. Not an official partnership with local government.",
  listed: "No confirmed partnership. Student-run discussions only — local government has not joined.",
  pending: "An application to bring Youth Voice here is awaiting review.",
};

export function cityKey(slug: string, state: string) {
  return `${slug}-${state.toLowerCase()}`;
}

/** "west-fargo-nd" -> { slug: "west-fargo", state: "ND" } */
export function parseCityKey(key: string): { slug: string; state: string } | null {
  const m = /^([a-z0-9-]+)-([a-z]{2})$/.exec(key.toLowerCase());
  return m ? { slug: m[1], state: m[2].toUpperCase() } : null;
}

/** Hide results below the city's minimum to protect small groups. */
export function suppressTally(
  t: { agree: number; disagree: number; neutral: number },
  min: number,
) {
  const total = t.agree + t.disagree + t.neutral;
  if (total < min) return { suppressed: true as const, total };
  const pct = (n: number) => Math.round((n / total) * 100);
  return {
    suppressed: false as const,
    total,
    ...t,
    pct: { agree: pct(t.agree), disagree: pct(t.disagree), neutral: pct(t.neutral) },
  };
}

export const SELECTED_CITY_KEY = "yv_selected_city";
