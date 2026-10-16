import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ISSUE_PUBLIC_COLUMNS } from "@/lib/issue-columns";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CountUp } from "@/components/count-up";
import { IssueCard, catEmoji } from "@/components/issue-card";
import { CityGlobe, type GlobeCity } from "@/components/city-globe";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, Radio, Activity, MessagesSquare, Zap } from "lucide-react";
import { getTrendingYouthIdeas } from "@/lib/topics.functions";

const CITIES = ["All", "Fargo", "West Fargo", "Moorhead"] as const;
type CityFilter = (typeof CITIES)[number];

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Fargo: { lat: 46.8772, lon: -96.7898 },
  "West Fargo": { lat: 46.8747, lon: -96.9003 },
  Moorhead: { lat: 46.8738, lon: -96.7678 },
};


const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  All: "Every open poll and discussion across all topic areas.",
  Education: "Schools, curriculum, student life, and learning opportunities.",
  Transportation: "Streets, bike lanes, buses, roundabouts, and how we get around.",
  Environment: "Parks, climate, recycling, clean air, and green spaces.",
  Economy: "Jobs, business incentives, taxes, and local spending.",
  Healthcare: "Hospitals, clinics, mental health, and public wellness.",
  "Public Safety": "Police, fire, emergency services, and community safety.",
  Community: "Events, recreation, culture, and neighborhood life.",
  Housing: "Affordable housing, development, zoning, and rent.",
  Government: "Elections, transparency, voting rights, and city rules.",
  Ideas: "Fresh proposals and youth-led ideas for the community.",
  General: "Everything else happening around the Fargo–Moorhead area.",
};

type SortOption = "newest" | "most-voted" | "most-commented";
type Tally = { agree: number; disagree: number; neutral: number; total: number };

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
  source?: string | null;
  topic_type?: string | null;
  location_scope?: string | null;
  location_name?: string | null;
  impact_status?: string | null;
};

type TrendingIdea = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  topic_type: string | null;
  location_scope: string | null;
  location_name: string | null;
  voteCount: number;
  commentCount: number;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Youth Voice — The smart-city platform for under-18 civic power" },
      {
        name: "description",
        content:
          "Youth Voice is a next-generation civic platform for under-18s in Fargo, West Fargo, and Moorhead. Explore the live city grid, vote anonymously, debate, and send results to the mayor.",
      },
      { property: "og:title", content: "Youth Voice — Under-18 city polls for Fargo-Moorhead" },
      {
        property: "og:description",
        content:
          "A futuristic civic platform where young people vote, debate, and shape city decisions. Anonymous, free, and delivered straight to city hall.",
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
  component: HomePage,
});

function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tallies, setTallies] = useState<Record<string, Tally>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [cityDevices, setCityDevices] = useState<Record<string, number>>({});
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<CityFilter>("All");
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [trending, setTrending] = useState<TrendingIdea[]>([]);
  const [view, setView] = useState<"categories" | "issues">("categories");

  useEffect(() => {
    (async () => {
      const { getParticipationStats } = await import("@/lib/stats.functions");
      const [issuesRes, votesRes, commentsRes, stats] = await Promise.all([
        supabase.from("issues").select(ISSUE_PUBLIC_COLUMNS).order("created_at", { ascending: false }),
        supabase.from("votes").select("issue_id, choice"),
        supabase.from("comments").select("issue_id").eq("hidden", false),
        getParticipationStats().catch(() => ({ participants: 0, cityDevices: {} })),
      ]);
      const rows = (issuesRes.data ?? []) as Issue[];
      setIssues(rows);

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
      setParticipants(stats.participants);
      setCityDevices(stats.cityDevices);
      setLoading(false);
    })();
    getTrendingYouthIdeas()
      .then((rows) => setTrending(rows as TrendingIdea[]))
      .catch(() => {});
  }, []);

  const totalVotes = Object.values(tallies).reduce((a, t) => a + t.total, 0);
  const totalComments = Object.values(commentCounts).reduce((a, n) => a + n, 0);
  const categories = useMemo(
    () => Array.from(new Set(issues.map((i) => i.category))).sort(),
    [issues],
  );

  const trendingIds = useMemo(
    () =>
      new Set(
        [...issues]
          .filter((i) => (tallies[i.id]?.total ?? 0) > 0)
          .sort((a, b) => (tallies[b.id]?.total ?? 0) - (tallies[a.id]?.total ?? 0))
          .slice(0, 3)
          .map((i) => i.id),
      ),
    [issues, tallies],
  );

  /* ---------- globe data ---------- */
  const liveCityStats = useMemo(() => {
    return (["Fargo", "West Fargo", "Moorhead"] as const).map((name) => {
      const cityIssues = issues.filter((i) => i.city === name);
      const votes = cityIssues.reduce((a, i) => a + (tallies[i.id]?.total ?? 0), 0);
      const comments = cityIssues.reduce((a, i) => a + (commentCounts[i.id] ?? 0), 0);
      return {
        name,
        issues: cityIssues.length,
        votes,
        comments,
        participants: cityDevices[name] ?? 0,
        top: [...cityIssues].sort(
          (a, b) => (tallies[b.id]?.total ?? 0) - (tallies[a.id]?.total ?? 0),
        )[0],
      };
    });
  }, [issues, tallies, commentCounts, cityDevices]);

  const maxVotes = Math.max(1, ...liveCityStats.map((c) => c.votes));

  const globeCities: GlobeCity[] = useMemo(() => {
    return liveCityStats.map((c) => ({
      name: c.name,
      lat: CITY_COORDS[c.name].lat,
      lon: CITY_COORDS[c.name].lon,
      intensity: 0.45 + (c.votes / maxVotes) * 0.55,
      live: true,
    }));
  }, [liveCityStats, maxVotes]);

  const [globeCity, setGlobeCity] = useState<string>("Fargo");
  const handleSelect = useCallback((name: string) => setGlobeCity(name), []);
  const dashboard = liveCityStats.find((c) => c.name === globeCity) ?? null;

  /* ---------- issue list ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = issues.filter(
      (i) =>
        (city === "All" || i.city === city) &&
        (category === "All" || i.category === category) &&
        (q === "" ||
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)),
    );

    switch (sort) {
      case "most-voted":
        list = list.sort((a, b) => (tallies[b.id]?.total ?? 0) - (tallies[a.id]?.total ?? 0));
        break;
      case "most-commented":
        list = list.sort((a, b) => (commentCounts[b.id] ?? 0) - (commentCounts[a.id] ?? 0));
        break;
      default:
        list = list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return list;
  }, [issues, city, category, search, sort, tallies, commentCounts]);

  const scrollToGrid = () => {
    document.getElementById("issues")?.scrollIntoView({ behavior: "smooth" });
  };

  const openCity = (name: string) => {
    setCity(name as CityFilter);
    setCategory("All");
    setView("issues");
    setTimeout(() => document.getElementById("issues")?.scrollIntoView({ behavior: "smooth" }), 40);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* ================= HERO + GLOBE ================= */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 grid-bg" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-52 right-0 h-[420px] w-[520px] rounded-full bg-accent/15 blur-[130px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Radio className="h-3.5 w-3.5" />
              Live civic grid
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              You're too young to vote.
              <br />
              <span className="neon-text">Not too young to be heard.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              A next-generation civic platform built by a high schooler in West Fargo. Explore the
              live city grid, take a 30-second poll, debate it out, and watch what your generation
              says get delivered straight to city hall. No account. No name. No email.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={scrollToGrid}
                className="group relative overflow-hidden rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-ring transition hover:-translate-y-0.5"
              >
                <span className="relative z-10">Enter the grid</span>
                <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/30 blur-md [animation:yv-sweep_2.6s_linear_infinite]" />
              </button>
              <Link
                to="/submit"
                className="rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/70 hover:text-primary"
              >
                Launch your own topic
              </Link>
            </div>

            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3">
              {[
                { label: "Voices", value: participants, icon: Activity },
                { label: "Votes cast", value: totalVotes, icon: Zap },
                { label: "Debate posts", value: totalComments, icon: MessagesSquare },
              ].map((s) => (
                <div key={s.label} className="glass rounded-2xl px-4 py-3">
                  <s.icon className="h-4 w-4 text-primary" />
                  <dd className="mt-2 font-display text-2xl font-extrabold">
                    <CountUp value={s.value} />
                  </dd>
                  <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          {/* GLOBE */}
          <div className="relative">
            <div className="glass relative overflow-hidden rounded-[2rem] p-4">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  YouthVoice network
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary animate-orb" />
                  {liveCityStats.length} cities live
                </span>
              </div>
              <CityGlobe
                cities={globeCities}
                selected={globeCity}
                onSelect={handleSelect}
                className="aspect-square w-full animate-float"
              />
              <p className="px-2 pb-1 text-center text-xs text-muted-foreground">
                Drag to spin · tap a glowing city to open its dashboard
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CITY DASHBOARD ================= */}
      <section className="relative border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                City dashboard
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time youth signal for each city on the network.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {liveCityStats.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setGlobeCity(c.name)}
                  className={[
                    "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                    globeCity === c.name
                      ? "border-primary/60 bg-primary/15 text-primary glow-ring"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  ].join(" ")}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {dashboard && (
            <div key={dashboard.name} className="mt-6 grid animate-rise gap-4 lg:grid-cols-3">
              <div className="glass glass-hover rounded-3xl p-6 lg:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Selected city
                </p>
                <h3 className="mt-1 font-display text-3xl font-extrabold">{dashboard.name}</h3>
                <div className="mt-6 space-y-4">
                  {[
                    { label: "Young people engaged", value: dashboard.participants },
                    { label: "Votes cast", value: dashboard.votes },
                    { label: "Debate posts", value: dashboard.comments },
                    { label: "Open topics", value: dashboard.issues },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <span className="font-display text-lg font-bold text-foreground">
                          {row.value}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          style={{
                            width: `${Math.min(100, (row.value / Math.max(1, maxVotes)) * 100 + 8)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openCity(dashboard.name)}
                  className="mt-6 w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 glow-ring"
                >
                  Open {dashboard.name} topics
                </button>
              </div>

              <div className="glass rounded-3xl p-6 lg:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Trending in {dashboard.name}
                </p>
                <div className="mt-4 space-y-3">
                  {issues
                    .filter((i) => i.city === dashboard.name)
                    .sort((a, b) => (tallies[b.id]?.total ?? 0) - (tallies[a.id]?.total ?? 0))
                    .slice(0, 4)
                    .map((i) => {
                      const t = tallies[i.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 };
                      const pct = (n: number) => (t.total ? Math.round((n / t.total) * 100) : 0);
                      return (
                        <Link
                          key={i.id}
                          to="/issue/$id"
                          params={{ id: i.id }}
                          className="block rounded-2xl border border-border/70 bg-background/40 p-4 transition hover:border-primary/50 hover:bg-background/70"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-2 text-sm font-semibold">
                              <span className="mr-1.5">{catEmoji(i.category)}</span>
                              {i.title}
                            </p>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              {t.total} votes
                            </span>
                          </div>
                          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-secondary">
                            <div className="bg-chart-1" style={{ width: `${pct(t.agree)}%` }} />
                            <div className="bg-chart-2" style={{ width: `${pct(t.disagree)}%` }} />
                            <div className="bg-chart-3" style={{ width: `${pct(t.neutral)}%` }} />
                          </div>
                          <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
                            <span>{pct(t.agree)}% agree</span>
                            <span>{pct(t.disagree)}% disagree</span>
                            <span>{commentCounts[i.id] ?? 0} in the debate</span>
                          </div>
                        </Link>
                      );
                    })}
                  {issues.filter((i) => i.city === dashboard.name).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No topics here yet — be the first to launch one.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= TRENDING YOUTH IDEAS ================= */}
      {trending.length > 0 && (
        <section className="relative mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Launched by students
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Topics posted by young people in the network — vote, argue, help decide.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trending.slice(0, 3).map((idea) => (
              <IssueCard
                key={idea.id}
                issue={idea as unknown as Issue}
                tally={{
                  agree: 0,
                  disagree: 0,
                  neutral: 0,
                  total: idea.voteCount,
                }}
                commentCount={idea.commentCount}
                className="glass glass-hover border-none"
              />
            ))}
          </div>
        </section>
      )}

      {/* ================= CATEGORIES / ISSUES ================= */}
      <section id="issues" className="relative mx-auto max-w-6xl px-4 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              {view === "categories" ? "What do you care about?" : "Open topics"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {view === "categories"
                ? "Pick a channel to see the live topics inside it."
                : "Vote in 30 seconds, then join the debate."}
            </p>
          </div>
          {loading && (
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              syncing grid…
            </span>
          )}
        </div>

        {view === "categories" ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["All", ...categories] as string[]).map((c) => {
              const count =
                c === "All" ? issues.length : issues.filter((i) => i.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setView("issues");
                  }}
                  className="glass glass-hover group flex flex-col items-start rounded-3xl p-6 text-left"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl ring-1 ring-primary/20 transition group-hover:scale-110">
                    {c === "All" ? "🛰️" : catEmoji(c)}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">
                    {c === "All" ? "Browse everything" : c}
                  </h3>
                  <p className="mt-1 flex-grow text-sm text-muted-foreground">
                    {CATEGORY_DESCRIPTIONS[c] ?? `Issues and polls about ${c.toLowerCase()}.`}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {count} topic{count !== 1 ? "s" : ""}
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => {
                  setView("categories");
                  setCategory("All");
                  setCity("All");
                  setSearch("");
                  setSort("newest");
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                ← Back to channels
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {CITIES.map((c) => {
                  const count =
                    c === "All"
                      ? issues.filter((i) => category === "All" || i.category === category).length
                      : issues.filter(
                          (i) => i.city === c && (category === "All" || i.category === category),
                        ).length;
                  const active = city === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className={[
                        "rounded-full border px-3 py-1 text-sm font-medium transition",
                        active
                          ? "border-primary/60 bg-primary/15 text-primary glow-ring"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      ].join(" ")}
                    >
                      {c} <span className="ml-1 opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={`Search ${category === "All" ? "all topics" : category.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-full pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                  <SelectTrigger className="w-[160px] rounded-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="most-voted">Most voted</SelectItem>
                    <SelectItem value="most-commented">Most commented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  tally={tallies[issue.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 }}
                  commentCount={commentCounts[issue.id] ?? 0}
                  trending={trendingIds.has(issue.id)}
                  className="glass glass-hover border-none"
                />
              ))}
            </div>

            {!loading && filtered.length === 0 && (
              <div className="glass mt-6 rounded-3xl p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Nothing here yet. Try another channel or{" "}
                  <Link to="/submit" className="font-semibold text-primary underline-offset-4 hover:underline">
                    launch your own topic
                  </Link>
                  .
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
