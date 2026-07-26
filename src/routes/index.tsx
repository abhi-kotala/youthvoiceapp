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
import { Search, SlidersHorizontal } from "lucide-react";
import fargoImg from "@/assets/city-fargo.jpg";
import westFargoImg from "@/assets/city-west-fargo.jpg";
import moorheadImg from "@/assets/city-moorhead.jpg";

const CITIES = ["All", "Fargo", "West Fargo", "Moorhead"] as const;
type CityFilter = (typeof CITIES)[number];

type SortOption = "newest" | "most-voted" | "most-commented";

type Tally = { agree: number; disagree: number; neutral: number; total: number };

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
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
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-foreground backdrop-blur">
            <span aria-hidden>🗳️</span> Built by students · for Fargo–Moorhead
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Too young to vote.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Old enough to be heard.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Youth Voice is a free, anonymous poll for under-18s in Fargo, West Fargo, and Moorhead.
            Weigh in on the decisions your city is making right now — and we deliver the results
            straight to your city council and mayor's office.
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
              to="/about"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { label: "Participants", value: participants, emoji: "👥" },
              { label: "Polls", value: issues.length, emoji: "📊" },
              { label: "Votes cast", value: totalVotes, emoji: "🗳️" },
              { label: "Cities", value: 3, emoji: "🏙️" },
            ].map((s) => (
              <div
                key={s.label}
                className="group rounded-2xl border border-border bg-card p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

      {/* ISSUES */}
      <main id="issues" className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Browse all issues</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter by city or topic, search by keyword, and weigh in.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{filtered.length} issue{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Search + sort */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search issues..."
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

        {/* City filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            City
          </span>
          {CITIES.map((c) => {
            const count = c === "All" ? issues.length : issues.filter((i) => i.city === c).length;
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

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Topic
            </span>
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

        {/* Active filters summary */}
        {(city !== "All" || category !== "All" || search || sort !== "newest") && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Active:</span>
            {city !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                City: {city}
              </span>
            )}
            {category !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                Topic: {category}
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

        {/* Results */}
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

        {/* FINAL CTA */}
        <section className="mt-16 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Don't just scroll — decide.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Every vote and comment is packaged and delivered to city decision-makers. Even if you
            can't vote at the ballot box yet, this is how your generation shapes the block you live
            on.
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
