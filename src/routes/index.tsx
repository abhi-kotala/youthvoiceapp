import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CountUp } from "@/components/count-up";
import { IssueCard, catEmoji } from "@/components/issue-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import fargoImg from "@/assets/city-fargo.jpg";
import westFargoImg from "@/assets/city-west-fargo.jpg";
import moorheadImg from "@/assets/city-moorhead.jpg";
import { getTrendingYouthIdeas } from "@/lib/topics.functions";

const CITIES = ["All", "Fargo", "West Fargo", "Moorhead"] as const;
type CityFilter = (typeof CITIES)[number];

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
    links: [{ rel: "canonical", href: "https://youthvoiceapp.lovable.app/" }],
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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [trending, setTrending] = useState<TrendingIdea[]>([]);
  const [view, setView] = useState<"categories" | "issues">("categories");

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
    getTrendingYouthIdeas().then((rows) => setTrending(rows as TrendingIdea[])).catch(() => {});
  }, []);

  const totalVotes = Object.values(tallies).reduce((a, t) => a + t.total, 0);
  const categories = useMemo(
    () => Array.from(new Set(issues.map((i) => i.category))).sort(),
    [issues],
  );

  const trendingIds = useMemo(() => {
    return new Set(
      [...issues]
        .filter((i) => (tallies[i.id]?.total ?? 0) > 0)
        .sort((a, b) => (tallies[b.id]?.total ?? 0) - (tallies[a.id]?.total ?? 0))
        .slice(0, 3)
        .map((i) => i.id),
    );
  }, [issues, tallies]);

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
      case "newest":
      default:
        list = list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return list;
  }, [issues, city, category, search, sort, tallies, commentCounts]);

  const clearFilters = () => {
    setCity("All");
    setCategory("All");
    setSearch("");
    setSort("newest");
    setView("categories");
  };

  const scrollToCategories = () => {
    document.getElementById("issues")?.scrollIntoView({ behavior: "smooth" });
  };

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
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <p className="text-sm font-medium text-muted-foreground">
            Fargo · West Fargo · Moorhead
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            You're too young to vote.
            <br />
            You're not too young to be heard.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            I'm Abhi, a high schooler in West Fargo. I built this because people our age
            live with what the city decides and almost never get asked about it. No account,
            no name, no email — just say where you stand. It takes about half a minute, and
            what we say gets carried to the council and the mayor's office.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={scrollToCategories}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Start with what you care about
            </button>
            <Link
              to="/about"
              className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-accent decoration-2 hover:text-accent"
            >
              Read why I made this
            </Link>
          </div>


        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-base leading-relaxed sm:text-lg">
            So far{" "}
            <span className="font-bold text-accent">
              <CountUp value={participants} />
            </span>{" "}
            people have shown up here, cast{" "}
            <span className="font-bold text-accent">
              <CountUp value={totalVotes} />
            </span>{" "}
            votes across{" "}
            <span className="font-bold text-accent">
              <CountUp value={issues.length} />
            </span>{" "}
            open topics in three cities. Every one of those is a real person under 18.
          </p>
        </div>
      </section>


      {/* MADE FOR STUDENTS */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_1.1fr] md:py-16">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              A few honest answers
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The questions people ask me in the hallway, answered the way I'd
              actually answer them.
            </p>
            <div className="mt-6 border-l-2 border-accent pl-4">
              <p className="text-sm italic leading-relaxed">
                "Half the people I talked to assumed nobody at city hall would ever
                read this. They do. That's the whole point."
              </p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                — Abhi Kotala, founder
              </p>
            </div>
          </div>

          <dl className="divide-y divide-border">
            {[
              {
                q: "Will anyone know it was me?",
                a: "No. There's no sign-up, no name, no email. Nobody at your school can see what you voted.",
              },
              {
                q: "How long does it actually take?",
                a: "About thirty seconds. Read the topic, tap agree, disagree, or neutral. Leave a comment if you feel like it.",
              },
              {
                q: "Do I get anything out of it?",
                a: "You collect Impact Points as you vote and debate. Students have used them on résumés, scholarship apps, and college essays.",
              },
              {
                q: "What if the city document makes no sense?",
                a: "Paste it into the Explain page and it gets rewritten in normal English, with who it affects and what the trade-offs are.",
              },
            ].map((f) => (
              <div key={f.q} className="py-4 first:pt-0">
                <dt className="text-base font-bold tracking-tight">{f.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 md:pb-16">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 text-sm">
            <span className="font-semibold text-muted-foreground">
              Also here:
            </span>
            <Link
              to="/explain"
              className="font-semibold underline underline-offset-4 decoration-accent decoration-2 hover:text-accent"
            >
              Explain a city document
            </Link>
            <Link
              to="/my-impact"
              className="font-semibold underline underline-offset-4 decoration-accent decoration-2 hover:text-accent"
            >
              See my Impact
            </Link>
            <Link
              to="/about"
              className="font-semibold underline underline-offset-4 decoration-accent decoration-2 hover:text-accent"
            >
              Start it at my school
            </Link>
          </div>
        </div>
      </section>



      {/* TRENDING YOUTH IDEAS */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Trending Youth Ideas
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Started by young people, growing right now
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Topics submitted by the community — vote, debate, and help decide what matters.
              </p>
            </div>
            <Link
              to="/submit"
              className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              + Submit your topic
            </Link>
          </div>

          {trending.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-lg font-semibold">Be the first to start a youth-led topic</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Propose something your community should be talking about. Earn +15 Impact Points.
              </p>
              <Link
                to="/submit"
                className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Submit a topic →
              </Link>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((i) => (
                <li key={i.id}>
                  <IssueCard
                    issue={{
                      id: i.id,
                      title: i.title,
                      description: i.description,
                      category: i.category,
                      city: i.city,
                      source: "user",
                      topic_type: i.topic_type,
                      location_scope: i.location_scope,
                      location_name: i.location_name,
                    }}
                    tally={{ agree: 0, disagree: 0, neutral: 0, total: i.voteCount }}
                    commentCount={i.commentCount}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* THREE CITIES */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Three cities, one voice</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Built for every young person in the Fargo–Moorhead area.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: "Fargo", img: fargoImg, alt: "Downtown Fargo skyline" },
              { name: "West Fargo", img: westFargoImg, alt: "West Fargo neighborhood" },
              { name: "Moorhead", img: moorheadImg, alt: "Moorhead city view" },
            ].map((city) => (
              <div
                key={city.name}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <img
                  src={city.img}
                  alt={city.alt}
                  className="h-40 w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-lg font-bold text-white drop-shadow-sm">{city.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BROWSE BY CATEGORY */}
      <main id="issues" className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">What do you care about?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a topic area to see the issues and polls inside it.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{issues.length} issue{issues.length !== 1 ? "s" : ""} across {categories.length} topic{categories.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {view === "categories" ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["All", ...categories] as string[]).map((c) => {
              const count = c === "All" ? issues.length : issues.filter((i) => i.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setView("issues");
                  }}
                  className="group flex flex-col items-start rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl transition group-hover:scale-110 group-hover:bg-primary/20">
                    {c === "All" ? "🗂️" : catEmoji(c)}
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{c === "All" ? "Browse all issues" : c}</h3>
                  <p className="mt-1 flex-grow text-sm text-muted-foreground">
                    {CATEGORY_DESCRIPTIONS[c] ?? `Issues and polls about ${c.toLowerCase()}.`}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                    {count} issue{count !== 1 ? "s" : ""}
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
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                ← Back to categories
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  City
                </span>
                {CITIES.map((c) => {
                  const count =
                    c === "All"
                      ? issues.filter((i) => category === "All" || i.category === category).length
                      : issues.filter((i) => i.city === c && (category === "All" || i.category === category)).length;
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

            {(city !== "All" || category !== "All" || search || sort !== "newest") && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Active:</span>
                {category !== "All" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    Topic: {category}
                  </span>
                )}
                {city !== "All" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    City: {city}
                  </span>
                )}
                {search && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                    Search: “{search}”
                  </span>
                )}
                {sort !== "newest" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                    Sort: {sort.replace("-", " ")}
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {loading ? (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li
                    key={i}
                    className="h-48 animate-pulse rounded-2xl border border-border bg-card/60"
                  />
                ))}
              </ul>
            ) : filtered.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                <p className="text-lg font-semibold text-foreground">No issues found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try clearing your filters or searching with different keywords.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {filtered.map((i) => (
                  <li key={i.id}>
                    <IssueCard
                      issue={i}
                      tally={tallies[i.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 }}
                      commentCount={commentCounts[i.id] ?? 0}
                      trending={trendingIds.has(i.id)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <section className="mt-16 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Adults are deciding. Students should be too.
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                Vote once, and you're already part of the report that lands on the mayor's desk. Bring
                two friends and your school shows up in the numbers.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={scrollToCategories}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Start voting
                </button>
                <Link
                  to="/submit"
                  className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary"
                >
                  Start your own topic
                </Link>

              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
