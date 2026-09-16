import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard.functions";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardCard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    getLeaderboard()
      .then((r) => setEntries(r.entries))
      .catch(() => setEntries([]));
  }, []);

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Leaderboard</h2>
        <span className="text-xs text-muted-foreground">Top Impact Points</span>
      </div>

      {entries === null ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No one is on the board yet.{" "}
          <Link to="/account" className="text-primary underline underline-offset-2">
            Create a profile
          </Link>{" "}
          and your points show up here.
        </p>
      ) : (
        <ol className="mt-4 space-y-1">
          {entries.map((e) => (
            <li
              key={e.userId}
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/40"
            >
              <span className="w-7 shrink-0 text-center text-sm font-bold text-muted-foreground">
                {e.rank <= 3 ? MEDALS[e.rank - 1] : e.rank}
              </span>
              {e.avatarUrl ? (
                <img
                  src={e.avatarUrl}
                  alt={`${e.displayName}'s profile photo`}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {e.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{e.displayName}</span>
                {e.handle && (
                  <span className="block truncate text-xs text-muted-foreground">@{e.handle}</span>
                )}
              </span>
              {e.streak > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
                  <Flame className="h-3 w-3" />
                  {e.streak}
                </span>
              )}
              <span className="w-16 shrink-0 text-right text-sm font-bold text-primary">
                {e.points}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Only profiles appear here. Anonymous participation still earns points — it just stays off
        the board.
      </p>
    </section>
  );
}
