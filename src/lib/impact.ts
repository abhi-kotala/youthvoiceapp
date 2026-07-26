// Civic Impact Points — shared client + server config.
// Anonymous, keyed by device_id.

export type ImpactAction =
  | "vote"
  | "comment"
  | "constructive_comment"
  | "idea_submitted"
  | "idea_100_votes"
  | "idea_reviewed"
  | "idea_implemented";

export const POINTS: Record<ImpactAction, number> = {
  vote: 5,
  comment: 10,
  constructive_comment: 10,
  idea_submitted: 15,
  idea_100_votes: 50,
  idea_reviewed: 100,
  idea_implemented: 500,
};

export type Level = {
  level: number;
  name: string;
  tagline: string;
  min: number;
};

export const LEVELS: Level[] = [
  { level: 1, name: "New Voice", tagline: "Just joined the conversation", min: 0 },
  { level: 2, name: "Active Citizen", tagline: "Regularly participates", min: 50 },
  { level: 3, name: "Community Advocate", tagline: "Creates meaningful discussions", min: 200 },
  { level: 4, name: "Youth Leader", tagline: "Influences community decisions", min: 500 },
  { level: 5, name: "Civic Champion", tagline: "Helps create real change", min: 1000 },
];

export function levelFor(points: number): { current: Level; next: Level | null; progress: number } {
  let current = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) current = l;
  const next = LEVELS.find((l) => l.min > points) ?? null;
  const progress = next ? (points - current.min) / (next.min - current.min) : 1;
  return { current, next, progress: Math.max(0, Math.min(1, progress)) };
}

export type Badge = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earned: (s: ImpactStats) => boolean;
};

export type ImpactStats = {
  points: number;
  counts: Partial<Record<ImpactAction, number>>;
};

export const BADGES: Badge[] = [
  {
    id: "first_voice",
    emoji: "🏅",
    name: "First Voice",
    description: "Cast your first vote",
    earned: (s) => (s.counts.vote ?? 0) >= 1,
  },
  {
    id: "idea_creator",
    emoji: "💡",
    name: "Idea Creator",
    description: "Submitted 5 ideas",
    earned: (s) => (s.counts.idea_submitted ?? 0) >= 5,
  },
  {
    id: "community_builder",
    emoji: "🤝",
    name: "Community Builder",
    description: "5 constructive comments",
    earned: (s) => (s.counts.constructive_comment ?? 0) + (s.counts.comment ?? 0) >= 5,
  },
  {
    id: "change_maker",
    emoji: "🌎",
    name: "Change Maker",
    description: "An idea you supported influenced a decision",
    earned: (s) => (s.counts.idea_reviewed ?? 0) >= 1,
  },
  {
    id: "civic_champion",
    emoji: "🏛",
    name: "Civic Champion",
    description: "Helped create real-world impact",
    earned: (s) => (s.counts.idea_implemented ?? 0) >= 1,
  },
];

export function computeBadges(stats: ImpactStats) {
  return BADGES.map((b) => ({ ...b, earned: b.earned(stats) }));
}
