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
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<CityFilter>("All");
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false });
      setIssues((rows ?? []) as Issue[]);

      const { data: voteRows } = await supabase
        .from("votes")
        .select("issue_id, choice");
      const t: Record<string, Tally> = {};
      (voteRows ?? []).forEach((v: { issue_id: string; choice: string }) => {
        t[v.issue_id] ??= { agree: 0, disagree: 0, neutral: 0, total: 0 };
        t[v.issue_id][v.choice as keyof Omit<Tally, "total">] += 1;
        t[v.issue_id].total += 1;
      });
      setTallies(t);
      setLoading(false);
    })();
  }, []);

  const totalVotes = Object.values(tallies).reduce((a, t) => a + t.total, 0);
  const categories = Array.from(new Set(issues.map((i) => i.category))).sort();

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
        <div className="absolute inset-0 grid grid-cols-3 opacity-30">
          <img src={fargoImg} alt="" className="h-full w-full object-cover" />
          <img src={westFargoImg} alt="" className="h-full w-full object-cover" />
          <img src={moorheadImg} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/90 to-background" />
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

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 rounded-xl border border-border bg-card/70 p-4 backdrop-blur">
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Issues</dt>
              <dd className="mt-1 text-2xl font-bold">{issues.length}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Votes cast</dt>
              <dd className="mt-1 text-2xl font-bold">{totalVotes}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Cities</dt>
              <dd className="mt-1 text-2xl font-bold">3</dd>
            </div>
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
              className="group grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {featured.category} · {featured.city}
                </div>
                <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground sm:text-base">
                  {featured.description}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {(tallies[featured.id]?.total ?? 0)}{" "}
                  {(tallies[featured.id]?.total ?? 0) === 1 ? "vote" : "votes"} so far
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition group-hover:-translate-y-0.5">
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
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary",
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
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-muted-foreground">Loading issues…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No issues match those filters yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {filtered.map((i) => {
              const t =
                tallies[i.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 };
              return (
                <li key={i.id}>
                  <Link
                    to="/issue/$id"
                    params={{ id: i.id }}
                    className="block h-full rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {i.category} · {i.city}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold leading-snug">
                      {i.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {i.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {t.total} {t.total === 1 ? "vote" : "votes"}
                      </span>
                      <span className="font-medium text-primary">Weigh in →</span>
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
