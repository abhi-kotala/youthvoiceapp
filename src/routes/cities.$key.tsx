import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CityStatusBadge } from "@/components/city-status-badge";
import { getCityPage, getMyVotedIssues, canManageCity, updateCityInfo, managerListTopics, managerCreateTopic, managerCloseTopic } from "@/lib/cities.functions";
import { Input } from "@/components/ui/input";
import { STATUS_HELP, SELECTED_CITY_KEY } from "@/lib/cities";
import { getDeviceId } from "@/lib/device-id";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getInsights } from "@/lib/insights.functions";
import { ResultBars } from "@/components/result-bars";
import { listImpactStories, managerPartnerData, managerAddImpact, ONBOARDING_STEPS } from "@/lib/partners.functions";

function CityImpact({ id }: { id: string }) {
  const { data } = useQuery({ queryKey: ["impact-stories", id], queryFn: () => listImpactStories({ data: { communityId: id } }) });
  if (!data?.stories.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">Documented outcomes</h2>
      <p className="mt-1 text-xs text-muted-foreground">Reviewed by the Youth Voice founder before publishing.</p>
      <ul className="mt-3 grid gap-2">{data.stories.map((s) => <li key={s.id} className="rounded-xl border border-border p-3 text-sm"><div className="text-xs text-muted-foreground">{s.occurred_on}</div><p>{s.description}</p>{s.evidence_url && <a href={s.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Source</a>}</li>)}</ul>
    </section>
  );
}

function ManagerPartner({ id }: { id: string }) {
  const [d, setD] = useState<Awaited<ReturnType<typeof managerPartnerData>> | null>(null);
  const [f, setF] = useState({ occurredOn: new Date().toISOString().slice(0, 10), description: "", evidenceUrl: "", status: "proposed" });
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => managerPartnerData({ data: { communityId: id } }).then(setD).catch(() => {});
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function add() {
    setMsg(null);
    try { await managerAddImpact({ data: { communityId: id, ...f } }); setF({ ...f, description: "", evidenceUrl: "" }); setMsg("Saved. The founder reviews outcomes before anything is public."); load(); }
    catch (e) { setMsg((e as Error).message); }
  }
  const done = new Set((d?.steps ?? []).map((s) => s.step_no));
  return (
    <section className="mt-8 rounded-2xl border border-primary/30 p-5">
      <h2 className="font-display text-xl font-bold">Partnership (managers only)</h2>
      <p className="mt-1 text-xs text-muted-foreground">Onboarding steps are recorded by the Youth Voice founder. <Link to="/partners/toolkit" className="text-primary underline">Partner toolkit</Link></p>
      <ol className="mt-2 grid gap-1 text-xs sm:grid-cols-2">{ONBOARDING_STEPS.map((l, i) => <li key={i}>{done.has(i + 1) ? "✓" : "○"} {l}</li>)}</ol>
      <h3 className="mt-5 font-semibold">Record an outcome</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Input type="date" value={f.occurredOn} onChange={(e) => setF({ ...f, occurredOn: e.target.value })} />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="proposed">Proposed</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>
        <Textarea className="sm:col-span-2" rows={3} placeholder="What happened? e.g. 'Poll results were discussed at the youth advisory meeting.' Avoid names and private messages." value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Input className="sm:col-span-2" placeholder="Evidence link (https://…, optional)" value={f.evidenceUrl} onChange={(e) => setF({ ...f, evidenceUrl: e.target.value })} />
      </div>
      <Button size="sm" className="mt-2" onClick={add}>Save outcome</Button>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
      {!!d?.impact.length && <ul className="mt-3 grid gap-1 text-xs">{d.impact.map((r) => <li key={r.id}>{r.occurred_on} · {r.status} · {r.public ? "public" : r.reviewed ? "reviewed" : "awaiting review"} — {r.description.slice(0, 90)}</li>)}</ul>}
    </section>
  );
}

function CityInsights({ cityId, cityName }: { cityId: string; cityName: string }) {
  const { data } = useQuery({ queryKey: ["insights"], queryFn: () => getInsights() });
  const qs = (data?.questions ?? []).filter((q) => q.community.id === cityId);
  const pub = qs.filter((q) => q.result.published);
  const cats = [...new Set(qs.map((q) => q.category))].map((c) => [c, qs.filter((q) => q.category === c).length] as const);
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">Insights</h2>
      {!data ? <p className="mt-3 text-sm text-muted-foreground">Loading…</p> : pub.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No published results yet. Topics are posted by approved city managers or suggested by students and reviewed; results appear once a poll reaches the minimum number of votes.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{pub.length} of {qs.length} polls have published results. Categories: {cats.map(([c, n]) => `${c} (${n})`).join(", ")}.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {pub.slice(0, 6).map((q) => (
              <li key={q.id} className="rounded-xl border border-border p-4">
                <Link to="/issue/$id" params={{ id: q.id }} className="font-semibold hover:text-primary">{q.title}</Link>
                <ResultBars result={q.result} open={q.open} title={q.title} city={cityName} />
              </li>
            ))}
          </ul>
        </>
      )}
      <Link to="/insights" className="mt-3 inline-block text-sm text-primary underline">See national insights</Link>
    </section>
  );
}

export const Route = createFileRoute("/cities/$key")({
  loader: async ({ params }) => {
    const res = await getCityPage({ data: { key: params.key } }).catch(() => ({ city: null }));
    if (!res.city) throw notFound();
    return res as Required<typeof res> & { city: NonNullable<typeof res.city> };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.city;
    if (!c) return { meta: [{ title: "Community not found — Youth Voice" }, { name: "robots", content: "noindex" }] };
    const title = `${c.name}, ${c.state_code} — Youth Voice`;
    const desc = `Youth civic polls and discussions for ${c.name}, ${c.state_name}. Status: see page for verified participation.`;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen"><SiteHeader />
      <div className="p-10 text-center"><p className="font-medium">This community isn't on Youth Voice.</p>
        <Link to="/cities" className="mt-3 inline-block text-primary underline">Choose another city</Link></div>
    </div>
  ),
  errorComponent: () => <div className="min-h-screen"><SiteHeader /><p className="p-10 text-center text-muted-foreground">Couldn't load this community.</p></div>,
  component: CityPage,
});

function CityPage() {
  const { city, active, closed, minVotes } = Route.useLoaderData();
  const { key } = Route.useParams();
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    localStorage.setItem(SELECTED_CITY_KEY, key);
    const ids = active.map((a) => a.id);
    if (ids.length) getMyVotedIssues({ data: { deviceId: getDeviceId(), issueIds: ids } }).then((r) => setVoted(new Set(r))).catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) canManageCity({ data: { communityId: city.id } }).then((r) => setCanManage(r.canManage)).catch(() => {});
    });
  }, [key, city.id, active]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link to="/cities" className="text-sm text-primary underline">Change city</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl font-extrabold">{city.name}, {city.state_code}</h1>
          <CityStatusBadge status={city.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{STATUS_HELP[city.status]}</p>
        {city.description && <p className="mt-4 max-w-2xl">{city.description}</p>}

        <section className="mt-6 rounded-xl border border-border bg-card/60 p-5 text-sm">
          <h2 className="font-semibold">How Youth Voice works here</h2>
          <p className="mt-2 text-muted-foreground">
            Students vote anonymously on local topics and debate respectfully in each thread.
            {city.status === "official"
              ? " Results are shared with local officials through a verified partnership."
              : " There is no official partnership with local government here, so results are not an official city process."}
            {` Results show once a poll has at least ${minVotes} votes, to protect small groups.`}
          </p>
        </section>

        <h2 className="mt-10 font-display text-2xl font-bold">Active civic polls</h2>
        {active.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
            There are no active civic polls in this community right now. Check back soon.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {active.map((i) => (
              <li key={i.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{i.category}</span>
                  {i.closes_at && <span>· Closes {new Date(i.closes_at).toLocaleDateString()}</span>}
                  {voted.has(i.id) && <span className="rounded-full bg-primary/15 px-2 text-primary">You voted</span>}
                </div>
                <Link to="/issue/$id" params={{ id: i.id }} className="mt-1 block font-semibold hover:text-primary">{i.title}</Link>
                <ResultLine r={i.result} />
              </li>
            ))}
          </ul>
        )}

        <h2 className="mt-10 font-display text-2xl font-bold">Closed poll results</h2>
        {closed.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No closed polls yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {closed.map((i) => (
              <li key={i.id} className="rounded-xl border border-border p-4">
                <Link to="/issue/$id" params={{ id: i.id }} className="font-semibold hover:text-primary">{i.title}</Link>
                <ResultLine r={i.result} />
              </li>
            ))}
          </ul>
        )}

        <CityInsights cityId={city.id} cityName={city.name} />

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Local information</h2>
          <p className="mt-1 text-xs text-muted-foreground">General community links. Listing a link does not mean that organization endorses or partners with Youth Voice.</p>
          {city.resources.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No links added yet.</p>
          ) : (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {city.resources.map((r) => (
                <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{r.label}</a></li>
              ))}
            </ul>
          )}
        </section>

        {canManage && <ManagerEditor id={city.id} description={city.description ?? ""} resources={city.resources} />}
        {canManage && <ManagerTopics id={city.id} />}
        {canManage && <ManagerPartner id={city.id} />}
        <CityImpact id={city.id} />
      </main>
      <SiteFooter />
    </div>
  );
}

type Result = { suppressed: true; total: number } | { suppressed: false; total: number; pct: { agree: number; disagree: number; neutral: number } };
function ResultLine({ r }: { r: Result }) {
  if (r.suppressed) return <p className="mt-2 text-xs text-muted-foreground">Results hidden until enough people vote.</p>;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {r.total} votes · Agree {r.pct.agree}% · Disagree {r.pct.disagree}% · Neutral {r.pct.neutral}%
    </p>
  );
}

function ManagerEditor({ id, description, resources }: { id: string; description: string; resources: { label: string; url: string }[] }) {
  const router = useRouter();
  const [desc, setDesc] = useState(description);
  const [links, setLinks] = useState(resources.map((r) => `${r.label} | ${r.url}`).join("\n"));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const parsed = links.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        const [label, url] = l.split("|").map((s) => s.trim());
        return { label: label ?? "", url: url ?? "" };
      });
      await updateCityInfo({ data: { communityId: id, description: desc, resources: parsed } });
      toast.success("Saved");
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally { setBusy(false); }
  }
  return (
    <section className="mt-10 rounded-xl border border-primary/40 p-5">
      <h2 className="font-semibold">Manage this city (admins only)</h2>
      <label className="mt-3 block text-sm">Description</label>
      <Textarea value={desc} maxLength={600} onChange={(e) => setDesc(e.target.value)} />
      <label className="mt-3 block text-sm">Links — one per line: Label | https://…</label>
      <Textarea rows={4} value={links} onChange={(e) => setLinks(e.target.value)} />
      <Button className="mt-3" disabled={busy} onClick={save}>Save</Button>
    </section>
  );
}

function ManagerTopics({ id }: { id: string }) {
  const [topics, setTopics] = useState<{ id: string; title: string; status: string }[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const reload = () => managerListTopics({ data: { communityId: id } }).then((r) => setTopics(r.topics)).catch(() => {});
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await managerCreateTopic({ data: { communityId: id, title, description: desc, category: "Community" } });
      setTitle("");
      setDesc("");
      toast.success("Topic published");
      reload();
      router.invalidate();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 rounded-xl border border-primary/30 bg-card/50 p-4">
      <h2 className="font-display text-lg font-bold">Manage this city's topics</h2>
      <p className="mt-1 text-xs text-muted-foreground">Only city managers see this. Vote totals can't be edited.</p>
      <form onSubmit={add} className="mt-3 space-y-2">
        <Input placeholder="Topic question" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required />
        <Textarea rows={3} placeholder="Background (both sides, neutral)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1200} required />
        <Button size="sm" type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish topic"}</Button>
      </form>
      <ul className="mt-4 space-y-2 text-sm">
        {topics.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
            <span>{t.title} <span className="text-muted-foreground">· {t.status}</span></span>
            {t.status === "open" && (
              <Button size="sm" variant="outline" onClick={async () => { if (window.confirm("Close this topic?")) { await managerCloseTopic({ data: { id: t.id } }).catch((e) => toast.error(e.message)); reload(); } }}>Close</Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
