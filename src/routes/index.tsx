import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ISSUE_PUBLIC_COLUMNS } from "@/lib/issue-columns";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import { CityStatusBadge } from "@/components/city-status-badge";
import { listCities } from "@/lib/cities.functions";
import { cityKey } from "@/lib/cities";
import { getLeaderboard } from "@/lib/leaderboard.functions";
import { ArrowRight, Flame, MapPin, MessagesSquare, Search, Trophy } from "lucide-react";
import heroCivic from "@/assets/hero-civic.png";

const FEATURED = ["west-fargo-nd", "fargo-nd", "moorhead-mn"];

type Tally = { agree: number; disagree: number; neutral: number; total: number };

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
};

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  points: number;
  streak: number;
  rank: number;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Youth Voice — Your community. Your voice." },
      {
        name: "description",
        content:
          "Share your perspective, join community discussions, and help decision-makers understand what matters to young people.",
      },
      { property: "og:title", content: "Youth Voice — Your community. Your voice." },
      {
        property: "og:description",
        content:
          "Share your perspective, join community discussions, and help decision-makers understand what matters to young people.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://youthvoiceapp.lovable.app/" },
      { property: "og:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
    ],
    links: [{ rel: "canonical", href: "https://youthvoiceapp.lovable.app/" }],
  }),
  loader: () => listCities().catch(() => ({ cities: [], states: [] })),
  component: HomePage,
});

function HomePage() {
  const { cities } = Route.useLoaderData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tallies, setTallies] = useState<Record<string, Tally>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [issuesRes, votesRes, commentsRes] = await Promise.all([
        supabase.from("issues").select(ISSUE_PUBLIC_COLUMNS).order("created_at", { ascending: false }),
        supabase.from("votes").select("issue_id, choice"),
        supabase.from("comments").select("issue_id").eq("hidden", false),
      ]);
      setIssues((issuesRes.data ?? []) as Issue[]);

      const t: Record<string, Tally> = {};
      (votesRes.data ?? []).forEach((v: { issue_id: string; choice: string }) => {
        t[v.issue_id] ??= { agree: 0, disagree: 0, neutral: 0, total: 0 };
        t[v.issue_id][v.choice as keyof Omit<Tally, "total">] += 1;
        t[v.issue_id].total += 1;
      });
      setTallies(t);

      const c: Record<string, number> = {};
      (commentsRes.data ?? []).forEach((r: { issue_id: string }) => {
        c[r.issue_id] = (c[r.issue_id] ?? 0) + 1;
      });
      setCommentCounts(c);
    })();
    getLeaderboard()
      .then((r) => setLeaders((r.entries ?? []) as LeaderboardEntry[]))
      .catch(() => {});
  }, []);

  const ranked = useMemo(
    () =>
      [...issues].sort(
        (a, b) => (tallies[b.id]?.total ?? 0) - (tallies[a.id]?.total ?? 0),
      ),
    [issues, tallies],
  );
  const featuredPoll = ranked.find((i) => (tallies[i.id]?.total ?? 0) > 0) ?? ranked[0] ?? null;
  const trending = ranked.filter((i) => i.id !== featuredPoll?.id).slice(0, 3);

  const featured = useMemo(() => {
    const byKey = new Map(cities.map((c) => [cityKey(c.slug, c.state_code), c]));
    const picked = FEATURED.map((k) => byKey.get(k)).filter(Boolean);
    return picked.length > 0 ? picked : cities.slice(0, 3);
  }, [cities]);

  const pct = (t: Tally, n: number) => (t.total ? Math.round((n / t.total) * 100) : 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* ================= HERO ================= */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-24">
          <div className="animate-rise">
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-accent sm:text-5xl lg:text-6xl">
              Your community.
              <br />
              <span className="text-primary">Your voice.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Share your perspective, join community discussions, and help decision-makers
              understand what matters to young people.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/explore"
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
              >
                Explore Communities
              </Link>
              <Link
                to="/about"
                className="text-sm font-semibold text-accent underline-offset-4 transition hover:text-primary hover:underline"
              >
                How It Works
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <img
              src={heroCivic}
              alt="Young people sharing ideas and participating in their community"
              width={1024}
              height={1024}
              className="w-full animate-float"
            />
          </div>
        </div>
      </section>

      {/* ================= FEATURED POLL ================= */}
      {featuredPoll && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-accent sm:text-3xl">
              Featured poll
            </h2>
          </div>
          {(() => {
            const t = tallies[featuredPoll.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 };
            return (
              <Link
                to="/issue/$id"
                params={{ id: featuredPoll.id }}
                className="glass glass-hover mt-6 block rounded-3xl p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <span className="rounded-full bg-secondary px-3 py-1">{featuredPoll.category}</span>
                  <span className="rounded-full bg-secondary px-3 py-1">{featuredPoll.city}</span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                    {t.total} vote{t.total === 1 ? "" : "s"}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-accent sm:text-2xl">
                  {featuredPoll.title}
                </h3>
                <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {featuredPoll.description}
                </p>
                <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div className="bg-chart-1" style={{ width: `${pct(t, t.agree)}%` }} />
                  <div className="bg-chart-2" style={{ width: `${pct(t, t.disagree)}%` }} />
                  <div className="bg-chart-3" style={{ width: `${pct(t, t.neutral)}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>{pct(t, t.agree)}% agree</span>
                  <span>{pct(t, t.disagree)}% disagree</span>
                  <span>{pct(t, t.neutral)}% neutral</span>
                  <span>{commentCounts[featuredPoll.id] ?? 0} in the discussion</span>
                </div>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Vote and join the discussion
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })()}
        </section>
      )}

      {/* ================= TRENDING DISCUSSIONS ================= */}
      {trending.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-accent sm:text-3xl">
              Active discussions
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {trending.map((i) => {
              const t = tallies[i.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 };
              return (
                <Link
                  key={i.id}
                  to="/issue/$id"
                  params={{ id: i.id }}
                  className="glass glass-hover flex flex-col rounded-2xl p-5"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {i.city}
                  </span>
                  <h3 className="mt-2 line-clamp-2 flex-grow font-display text-base font-bold text-accent">
                    {i.title}
                  </h3>
                  <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="bg-chart-1" style={{ width: `${pct(t, t.agree)}%` }} />
                    <div className="bg-chart-2" style={{ width: `${pct(t, t.disagree)}%` }} />
                    <div className="bg-chart-3" style={{ width: `${pct(t, t.neutral)}%` }} />
                  </div>
                  <span className="mt-3 text-xs text-muted-foreground">
                    {t.total} vote{t.total === 1 ? "" : "s"} · {commentCounts[i.id] ?? 0} comments
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= LEADERBOARD PREVIEW ================= */}
      {leaders.length > 0 && (
        <section className="border-y border-border bg-card/60">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-accent sm:text-3xl">
                  Top contributors
                </h2>
              </div>
              <Link
                to="/leaderboard"
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent underline-offset-4 transition hover:text-primary hover:underline"
              >
                Full leaderboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
              {leaders.slice(0, 5).map((e, i) => (
                <div
                  key={e.userId}
                  className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0"
                >
                  <span
                    className={`w-7 text-center font-display text-lg font-extrabold ${
                      i === 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {e.rank ?? i + 1}
                  </span>
                  {e.avatarUrl ? (
                    <img
                      src={e.avatarUrl}
                      alt=""
                      loading="lazy"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary font-display text-sm font-bold text-accent">
                      {e.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {e.displayName}
                    </p>
                    {e.handle && (
                      <p className="truncate text-xs text-muted-foreground">@{e.handle}</p>
                    )}
                  </div>
                  {e.streak > 0 && (
                    <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:inline">
                      {e.streak}-day streak
                    </span>
                  )}
                  <span className="font-display text-sm font-bold text-accent">
                    {e.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= FIND YOUR COMMUNITY ================= */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-accent sm:text-3xl">
          Find Your Community
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Youth Voice is growing city by city. See whether your community is here yet.
        </p>

        <form
          className="relative mt-6 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/explore" });
          }}
        >
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            aria-label="Search a city or state"
            placeholder="Search a city or state…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 rounded-full pl-11 text-base shadow-sm"
          />
        </form>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c) => (
            <Link
              key={c!.id}
              to="/cities/$key"
              params={{ key: cityKey(c!.slug, c!.state_code) }}
              className="glass glass-hover group rounded-2xl p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {c!.state_name}
                  </span>
                </div>
                <CityStatusBadge status={c!.status} />
              </div>
              <h3 className="mt-3 font-display text-xl font-bold text-accent">{c!.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {c!.activePolls === 0
                  ? "No active polls yet"
                  : `${c!.activePolls} active ${c!.activePolls === 1 ? "poll" : "polls"}`}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Explore
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1 text-sm font-semibold text-accent underline-offset-4 transition hover:text-primary hover:underline"
          >
            Explore All Communities
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ================= REQUEST YOUR COMMUNITY ================= */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl bg-accent px-6 py-12 text-center sm:px-12">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-accent-foreground sm:text-3xl">
            Don't see your community?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-accent-foreground/80 sm:text-base">
            Help bring Youth Voice to the place you call home.
          </p>
          <Link
            to="/bring-youth-voice"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
          >
            Request Your Community
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
