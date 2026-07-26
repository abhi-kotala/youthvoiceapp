import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ImpactBadge } from "@/components/impact-badge";

const CATEGORY_EMOJI: Record<string, string> = {
  School: "🏫",
  Education: "🏫",
  Transportation: "🚦",
  Parks: "🌳",
  Environment: "🌳",
  Taxes: "💰",
  Economy: "💰",
  Economic: "💰",
  Healthcare: "🏥",
  Health: "🏥",
  "Public Safety": "🚔",
  Safety: "🚔",
  Community: "🎭",
  "Community Events": "🎭",
  Ideas: "💡",
  Government: "⚖️",
  Housing: "🏠",
  General: "📌",
};

const catEmoji = (c: string) => CATEGORY_EMOJI[c] ?? "📌";

type Tally = { agree: number; disagree: number; neutral: number; total: number };

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  impact_status?: string | null;
};


type IssueCardProps = {
  issue: Issue;
  tally: Tally;
  commentCount: number;
  trending?: boolean;
  variant?: "default" | "featured";
  className?: string;
};

export function IssueCard({
  issue,
  tally,
  commentCount,
  trending = false,
  variant = "default",
  className,
}: IssueCardProps) {
  if (variant === "featured") {
    return (
      <Link
        to="/issue/$id"
        params={{ id: issue.id }}
        className={cn(
          "group grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:grid-cols-[1fr_auto] sm:items-center",
          className,
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-foreground">
              {catEmoji(issue.category)} {issue.category}
            </span>
            <span>·</span>
            <span>{issue.city}</span>
            {trending && (
              <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                🔥 Trending
              </span>
            )}
            <ImpactBadge status={issue.impact_status} />
          </div>
          <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            {issue.title}
          </h2>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground sm:text-base">
            {issue.description}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {tally.total} votes · {commentCount} comments
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition group-hover:-translate-y-0.5 group-hover:shadow-md">
          Weigh in →
        </span>
      </Link>
    );
  }

  return (
    <Link
      to="/issue/$id"
      params={{ id: issue.id }}
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-foreground">
          {catEmoji(issue.category)} {issue.category}
        </span>
        <span className="text-muted-foreground">· {issue.city}</span>
        {trending && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            🔥 Trending
          </span>
        )}
      </div>
      <div className="mt-1.5">
        <ImpactBadge status={issue.impact_status} />
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug">{issue.title}</h3>
      <p className="mt-2 line-clamp-3 flex-grow text-sm text-muted-foreground">
        {issue.description}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          🗳️ {tally.total} · 💬 {commentCount}
        </span>
        <span className="font-medium text-primary transition group-hover:translate-x-0.5">
          Weigh in →
        </span>
      </div>
    </Link>
  );
}

export { catEmoji, CATEGORY_EMOJI };
export type { Issue, Tally };
