import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import fargoImg from "@/assets/city-fargo.jpg";
import westFargoImg from "@/assets/city-west-fargo.jpg";
import moorheadImg from "@/assets/city-moorhead.jpg";

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

const CITY_META: Record<
  "Fargo" | "West Fargo" | "Moorhead",
  { img: string; emoji: string; tagline: string }
> = {
  Fargo: { img: fargoImg, emoji: "🎭", tagline: "Downtown, the theatre, and everything in between." },
  "West Fargo": { img: westFargoImg, emoji: "🌳", tagline: "Growing neighborhoods and community spaces." },
  Moorhead: { img: moorheadImg, emoji: "🍂", tagline: "Across the river, campuses and community." },
};

type Tally = { agree: number; disagree: number; neutral: number; total: number };


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Youth Voice — Where under-18s weigh in on city issues" },
      {
        name: "description",
        content:
          "Vote and debate on the political issues happening in our city. Results go straight to the council and mayor.",
      },
      { property: "og:title", content: "Youth Voice — Under-18 city polls" },
      {
        property: "og:description",
        content:
          "Can't vote yet? You can still be heard. Weigh in on the issues shaping our city.",
      },
      { property: "og:url", content: "https://city-voice-forum.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://city-voice-forum.lovable.app/" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tallies, setTallies] = useState<Record<string, Tally>>({});
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<CityFilter>("All");

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid grid-cols-3 opacity-40">
          <img src={fargoImg} alt="" className="h-full w-full object-cover" />
          <img src={westFargoImg} alt="" className="h-full w-full object-cover" />
          <img src={moorheadImg} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent backdrop-blur">
            <span>👋</span> Hey Fargo–Moorhead
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Your city.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Your voice.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Vote on the real issues shaping Fargo, West Fargo, and Moorhead —
            debate them with your neighbors, and we'll hand the results
            straight to the city council and mayor. No accounts. No noise.
            Just your voice.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["Fargo", "West Fargo", "Moorhead"] as const).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCity(c);
                  document.getElementById("issues")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {CITY_META[c].emoji} {c}
              </button>
            ))}
          </div>
        </div>
      </section>


      <main id="issues" className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2">

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

        {loading ? (
          <p className="text-muted-foreground">Loading issues…</p>
        ) : (
          (() => {
            const groups =
              city === "All"
                ? (["Fargo", "West Fargo", "Moorhead"] as const).map((name) => ({
                    name,
                    items: issues.filter((i) => i.city === name),
                  }))
                : [{ name: city, items: issues.filter((i) => i.city === city) }];
            const anyItems = groups.some((g) => g.items.length > 0);
            if (!anyItems) {
              return <p className="text-muted-foreground">No issues yet for {city}.</p>;
            }
            return (
              <div className="space-y-10">
                {groups.map((g) =>
                  g.items.length === 0 ? null : (
                    <section key={g.name}>
                      <div className="relative mb-4 overflow-hidden rounded-xl border border-border">
                        <img
                          src={CITY_META[g.name].img}
                          alt={`${g.name} illustration`}
                          loading="lazy"
                          width={1280}
                          height={640}
                          className="h-32 w-full object-cover sm:h-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-center px-5">
                          <h2 className="text-2xl font-bold tracking-tight">
                            {CITY_META[g.name].emoji} {g.name}
                          </h2>
                          <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            {CITY_META[g.name].tagline} · {g.items.length}{" "}
                            {g.items.length === 1 ? "issue" : "issues"} open
                          </p>
                        </div>
                      </div>
                      <ul className="grid gap-4 sm:grid-cols-2">
                        {g.items.map((i) => {
                          const t =
                            tallies[i.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 };
                          return (
                            <li key={i.id}>
                              <Link
                                to="/issue/$id"
                                params={{ id: i.id }}
                                className="block h-full rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md"
                              >
                                <div className="text-xs font-semibold uppercase tracking-wider text-accent">
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
                    </section>
                  ),
                )}
              </div>
            );
          })()
        )}
      </main>


      <SiteFooter />
    </div>
  );
}
