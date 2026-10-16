import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminVerify } from "@/lib/admin.functions";
import { ONBOARDING_STEPS } from "@/lib/partners.functions";
import { ORG_TYPES } from "@/lib/community-requests.functions";
import {
  adminPartnersOverview, adminSavePipeline, adminToggleStep, adminAddOutreach, adminSetDemoStatus,
  adminReviewImpact, adminSaveToolkit, adminSavePartner, adminSaveSettings,
} from "@/lib/partners-admin.functions";

export const Route = createFileRoute("/admin_/partners")({
  head: () => ({ meta: [{ title: "Partnerships — Admin — YouthVoice" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

type Overview = Awaited<ReturnType<typeof adminPartnersOverview>>;
const TABS = ["pipeline", "pilot", "growth", "outreach", "demos", "impact", "directory", "toolkit"] as const;
const REQ_LABEL: Record<string, string> = { pending: "Submitted", under_review: "Under Review", needs_info: "Additional Information Requested", approved: "Approved", rejected: "Rejected" };
const today = () => new Date().toISOString().slice(0, 10);

function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "signedout" | "denied" | "ok">("loading");
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const t = data.session?.access_token;
      if (!t) return setState("signedout");
      try { await adminVerify({ data: { token: t } }); setToken(t); setState("ok"); } catch { setState("denied"); }
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "TOKEN_REFRESHED" && s) setToken(s.access_token); });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Partnerships</h1><Link to="/admin" className="text-sm text-primary underline">Back to admin</Link></div>
        {state === "loading" && <p className="mt-4 text-sm text-muted-foreground">Checking access…</p>}
        {state === "signedout" && <p className="mt-4 text-sm">Sign in with your admin account on the <Link to="/account" className="underline">Profile page</Link>.</p>}
        {state === "denied" && <p className="mt-4 text-sm text-destructive">This account isn't a platform admin.</p>}
        {state === "ok" && token && <Dashboard token={token} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function Dashboard({ token }: { token: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pipeline");
  const [d, setD] = useState<Overview | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const reload = useCallback(async () => { try { setD(await adminPartnersOverview({ data: { token } })); } catch (e) { setMsg((e as Error).message); } }, [token]);
  useEffect(() => { reload(); }, [reload]);
  const run = async (fn: () => Promise<unknown>, ok = "Saved.") => { setMsg(null); try { await fn(); setMsg(ok); await reload(); } catch (e) { setMsg((e as Error).message); } };
  if (!d) return <p className="mt-4 text-sm text-muted-foreground">{msg ?? "Loading…"}</p>;
  const due = [...d.pipeline.filter((p) => p.next_followup_at && p.next_followup_at <= today()).map((p) => ({ k: p.id, who: d.requests.find((r) => r.id === p.request_id)?.organization || d.requests.find((r) => r.id === p.request_id)?.city_name || "Partner", date: p.next_followup_at! })),
    ...d.outreach.filter((o) => o.next_followup_at && o.next_followup_at <= today()).map((o) => ({ k: o.id, who: o.organization, date: o.next_followup_at! }))];
  return (
    <div className="mt-4">
      {due.length > 0 && <div className="mb-4 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm"><b>Follow-ups due:</b> {due.map((x) => `${x.who} (${x.date})`).join(", ")}</div>}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-3 py-2 text-sm capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{t}</button>)}
      </div>
      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
      <div className="mt-5">
        {tab === "pipeline" && <Pipeline d={d} token={token} run={run} />}
        {tab === "pilot" && <Pilot d={d} token={token} run={run} />}
        {tab === "growth" && <Growth d={d} />}
        {tab === "outreach" && <Outreach d={d} token={token} run={run} />}
        {tab === "demos" && <Demos d={d} token={token} run={run} />}
        {tab === "impact" && <Impact d={d} token={token} run={run} />}
        {tab === "directory" && <DirectoryAdmin d={d} token={token} run={run} />}
        {tab === "toolkit" && <ToolkitAdmin d={d} token={token} run={run} />}
      </div>
    </div>
  );
}
type P = { d: Overview; token: string; run: (fn: () => Promise<unknown>, ok?: string) => Promise<void> };

function Pipeline({ d, token, run }: P) {
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState({ coordinator: "", lastContact: "", nextFollowup: "", notes: "" });
  const [filter, setFilter] = useState("");
  const rows = d.requests.filter((r) => !filter || r.status === filter);
  return (
    <div>
      <div className="flex flex-wrap gap-2 text-xs">{["", ...Object.keys(REQ_LABEL)].map((s) => <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 ${filter === s ? "border-primary text-primary" : "border-border"}`}>{s ? REQ_LABEL[s] : "All"} ({s ? d.requests.filter((r) => r.status === s).length : d.requests.length})</button>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">Approve or reject applications in the Applications tab on the main admin page. Steps are only marked done when you check them.</p>
      {rows.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No applications.</p>}
      <ul className="mt-3 grid gap-2">
        {rows.map((r) => {
          const p = d.pipeline.find((x) => x.request_id === r.id);
          const done = new Set(d.steps.filter((s) => p && s.pipeline_id === p.id).map((s) => s.step_no));
          return (
            <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
              <button className="w-full text-left" onClick={() => { setOpen(open === r.id ? null : r.id); setF({ coordinator: p?.coordinator ?? "", lastContact: p?.last_contact_at ?? "", nextFollowup: p?.next_followup_at ?? "", notes: p?.notes ?? "" }); }}>
                <div className="flex flex-wrap justify-between gap-2"><b>{r.organization || r.city_name}</b><span className="text-xs">{REQ_LABEL[r.status] ?? r.status}</span></div>
                <div className="text-xs text-muted-foreground">{ORG_TYPES[r.org_type as keyof typeof ORG_TYPES] ?? r.org_type} · {r.city_name}, {r.state_code} · submitted {r.created_at.slice(0, 10)} · onboarding {done.size}/10{p?.coordinator ? ` · ${p.coordinator}` : ""}{p?.next_followup_at ? ` · follow up ${p.next_followup_at}` : ""}</div>
              </button>
              {open === r.id && (
                <div className="mt-3 grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Coordinator" value={f.coordinator} onChange={(e) => setF({ ...f, coordinator: e.target.value })} />
                    <label className="text-xs">Last contact<Input type="date" value={f.lastContact} onChange={(e) => setF({ ...f, lastContact: e.target.value })} /></label>
                    <label className="text-xs">Next follow-up<Input type="date" value={f.nextFollowup} onChange={(e) => setF({ ...f, nextFollowup: e.target.value })} /></label>
                  </div>
                  <Textarea rows={3} placeholder="Internal notes (private)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
                  <Button size="sm" className="w-fit" onClick={() => run(() => adminSavePipeline({ data: { token, requestId: r.id, ...f } }))}>Save</Button>
                  {p ? (
                    <ol className="mt-2 grid gap-1 sm:grid-cols-2">
                      {ONBOARDING_STEPS.map((label, i) => {
                        const st = d.steps.find((s) => s.pipeline_id === p.id && s.step_no === i + 1);
                        return <li key={i}><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!st} onChange={(e) => run(() => adminToggleStep({ data: { token, pipelineId: p.id, step: i + 1, done: e.target.checked } }))} />{i + 1}. {label}{st && <span className="text-muted-foreground"> · {st.done_at.slice(0, 10)}</span>}</label></li>;
                      })}
                    </ol>
                  ) : <p className="text-xs text-muted-foreground">Save once to start tracking onboarding steps.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Pilot({ d, token, run }: P) {
  const s = d.settings;
  const [f, setF] = useState({ target: String(s.pilot_target), start: s.pilot_start, end: s.pilot_end });
  const approved = d.communities.filter((c) => c.status === "pilot" || c.status === "official");
  const withPolls = approved.filter((c) => c.pollsInPeriod > 0);
  const active = withPolls.filter((c) => c.votesInPeriod > 0);
  const followed = new Set(d.impact.filter((i) => i.status !== "proposed").map((i) => i.community_id));
  const reviewed = active.filter((c) => followed.has(c.id));
  const activated = d.pipeline.filter((p) => p.activated_at).length;
  const stages: [string, number, string][] = [
    ["Prospective", d.outreach.length + d.demos.length, "Outreach records plus demo requests (all time). Not partners."],
    ["Applications under review", d.requests.filter((r) => ["pending", "under_review", "needs_info"].includes(r.status)).length, "Applications not yet approved or rejected."],
    ["Approved partnerships", approved.length, "Cities with Pilot or Official status."],
    ["Activated", activated, "Pipelines where step 7 (Community activated) was checked."],
    ["With published polls", withPolls.length, `Approved cities with at least one published poll created ${s.pilot_start} – ${s.pilot_end}.`],
    ["Collected eligible responses (active pilots)", active.length, `Of those, cities with at least one counted vote in ${s.pilot_start} – ${s.pilot_end}.`],
    ["Reviewed results + follow-up", reviewed.length, "Active pilots with a recorded outcome marked in progress, completed or verified."],
  ];
  return (
    <div>
      <div className="rounded-2xl border border-border p-5">
        <div className="font-display text-3xl font-extrabold">{active.length} / {s.pilot_target}</div>
        <p className="text-sm text-muted-foreground">active pilot communities, {s.pilot_start} – {s.pilot_end}</p>
        <div className="mt-3 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (active.length / s.pilot_target) * 100)}%` }} /></div>
        <p className="mt-3 text-xs text-muted-foreground">An active pilot is an approved (Pilot or Official) community with at least one published civic poll and at least one counted response during the pilot period. A city page alone doesn't count.</p>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">{stages.map(([l, n, def]) => <li key={l} className="rounded-xl border border-border p-3 text-sm"><div className="flex justify-between"><b>{l}</b><span className="tabular-nums">{n}</span></div><p className="text-xs text-muted-foreground">{def}</p></li>)}</ul>
      <div className="mt-5 flex flex-wrap items-end gap-2 text-xs">
        <label>Target<Input type="number" min={1} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} className="w-24" /></label>
        <label>Start<Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
        <label>End<Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
        <Button size="sm" onClick={() => run(() => adminSaveSettings({ data: { token, target: Number(f.target), start: f.start, end: f.end } }))}>Save settings</Button>
      </div>
    </div>
  );
}

function Growth({ d }: { d: Overview }) {
  const decided = d.requests.filter((r) => r.status === "approved" || r.status === "rejected");
  const approved = d.requests.filter((r) => r.status === "approved");
  const days = d.pipeline.filter((p) => p.activated_at && p.request_id).map((p) => {
    const r = d.requests.find((x) => x.id === p.request_id); return r ? (new Date(p.activated_at!).getTime() - new Date(r.created_at).getTime()) / 86400_000 : null;
  }).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const median = days.length ? Math.round(days[Math.floor(days.length / 2)]) : null;
  const approvedComms = d.communities.filter((c) => c.status === "pilot" || c.status === "official");
  const completed = d.pipeline.filter((p) => d.steps.filter((s) => s.pipeline_id === p.id).length === 10).length;
  const retained = d.pipeline.filter((p) => p.activated_at && Date.now() - new Date(p.activated_at).getTime() > 90 * 86400_000 && (d.communities.find((c) => c.id === p.community_id)?.votesLast30 ?? 0) > 0).length;
  const eligible = d.pipeline.filter((p) => p.activated_at && Date.now() - new Date(p.activated_at).getTime() > 90 * 86400_000).length;
  const m: [string, string, string][] = [
    ["Applications", String(d.requests.length), "All time."],
    ["Approval rate", decided.length ? `${Math.round((approved.length / decided.length) * 100)}%` : "—", `Approved ÷ decided (${decided.length} decided).`],
    ["Median days to activation", median === null ? "—" : String(median), "From application to step 7 being checked."],
    ["Activated communities", String(d.pipeline.filter((p) => p.activated_at).length), "Step 7 checked."],
    ["Cities with recent activity", String(approvedComms.filter((c) => c.votesLast30 > 0).length), "Pilot/Official cities with votes in the last 30 days."],
    ["Published polls", String(approvedComms.reduce((a, c) => a + c.pollsAll, 0)), "In Pilot/Official cities, all time."],
    ["Eligible responses", String(approvedComms.reduce((a, c) => a + c.votesAll, 0)), "Votes in Pilot/Official cities, all time. Responses, not people."],
    ["Completed onboarding", String(completed), "All 10 steps checked."],
    ["Documented follow-up actions", String(d.impact.filter((i) => i.status !== "proposed").length), "Outcomes in progress, completed or verified."],
    ["90-day retention", eligible ? `${retained} / ${eligible}` : "—", "Partners activated 90+ days ago that still had votes in the last 30 days."],
  ];
  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2">{m.map(([l, v, def]) => <li key={l} className="rounded-xl border border-border p-3 text-sm"><div className="flex justify-between"><b>{l}</b><span className="tabular-nums">{v}</span></div><p className="text-xs text-muted-foreground">{def}</p></li>)}</ul>
      <p className="mt-3 text-xs text-muted-foreground">Website visits, city pages and applications are not treated as participation. Only city-level totals are shown.</p>
    </div>
  );
}

function Outreach({ d, token, run }: P) {
  const [f, setF] = useState({ organization: "", channel: "email", summary: "", contactedOn: today(), nextFollowup: "" });
  return (
    <div>
      <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
        <Input placeholder="Organization" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>{["email", "call", "meeting", "event", "other"].map((c) => <option key={c}>{c}</option>)}</select>
        <label className="text-xs">Contacted<Input type="date" value={f.contactedOn} onChange={(e) => setF({ ...f, contactedOn: e.target.value })} /></label>
        <label className="text-xs">Follow up<Input type="date" value={f.nextFollowup} onChange={(e) => setF({ ...f, nextFollowup: e.target.value })} /></label>
        <Textarea className="sm:col-span-2" rows={2} placeholder="Summary" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
        <Button size="sm" className="w-fit" onClick={() => run(() => adminAddOutreach({ data: { token, ...f } }), "Logged.")}>Log outreach</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">One-to-one outreach only. No bulk email or scraped contacts. Contacting an organization doesn't make it a partner.</p>
      <ul className="mt-3 grid gap-2">{d.outreach.map((o) => <li key={o.id} className="rounded-xl border border-border p-3 text-sm"><b>{o.organization}</b> <span className="text-xs text-muted-foreground">· {o.channel} · {o.contacted_on}{o.next_followup_at ? ` · follow up ${o.next_followup_at}` : ""}</span><p className="mt-1">{o.summary}</p></li>)}</ul>
    </div>
  );
}

function Demos({ d, token, run }: P) {
  if (!d.demos.length) return <p className="text-sm text-muted-foreground">No demo requests yet.</p>;
  return <ul className="grid gap-2">{d.demos.map((x) => (
    <li key={x.id} className="rounded-xl border border-border p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><b>{x.organization}</b>
        <select value={x.status} onChange={(e) => run(() => adminSetDemoStatus({ data: { token, id: x.id, status: e.target.value } }))} className="rounded border border-border bg-background px-2 text-xs">{["new", "scheduled", "completed", "declined"].map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="text-xs text-muted-foreground">{x.name} · <a className="underline" href={`mailto:${x.email}`}>{x.email}</a>{x.state_code ? ` · ${x.state_code}` : ""} · {x.created_at.slice(0, 10)}</div>
      {x.message && <p className="mt-1">{x.message}</p>}
    </li>))}</ul>;
}

function Impact({ d, token, run }: P) {
  if (!d.impact.length) return <p className="text-sm text-muted-foreground">No outcomes recorded yet. City managers can add them from their city page.</p>;
  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">Before publishing, check the story has no personal details or private messages, and that the wording says "informed" or "discussed" unless the evidence shows Youth Voice caused the change.</p>
      <ul className="grid gap-2">{d.impact.map((x) => (
        <li key={x.id} className="rounded-xl border border-border p-3 text-sm">
          <div className="text-xs text-muted-foreground">{x.communities?.name}, {x.communities?.state_code} · {x.occurred_on} · {x.status}{x.public ? " · PUBLIC" : ""}{x.reviewed_by ? " · reviewed" : " · needs review"}</div>
          <p className="mt-1">{x.description}</p>
          {x.evidence_url && <a href={x.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Evidence</a>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => run(() => adminReviewImpact({ data: { token, id: x.id, status: "verified", publish: x.public } }))}>Mark verified</Button>
            {x.public ? <Button size="sm" variant="outline" onClick={() => run(() => adminReviewImpact({ data: { token, id: x.id, status: x.status, publish: false } }))}>Unpublish</Button>
              : <Button size="sm" onClick={() => run(() => adminReviewImpact({ data: { token, id: x.id, status: x.status, publish: true } }))}>Approve & publish</Button>}
          </div>
        </li>))}</ul>
    </div>
  );
}

function DirectoryAdmin({ d, token, run }: P) {
  const blank = { id: "", name: "", orgType: "community_org", stateCode: "", communityId: "", verified: false, verificationNote: "", publicListing: false, publicDescription: "" };
  const [f, setF] = useState(blank);
  return (
    <div>
      <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
        <Input placeholder="Organization name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.orgType} onChange={(e) => setF({ ...f, orgType: e.target.value })}>{Object.entries(ORG_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.communityId} onChange={(e) => { const c = d.communities.find((x) => x.id === e.target.value); setF({ ...f, communityId: e.target.value, stateCode: c?.state_code ?? f.stateCode }); }}><option value="">Linked city (optional)</option>{d.communities.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state_code}</option>)}</select>
        <Input placeholder="State (e.g. ND)" maxLength={2} value={f.stateCode} onChange={(e) => setF({ ...f, stateCode: e.target.value.toUpperCase() })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.verified} onChange={(e) => setF({ ...f, verified: e.target.checked, publicListing: e.target.checked && f.publicListing })} /> Partnership verified</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!f.verified} checked={f.publicListing} onChange={(e) => setF({ ...f, publicListing: e.target.checked })} /> Organization approved public listing</label>
        {f.verified && <Textarea className="sm:col-span-2" rows={2} placeholder="How was this verified? (signed agreement, email from…, date)" value={f.verificationNote} onChange={(e) => setF({ ...f, verificationNote: e.target.value })} />}
        <Textarea className="sm:col-span-2" rows={2} placeholder="Public description (shown only if listed)" value={f.publicDescription} onChange={(e) => setF({ ...f, publicDescription: e.target.value })} />
        <div className="flex gap-2"><Button size="sm" onClick={() => run(() => adminSavePartner({ data: { token, ...f, id: f.id || undefined } }).then(() => setF(blank)))}>{f.id ? "Update" : "Add"} organization</Button>{f.id && <Button size="sm" variant="outline" onClick={() => setF(blank)}>Cancel</Button>}</div>
      </div>
      <ul className="mt-3 grid gap-2">{d.partners.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm">
          <div><b>{p.name}</b> <span className="text-xs text-muted-foreground">{p.verified ? "Verified" : "Not verified"} · {p.public_listing ? "Listed publicly" : "Hidden"}</span></div>
          <Button size="sm" variant="outline" onClick={() => setF({ id: p.id, name: p.name, orgType: p.org_type, stateCode: p.state_code ?? "", communityId: p.community_id ?? "", verified: p.verified, verificationNote: p.verification_note ?? "", publicListing: p.public_listing, publicDescription: p.public_description ?? "" })}>Edit</Button>
        </li>))}</ul>
    </div>
  );
}

function ToolkitAdmin({ d, token, run }: P) {
  const [slug, setSlug] = useState(d.toolkit[0]?.slug ?? "");
  const page = d.toolkit.find((t) => t.slug === slug);
  const [title, setTitle] = useState(page?.title ?? ""); const [body, setBody] = useState(page?.body ?? "");
  useEffect(() => { setTitle(page?.title ?? ""); setBody(page?.body ?? ""); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid gap-2">
      <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={slug} onChange={(e) => setSlug(e.target.value)}>{d.toolkit.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}</select>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
      <p className="text-xs text-muted-foreground">Start a line with "- " for bullets and wrap words in **double stars** for bold.</p>
      <div className="flex gap-2"><Button size="sm" onClick={() => run(() => adminSaveToolkit({ data: { token, slug, title, body } }))}>Save guide</Button><Link to="/partners/toolkit" className="text-sm text-primary underline">View toolkit</Link></div>
    </div>
  );
}
