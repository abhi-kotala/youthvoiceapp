import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Trophy } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard.functions";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  head: () => ({
    meta: [
      { title: "Impact Leaderboard — Youth Voice" },
      {
        name: "description",
        content:
          "See the top Civic Impact Point earners in Fargo–Moorhead–West Fargo. Vote, comment, and submit ideas to climb the board.",
      },
      { property: "og:title", content: "Impact Leaderboard — Youth Voice" },
      {
        property: "og:description",
        content: "Ranking the most active young voices in the Fargo–Moorhead area.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const MEDALS = ["🥇", "🥈", "🥉"];

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.avatarUrl) {
    return (
      <img
        src={entry.avatarUrl}
        alt={`${entry.displayName}'s profile photo`}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
      {entry.displayName.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const top = entry.rank <= 3;
  return (
    <li
      className={
        top
          ? "flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3"
          : "flex items-center gap-4 rounded-2xl border bg-card px-4 py-3"
      }
    >
      <span
        className={
          top
            ? "w-10 shrink-0 text-center text-xl font-bold"
            : "w-10 shrink-0 text-center text-lg font-bold text-muted-foreground"
        }
      >
        {top ? MEDALS[entry.rank - 1] : entry.rank}
      </span>
      <Avatar entry={entry} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{entry.displayName}</span>
        {entry.handle && (
          <span className="block truncate text-sm text-muted-foreground">@{entry.handle}</span>
        )}
      </span>
      {entry.streak > 0 && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-sm font-medium text-orange-500">
          <Flame className="h-4 w-4" />
          {entry.streak} day{entry.streak === 1 ? "" : "s"}
        </span>
      )}
      <span className="w-20 shrink-0 text-right text-lg font-bold text-primary">
        {entry.points}
      </span>
    </li>
  );
}

function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getLeaderboard()
      .then((r) => setEntries(r.entries))
      .catch(() => {
        setEntries([]);
        setError(true);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Trophy className="h-4 w-4" />
            Impact Leaderboard
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Top young voices in Fargo–Moorhead
          </h1>
          <p className="mt-2 text-muted-foreground">
            Ranked by Civic Impact Points — earned by voting, debating, and submitting ideas that
            shape the community.
          </p>
        </div>

        {entries === null ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[72px] rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <section className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <p className="text-lg font-semibold">No one is on the board yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a profile and your Impact Points show up here. Anonymous participation still
              earns points — it just stays off the board.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                to="/account"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
              >
                Create a profile
              </Link>
              <Link
                to="/"
                className="inline-flex items-center rounded-lg border px-4 py-2 font-medium hover:bg-muted/40"
              >
                Earn points
              </Link>
            </div>
          </section>
        ) : (
          <>
            <ol className="space-y-2">
              {entries.map((e) => (
                <Row key={e.userId} entry={e} />
              ))}
            </ol>
            {error ? (
              <p className="text-center text-xs text-muted-foreground">
                Couldn't refresh the board right now — showing what we have.
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Only profiles appear here. Anonymous participation still earns points — it just
                stays off the board.
              </p>
            )}
          </>
        )}

        <div className="text-center">
          <Link
            to="/my-impact"
            className="inline-flex items-center rounded-lg border px-4 py-2 font-medium hover:bg-muted/40"
          >
            See your own impact
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
