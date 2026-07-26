import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CountUp } from "@/components/count-up";
import fargoImg from "@/assets/city-fargo.jpg";
import westFargoImg from "@/assets/city-west-fargo.jpg";
import moorheadImg from "@/assets/city-moorhead.jpg";

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


type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
};

const CITIES = ["All", "Fargo", "West Fargo", "Moorhead"] as const;
type CityFilter = (typeof CITIES)[number];


type Tally = { agree: number; disagree: number; neutral: number; total: number };


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Youth Voice — Where under-18s weigh in on city issues" },
      {
        name: "description",
        content:
          "Youth Voice: a free, anonymous poll for under-18s in Fargo, West Fargo, and Moorhead. Vote and debate local city issues; results are shared with the city council and mayor.",
      },
      { property: "og:title", content: "Youth Voice — Under-18 city polls for Fargo-Moorhead" },
      {
        property: "og:description",
        content:
          "Free, anonymous polls for under-18s in Fargo, West Fargo, and Moorhead. Vote and debate local issues; results go to city council and the mayor.",
      },
      { property: "og:url", content: "https://youthvoiceapp.lovable.app/" },
      { property: "og:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
    ],
    links: [
      { rel: "canonical", href: "https://youthvoiceapp.lovable.app/" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tallies, setTallies] = useState<Record<string, Tally>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<CityFilter>("All");
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    (async () => {
      const [issuesRes, votesRes, commentsRes] = await Promise.all([
        supabase.from("issues").select("*").order("created_at", { ascending: false }),
        supabase.from("votes").select("issue_id, choice, device_id"),
        supabase.from("comments").select("issue_id, device_id").eq("hidden", false),
      ]);
      setIssues((issuesRes.data ?? []) as Issue[]);

      const t: Record<string, Tally> = {};
      const devices = new Set<string>();
      (votesRes.data ?? []).forEach((v: { issue_id: string; choice: string; device_id: string }) => {
        t[v.issue_id] ??= { agree: 0, disagree: 0, neutral: 0, total: 0 };
        t[v.issue_id][v.choice as keyof Omit<Tally, "total">] += 1;
        t[v.issue_id].total += 1;
        devices.add(v.device_id);
      });
      setTallies(t);

      const c: Record<string, number> = {};
      (commentsRes.data ?? []).forEach((r: { issue_id: string; device_id: string }) => {
        c[r.issue_id] = (c[r.issue_id] ?? 0) + 1;
        devices.add(r.device_id);
      });
      setCommentCounts(c);
      setParticipants(devices.size);
      setLoading(false);
    })();
  }, []);

  const totalVotes = Object.values(tallies).reduce((a, t) => a + t.total, 0);
  const categories = Array.from(new Set(issues.map((i) => i.category))).sort();

  // Trending = top 3 by votes (need >= 1 vote to qualify)
  const trendingIds = useMemo(() => {
    return new Set(
      [...issues]
        .filter((i) => (tallies[i.id]?.total ?? 0) > 0)
        .sort((a, b) => (tallies[b.id]?.total ?? 0) - (tallies[a.id]?.total ?? 0))
        .slice(0, 3)
        .map((i) => i.id),
    );
  }, [issues, tallies]);

  const featured =
    issues.length === 0
      ? null
      : [...issues].sort(
          (a, b) => (tallies[b.id]?.total ?? 0) - (tallies[a.id]?.total ?? 0),
        )[0];


  const filtered = issues.filter(
    (i) =>
      (city === "All" || i.city === city) &&
      (category === "All" || i.category === category),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid grid-cols-3 opacity-60">
          <img src={fargoImg} alt="Downtown Fargo skyline" className="h-full w-full object-cover" />
          <img src={westFargoImg} alt="West Fargo neighborhood" className="h-full w-full object-cover" />
          <img src={moorheadImg} alt="Moorhead city view" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-foreground backdrop-blur">
            <span aria-hidden>🗳️</span> Built by students · for Fargo–Moorhead
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Too young to vote.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Old enough to be heard.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Youth Voice is a free, anonymous poll for under-18s in Fargo, West
            Fargo, and Moorhead. Weigh in on the decisions your city is making
            right now — and we deliver the results straight to your city
            council and mayor's office. No accounts. No noise. Just your voice.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#issues"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("issues")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Vote on an issue →
            </a>
            <Link
              to="/newsletter"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              City meetings & dates
            </Link>
            <Link
              to="/about"
              className="rounded-full px-6 py-3 text-sm font-semibold text-foreground/80 underline-offset-4 hover:underline"
            >
              How it works
            </Link>
          </div>

        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              A movement, live
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every card ticks up as your community weighs in.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { label: "Participants", value: participants, emoji: "👥" },
              { label: "Polls", value: issues.length, emoji: "📊" },
              { label: "Votes cast", value: totalVotes, emoji: "🗳️" },
              { label: "Cities", value: 3, emoji: "🏙️" },
            ].map((s) => (
              <div
                key={s.label}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-2xl transition-transform group-hover:scale-110" aria-hidden>
                  {s.emoji}
                </div>
                <dd className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  <CountUp value={s.value} />
                </dd>
                <dt className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FEATURED */}
      {featured && (
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-5xl px-4 py-10">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <span aria-hidden>⭐</span> Featured this week
            </div>
            <Link
              to="/issue/$id"
              params={{ id: featured.id }}
              className="group grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                    {catEmoji(featured.category)} {featured.category}
                  </span>
                  <span>·</span>
                  <span>{featured.city}</span>
                  {trendingIds.has(featured.id) && (
                    <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                      🔥 Trending
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground sm:text-base">
                  {featured.description}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {(tallies[featured.id]?.total ?? 0)} votes ·{" "}
                  {(commentCounts[featured.id] ?? 0)} comments
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                Weigh in →
              </span>
            </Link>
          </div>
        </section>
      )}

      <main id="issues" className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight">Browse all issues</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by city or topic. Every issue links to a poll and a debate thread.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">City</span>
          {CITIES.map((c) => {
            const count =
              c === "All" ? issues.length : issues.filter((i) => i.city === c).length;
            const active = city === c;
            return (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={[
                  "rounded-full border px-3 py-1 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm",
                ].join(" ")}
              >
                {c} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Topic</span>
            {(["All", ...categories] as string[]).map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    active
                      ? "border-accent bg-accent text-accent-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm",
                  ].join(" ")}
                >
                  {c === "All" ? "All topics" : `${catEmoji(c)} ${c}`}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-border bg-card/60"
              />
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No issues match those filters yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {filtered.map((i) => {
              const t =
                tallies[i.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 };
              const trending = trendingIds.has(i.id);
              const comments = commentCounts[i.id] ?? 0;
              return (
                <li key={i.id}>
                  <Link
                    to="/issue/$id"
                    params={{ id: i.id }}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-foreground">
                        {catEmoji(i.category)} {i.category}
                      </span>
                      <span className="text-muted-foreground">· {i.city}</span>
                      {trending && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                          🔥 Trending
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold leading-snug">
                      {i.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {i.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        🗳️ {t.total} · 💬 {comments}
                      </span>
                      <span className="font-medium text-primary transition group-hover:translate-x-0.5">
                        Weigh in →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}


        <section className="mt-16 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Don't just scroll — decide.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Every vote and comment is packaged and delivered to city
            decision-makers. Even if you can't vote at the ballot box yet, this
            is how your generation shapes the block you live on.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="#issues"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("issues")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Start voting
            </a>
            <Link
              to="/newsletter"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary"
            >
              Get involved
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
