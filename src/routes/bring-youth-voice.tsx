import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CityStatusBadge } from "@/components/city-status-badge";
import { STATE_CODES } from "@/lib/community-requests.functions";
import { submitInterest, listPublicInterest } from "@/lib/interest.functions";
import { listCities } from "@/lib/cities.functions";
import { COMMUNITY_TYPES } from "@/lib/interest";
import { cityKey } from "@/lib/cities";
import { getDeviceId } from "@/lib/device-id";

const interestQ = () => queryOptions({ queryKey: ["public-interest"], queryFn: () => listPublicInterest() });
const citiesQ = () => queryOptions({ queryKey: ["cities-directory"], queryFn: () => listCities() });

export const Route = createFileRoute("/bring-youth-voice")({
  head: () => ({
    meta: [
      { title: "Bring Youth Voice to Your Community" },
      { name: "description", content: "Request Youth Voice for your city, school, or organization so young people have a stronger voice in local decisions." },
      { property: "og:title", content: "Bring Youth Voice to Your Community" },
      { property: "og:description", content: "Want young people in your community to have a stronger voice? Request Youth Voice for your city, school, or organization." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(interestQ()); context.queryClient.ensureQueryData(citiesQ()); },
  component: Page,
});

const empty = { cityName: "", stateCode: "", communityType: "", reason: "", wantsToHelp: "", organization: "", contactEmail: "", acknowledged: false, website: "" };

function Page() {
  const send = useServerFn(submitInterest);
  const qc = useQueryClient();
  const { data: interest } = useSuspenseQuery(interestQ());
  const { data: cities } = useSuspenseQuery(citiesQ());
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<null | "new" | "joined" | "already">(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const sel = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null);
    if (!f.wantsToHelp) return setErr("Tell us whether you'd like to help.");
    setBusy(true);
    try {
      const r = await send({ data: { ...f, wantsToHelp: f.wantsToHelp === "yes", deviceId: getDeviceId() } });
      setDone(r.result); qc.invalidateQueries({ queryKey: ["public-interest"] });
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }

  const pilots = cities.cities.filter((c) => c.status === "pilot");
  const official = cities.cities.filter((c) => c.status === "official");
  const requested = interest.communities.filter((c) => c.stage === "requested");
  const reviewing = interest.communities.filter((c) => c.stage === "reviewing");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Bring Youth Voice to Your <span className="neon-text">Community</span></h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Want young people in your community to have a stronger voice in local decisions? Request Youth Voice for your city, school, or organization.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            {done ? (
              <div role="status" className="text-sm">
                <h2 className="font-display text-xl font-bold">Thanks, your request was received!</h2>
                <p className="mt-2 text-muted-foreground">
                  {done === "joined" && "Others have already asked for this community, so your interest was added to theirs. "}
                  {done === "already" && "Your interest in this community was already counted, so we didn't count it twice. "}
                  A request isn't an official partnership. The founder reviews every request by hand.
                </p>
                <Button className="mt-4" variant="outline" onClick={() => { setF(empty); setDone(null); }}>Request another community</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-4" noValidate>
                <div><Label htmlFor="c">Community or city name</Label><Input id="c" value={f.cityName} onChange={set("cityName")} maxLength={80} required aria-required /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="s">State</Label><select id="s" className={sel} value={f.stateCode} onChange={set("stateCode")} required><option value="">Choose…</option>{STATE_CODES.map((s) => <option key={s}>{s}</option>)}</select></div>
                  <div><Label htmlFor="t">Community type</Label><select id="t" className={sel} value={f.communityType} onChange={set("communityType")} required><option value="">Choose…</option>{Object.entries(COMMUNITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                </div>
                <div><Label htmlFor="r">Why should Youth Voice come to this community? (optional)</Label><Textarea id="r" rows={3} maxLength={500} value={f.reason} onChange={set("reason")} /></div>
                <fieldset>
                  <legend className="text-sm font-medium">Are you interested in helping bring Youth Voice to your community?</legend>
                  <div className="mt-2 flex gap-4 text-sm">
                    {["yes", "no"].map((v) => <label key={v} className="flex items-center gap-2"><input type="radio" name="help" value={v} checked={f.wantsToHelp === v} onChange={set("wantsToHelp")} />{v === "yes" ? "Yes" : "No"}</label>)}
                  </div>
                </fieldset>
                <div><Label htmlFor="o">Organization name (optional)</Label><Input id="o" value={f.organization} onChange={set("organization")} maxLength={120} /></div>
                <div><Label htmlFor="e">Contact email for follow-up (optional)</Label><Input id="e" type="email" value={f.contactEmail} onChange={set("contactEmail")} maxLength={200} />
                  <p className="mt-1 text-xs text-muted-foreground">If you're under 18, you can leave this blank. We only use it to reply, never show it publicly, and never share it.</p></div>
                <input type="text" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} className="hidden" aria-hidden />
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.acknowledged} onChange={(e) => setF({ ...f, acknowledged: e.target.checked })} required />I understand that submitting a request does not establish an official partnership.</label>
                {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
                <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
                <p className="text-xs text-muted-foreground">Representing a city, school or organization? <Link to="/request-city" className="text-primary underline">Apply for a partnership</Link> instead.</p>
              </form>
            )}
          </section>

          <section aria-labelledby="where">
            <h2 id="where" className="font-display text-2xl font-bold">Where Youth Voice stands</h2>
            <Group title="Officially confirmed partners" empty="No confirmed partners yet.">
              {official.map((c) => <CityRow key={c.id} c={c} />)}
            </Group>
            <Group title="Active pilot communities" empty="No pilots yet.">
              {pilots.map((c) => <CityRow key={c.id} c={c} />)}
            </Group>
            <Group title="Being reviewed" empty="Nothing under review is public yet.">
              {reviewing.map((c) => <li key={c.city + c.state} className="text-sm">{c.city}, {c.state} <span className="text-xs text-muted-foreground">· {c.interest} requests</span></li>)}
            </Group>
            <Group title="Requested by users" empty={`A community appears here after ${interest.min} separate requests.`}>
              {requested.map((c) => <li key={c.city + c.state} className="text-sm">{c.city}, {c.state} <span className="text-xs text-muted-foreground">· {c.interest} requests</span></li>)}
            </Group>
            <p className="mt-4 text-xs text-muted-foreground">Requested and reviewed communities are not partners. Counts are requests from separate devices, not verified people. Names and emails are never shown.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Group({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children.length ? <ul className="mt-2 grid gap-1.5">{children}</ul> : <p className="mt-1 text-xs text-muted-foreground">{empty}</p>}
    </div>
  );
}
function CityRow({ c }: { c: { id: string; slug: string; name: string; state_code: string; status: "official" | "pilot" | "listed" | "pending" } }) {
  return <li className="flex items-center justify-between gap-2 text-sm"><Link to="/cities/$key" params={{ key: cityKey(c.slug, c.state_code) }} className="hover:text-primary">{c.name}, {c.state_code}</Link><CityStatusBadge status={c.status} /></li>;
}
