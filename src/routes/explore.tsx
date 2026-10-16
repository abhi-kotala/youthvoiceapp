import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CityStatusBadge } from "@/components/city-status-badge";
import { listCities } from "@/lib/cities.functions";
import { cityKey, STATUS_LABEL, STATUS_HELP, type CityStatus } from "@/lib/cities";

const PAGE = 12;

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Your Community — Youth Voice" },
      { name: "description", content: "Find Youth Voice communities across the U.S. and see each city's real participation status and active polls." },
      { property: "og:title", content: "Explore Your Community — Youth Voice" },
      { property: "og:description", content: "A directory of Youth Voice communities with verified participation status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => listCities(),
  errorComponent: () => (
    <div className="min-h-screen"><SiteHeader /><p className="p-10 text-center text-muted-foreground">We couldn't load communities right now. Please try again shortly.</p></div>
  ),
  pendingComponent: () => (
    <div className="min-h-screen"><SiteHeader /><p className="p-10 text-center text-muted-foreground">Loading communities…</p></div>
  ),
  component: ExplorePage,
});

function ExplorePage() {
  const { cities, states } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [topic, setTopic] = useState("");
  const [shown, setShown] = useState(PAGE);

  const topics = useMemo(() => [...new Set(cities.flatMap((c) => c.categories))].sort(), [cities]);
  const statesWithCities = useMemo(
    () => states.filter((s) => cities.some((c) => c.state_code === s.code)),
    [states, cities],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cities.filter((c) => {
      if (state && c.state_code !== state) return false;
      if (topic && !c.categories.includes(topic)) return false;
      if (!term) return true;
      if (/^\d{3,5}$/.test(term)) return c.zip_codes.some((z) => z.startsWith(term));
      return (
        c.name.toLowerCase().includes(term) ||
        c.state_name.toLowerCase().includes(term) ||
        c.state_code.toLowerCase() === term
      );
    });
  }, [cities, q, state, topic]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Explore Your Community.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Young people can join local civic discussions through Youth Voice. This directory lists only the
          communities in our database — most U.S. cities have not joined, and listing a city here does not mean
          its local government participates.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
          <Input aria-label="Search" placeholder="Search city, state, or ZIP code" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} />
          <select aria-label="State" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={state} onChange={(e) => { setState(e.target.value); setShown(PAGE); }}>
            <option value="">All states</option>
            {statesWithCities.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <select aria-label="Topic" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={topic} onChange={(e) => { setTopic(e.target.value); setShown(PAGE); }}>
            <option value="">All topics</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <details className="mt-4 rounded-lg border border-border bg-card/50 p-3 text-sm">
          <summary className="cursor-pointer font-medium">What do the status labels mean?</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {(Object.keys(STATUS_LABEL) as CityStatus[]).map((s) => (
              <li key={s}><CityStatusBadge status={s} className="mr-2" />{STATUS_HELP[s]}</li>
            ))}
          </ul>
        </details>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-medium">No communities match your search.</p>
            <p className="mt-1 text-sm text-muted-foreground">Youth Voice may not be in your area yet.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, shown).map((c) => (
              <Link key={c.id} to="/cities/$key" params={{ key: cityKey(c.slug, c.state_code) }}
                className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold">{c.name}</h2>
                    <p className="text-sm text-muted-foreground">{c.state_name}</p>
                  </div>
                  <CityStatusBadge status={c.status} />
                </div>
                <p className="mt-4 text-sm">
                  {c.activePolls === 0 ? "No active polls" : `${c.activePolls} active ${c.activePolls === 1 ? "poll" : "polls"}`}
                </p>
              </Link>
            ))}
          </div>
        )}
        {shown < filtered.length && (
          <div className="mt-6 text-center"><Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>Show more</Button></div>
        )}

        <section className="mt-14 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="font-display text-2xl font-bold">Bring Youth Voice to Your City</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Don't see your community? Send a request — every new city is reviewed before it goes live.</p>
          <Button asChild className="mt-4"><Link to="/bring-youth-voice">Bring Youth Voice to Your Community</Link></Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
