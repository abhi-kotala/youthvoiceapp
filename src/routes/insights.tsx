import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CityStatusBadge } from "@/components/city-status-badge";
import { ResultBars } from "@/components/result-bars";
import { Input } from "@/components/ui/input";
import { getInsights, type InsightQuestion } from "@/lib/insights.functions";
import { CATEGORIES } from "@/lib/categories";
import { cityKey } from "@/lib/cities";

const insightsQuery = () => queryOptions({ queryKey: ["insights"], queryFn: () => getInsights() });

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "National Civic Insights — YouthVoice" },
      { name: "description", content: "Privacy-protected results from YouthVoice civic polls across participating communities, with clear methodology." },
      { property: "og:title", content: "National Civic Insights — YouthVoice" },
      { property: "og:description", content: "Explore real youth civic poll results by state, city and issue — small groups protected." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(insightsQuery()); },
  component: InsightsPage,
});

const PARTICIPATING = new Set(["official", "pilot"]);

function Stat({ label, value, def }: { label: string; value: number; def: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="font-display text-3xl font-extrabold tabular-nums">{value}</div>
      <div className="mt-1 text-sm font-semibold">{label}</div>
      <p className="mt-1 text-xs text-muted-foreground">{def}</p>
    </div>
  );
}

function InsightsPage() {
  const { data } = useSuspenseQuery(insightsQuery());
  const { questions, communities, states } = data;
  const stateName = new Map(states.map((s) => [s.code, s.name]));

  const official = communities.filter((c) => c.status === "official").length;
  const pilot = communities.filter((c) => c.status === "pilot").length;
  const active = questions.filter((q) => q.open).length;
  const done = questions.length - active;
  const responses = questions.reduce((a, q) => a + (q.result.published ? q.result.total : 0), 0);
  const partStates = new Set(communities.filter((c) => PARTICIPATING.has(c.status)).map((c) => c.state_code));
  const cats = new Set(questions.map((q) => q.category));

  // Themes: category asked in 2+ communities.
  const themes = CATEGORIES.map((cat) => {
    const qs = questions.filter((q) => q.category === cat);
    const cs = new Set(qs.map((q) => q.community.id));
    const pub = qs.filter((q) => q.result.published);
    const dates = qs.map((q) => q.created_at).sort();
    return { cat, qs: qs.length, communities: cs.size, published: pub.length, responses: pub.reduce((a, q) => a + (q.result.published ? q.result.total : 0), 0), from: dates[0], to: dates[dates.length - 1] };
  }).filter((t) => t.communities >= 2);

  const [state, setState] = useState("");
  const stateCodes = [...new Set(communities.map((c) => c.state_code))].sort();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs uppercase tracking-[0.22em] text-primary/80">Phase 4 · National</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Civic Insights</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">What young people are being asked about in YouthVoice communities, calculated live from real poll records. Results under each city's minimum are hidden.</p>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Official Partner communities" value={official} def="Formally verified partnerships only." />
          <Stat label="Pilot communities" value={pilot} def="Testing communities — not official partnerships." />
          <Stat label="Active polls" value={active} def="Open questions in public communities." />
          <Stat label="Completed polls" value={done} def="Questions that have closed." />
          <Stat label="Published responses" value={responses} def="Votes on polls that passed the minimum. Responses, not people — one person may vote on many polls." />
          <Stat label="States with participating communities" value={partStates.size} def="States with an Official or Pilot community. Applications don't count." />
          <Stat label="Issue categories" value={cats.size} def="Distinct categories among public questions." />
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">State explorer</h2>
          <select value={state} onChange={(e) => setState(e.target.value)} className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm" aria-label="Choose a state">
            <option value="">Choose a state…</option>
            {stateCodes.map((s) => <option key={s} value={s}>{stateName.get(s) ?? s}</option>)}
          </select>
          {state && <StateView code={state} questions={questions} communities={communities.filter((c) => c.state_code === state)} />}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">Issue categories</h2>
          {questions.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No public questions yet.</p> : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const n = questions.filter((q) => q.category === c).length;
                const max = Math.max(...CATEGORIES.map((x) => questions.filter((q) => q.category === x).length), 1);
                return (
                  <li key={c} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex justify-between"><span>{c}</span><span className="tabular-nums text-muted-foreground">{n} questions</span></div>
                    <div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">Common themes</h2>
          <p className="mt-1 text-xs text-muted-foreground">A theme appears only when two or more communities have asked about the same category. We don't merge percentages across different questions.</p>
          {themes.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Not enough communities yet to show shared themes.</p> : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {themes.map((t) => (
                <li key={t.cat} className="rounded-xl border border-border p-4 text-sm">
                  <div className="font-semibold">{t.cat}</div>
                  <p className="mt-1 text-muted-foreground">{t.qs} questions across {t.communities} communities · {t.published} with published results ({t.responses} responses).</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(t.from!).toLocaleDateString()} – {new Date(t.to!).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Directory questions={questions} stateName={stateName} />

        <section className="mt-12 rounded-2xl border border-border bg-card/40 p-5 text-sm leading-relaxed">
          <h2 className="font-display text-2xl font-bold">How this data works</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>Responses come from people who chose to vote on YouthVoice. They are self-selected and do not represent all young people in a city, state or the country.</li>
            <li>Votes are counted per device without accounts. We can't verify age, residence or that each response is a different person.</li>
            <li>A poll's results stay hidden until it reaches its city's minimum (currently 10). Totals on this page only add up results that are already public. A minimum reduces risk but doesn't guarantee anonymity.</li>
            <li>"Live" results can still change; "Final" results are from closed polls.</li>
            <li>Poll results show opinions, not causes. Questions in different cities are worded differently, so we don't combine their percentages.</li>
            <li>Categories are grouped into a fixed list from each topic's original label.</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function StateView({ code, questions, communities }: { code: string; questions: InsightQuestion[]; communities: { id: string; slug: string; name: string; state_code: string; status: import("@/lib/cities").CityStatus }[] }) {
  const qs = questions.filter((q) => q.community.state_code === code);
  const cats = [...new Set(qs.map((q) => q.category))];
  return (
    <div className="mt-4 grid gap-3">
      {communities.map((c) => {
        const mine = qs.filter((q) => q.community.id === c.id);
        const pub = mine.filter((q) => q.result.published);
        return (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-4 text-sm">
            <div>
              <Link to="/cities/$key" params={{ key: cityKey(c.slug, c.state_code) }} className="font-semibold hover:text-primary">{c.name}</Link>
              <p className="text-xs text-muted-foreground">{mine.filter((q) => q.open).length} active · {pub.length} published results · {pub.reduce((a, q) => a + (q.result.published ? q.result.total : 0), 0)} published responses</p>
            </div>
            <CityStatusBadge status={c.status} />
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Categories: {cats.length ? cats.join(", ") : "none yet"}</p>
    </div>
  );
}

function Directory({ questions, stateName }: { questions: InsightQuestion[]; stateName: Map<string, string> }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [city, setCity] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(12);
  const cities = [...new Map(questions.filter((x) => !st || x.community.state_code === st).map((x) => [x.community.id, x.community])).values()];
  const rows = useMemo(() => questions.filter((x) =>
    (!q || x.title.toLowerCase().includes(q.toLowerCase())) &&
    (!st || x.community.state_code === st) && (!city || x.community.id === city) &&
    (!cat || x.category === cat) && (!status || (status === "open") === x.open)), [questions, q, st, city, cat, status]);
  const sel = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold">Questions & results</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        <Input placeholder="Search questions" value={q} onChange={(e) => setQ(e.target.value)} className="sm:col-span-5" />
        <select className={sel} value={st} onChange={(e) => { setSt(e.target.value); setCity(""); }} aria-label="State"><option value="">All states</option>{[...new Set(questions.map((x) => x.community.state_code))].map((s) => <option key={s} value={s}>{stateName.get(s) ?? s}</option>)}</select>
        <select className={sel} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City"><option value="">All cities</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className={`${sel} sm:col-span-2`} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">Any status</option><option value="open">Active</option><option value="closed">Completed</option></select>
      </div>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No questions match these filters.</p> : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.slice(0, limit).map((x) => (
            <li key={x.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Link to="/cities/$key" params={{ key: cityKey(x.community.slug, x.community.state_code) }} className="hover:text-primary">{x.community.name}, {x.community.state_code}</Link>
                <span>· {x.category}</span>
              </div>
              <Link to="/issue/$id" params={{ id: x.id }} className="mt-1 block font-semibold hover:text-primary">{x.title}</Link>
              <ResultBars result={x.result} open={x.open} title={x.title} city={x.community.name} />
            </li>
          ))}
        </ul>
      )}
      {rows.length > limit && <button onClick={() => setLimit(limit + 12)} className="mt-4 text-sm text-primary underline">Show more</button>}
    </section>
  );
}
