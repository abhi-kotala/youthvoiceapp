import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminVerify } from "@/lib/admin.functions";
import { adminListInterest, adminUpdateInterest, adminConvertInterest } from "@/lib/interest.functions";
import { COMMUNITY_TYPES, INTEREST_LABEL, INTEREST_STATUSES } from "@/lib/interest";

export const Route = createFileRoute("/admin_/partners_/requests")({
  head: () => ({ meta: [{ title: "Community requests — Admin — YouthVoice" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

type Row = Awaited<ReturnType<typeof adminListInterest>>["rows"][number];

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
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Community requests</h1><Link to="/admin/partners" className="text-sm text-primary underline">Partnerships dashboard</Link></div>
        {state === "loading" && <p className="mt-4 text-sm text-muted-foreground">Checking access…</p>}
        {state === "signedout" && <p className="mt-4 text-sm">Sign in with your admin account on the <Link to="/account" className="underline">Profile page</Link>.</p>}
        {state === "denied" && <p className="mt-4 text-sm text-destructive">This account isn't a platform admin.</p>}
        {state === "ok" && token && <Requests token={token} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function Requests({ token }: { token: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState(""); const [st, setSt] = useState(""); const [type, setType] = useState(""); const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"date" | "interest">("date");
  const [open, setOpen] = useState<string | null>(null);
  const reload = useCallback(async () => { try { setRows((await adminListInterest({ data: { token } })).rows); } catch (e) { setMsg((e as Error).message); } }, [token]);
  useEffect(() => { reload(); }, [reload]);
  const list = useMemo(() => (rows ?? []).filter((r) =>
    (!q || `${r.city_name} ${r.organization ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!st || r.state_code === st) && (!type || r.community_type === type) && (!status || r.status === status))
    .sort((a, b) => sort === "interest" ? b.interest - a.interest || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at)), [rows, q, st, type, status, sort]);

  function exportCsv() {
    // Summary only: no emails, reasons, or notes.
    const groups = new Map<string, { city: string; state: string; type: string; n: number; help: number; statuses: Set<string>; first: string }>();
    for (const r of list) {
      const g = groups.get(r.community_key) ?? { city: r.city_name, state: r.state_code, type: r.community_type, n: 0, help: 0, statuses: new Set(), first: r.created_at };
      g.n++; if (r.wants_to_help) g.help++; g.statuses.add(INTEREST_LABEL[r.status]); if (r.created_at < g.first) g.first = r.created_at;
      groups.set(r.community_key, g);
    }
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ["community,state,type,requests,willing_to_help,statuses,first_request", ...[...groups.values()].map((g) => [esc(g.city), g.state, g.type, g.n, g.help, esc([...g.statuses].join("; ")), g.first.slice(0, 10)].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `community-requests-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (!rows) return <p className="mt-4 text-sm text-muted-foreground">{msg ?? "Loading…"}</p>;
  const sel = "h-10 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="mt-4">
      <div className="grid gap-2 sm:grid-cols-6">
        <Input className="sm:col-span-6" placeholder="Search community or organization" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={sel} value={st} onChange={(e) => setSt(e.target.value)} aria-label="State"><option value="">All states</option>{[...new Set(rows.map((r) => r.state_code))].sort().map((s) => <option key={s}>{s}</option>)}</select>
        <select className={sel} value={type} onChange={(e) => setType(e.target.value)} aria-label="Type"><option value="">All types</option>{Object.entries(COMMUNITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={`${sel} sm:col-span-2`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{INTEREST_STATUSES.map((s) => <option key={s} value={s}>{INTEREST_LABEL[s]}</option>)}</select>
        <select className={sel} value={sort} onChange={(e) => setSort(e.target.value as "date" | "interest")} aria-label="Sort"><option value="date">Newest</option><option value="interest">Most interest</option></select>
        <Button variant="outline" onClick={exportCsv}>Export summary</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">The export lists communities and counts only, with no emails, reasons or notes. "Interest" counts requests from separate devices for the same community.</p>
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
      {list.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No requests yet.</p>}
      <ul className="mt-4 grid gap-2">
        {list.map((r) => <RequestRow key={r.id} r={r} open={open === r.id} toggle={() => setOpen(open === r.id ? null : r.id)} token={token} done={async (m) => { setMsg(m); await reload(); }} />)}
      </ul>
    </div>
  );
}

function RequestRow({ r, open, toggle, token, done }: { r: Row; open: boolean; toggle: () => void; token: string; done: (m: string) => Promise<void> }) {
  const [f, setF] = useState({ status: r.status, adminNote: r.admin_note ?? "", verificationNote: r.verification_note ?? "", outreachAt: r.outreach_at ?? "", followupAt: r.followup_at ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const go = async (fn: () => Promise<unknown>, m: string) => { setErr(null); try { await fn(); await done(m); } catch (e) { setErr((e as Error).message); } };
  return (
    <li className="rounded-xl border border-border p-3 text-sm">
      <button className="w-full text-left" onClick={toggle}>
        <div className="flex flex-wrap justify-between gap-2"><b>{r.city_name}, {r.state_code}</b><span className="text-xs">{INTEREST_LABEL[r.status]}</span></div>
        <div className="text-xs text-muted-foreground">{COMMUNITY_TYPES[r.community_type as keyof typeof COMMUNITY_TYPES] ?? r.community_type} · {r.created_at.slice(0, 10)} · interest {r.interest}{r.interest > 1 ? " (duplicate community)" : ""}{r.wants_to_help ? " · wants to help" : ""}{r.followup_at ? ` · follow up ${r.followup_at}` : ""}</div>
      </button>
      {open && (
        <div className="mt-3 grid gap-2">
          {r.organization && <p><b>Organization:</b> {r.organization}</p>}
          {r.contact_email && <p><b>Email:</b> <a className="underline" href={`mailto:${r.contact_email}`}>{r.contact_email}</a></p>}
          {r.reason && <p><b>Why:</b> {r.reason}</p>}
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{INTEREST_STATUSES.map((s) => <option key={s} value={s}>{INTEREST_LABEL[s]}</option>)}</select>
            <label className="text-xs">Outreach date<Input type="date" value={f.outreachAt} onChange={(e) => setF({ ...f, outreachAt: e.target.value })} /></label>
            <label className="text-xs">Follow-up date<Input type="date" value={f.followupAt} onChange={(e) => setF({ ...f, followupAt: e.target.value })} /></label>
          </div>
          {f.status === "official_confirmed" && <Textarea rows={2} placeholder="How was the partnership verified? (required)" value={f.verificationNote} onChange={(e) => setF({ ...f, verificationNote: e.target.value })} />}
          <Textarea rows={2} placeholder="Private admin notes" value={f.adminNote} onChange={(e) => setF({ ...f, adminNote: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => go(() => adminUpdateInterest({ data: { token, id: r.id, ...f } }), "Saved.")}>Save</Button>
            {r.pipeline_id ? <Link to="/admin/partners" className="text-sm text-primary underline">In pilot onboarding →</Link>
              : <Button size="sm" variant="secondary" onClick={() => go(() => adminConvertInterest({ data: { token, id: r.id } }), "Moved to pilot onboarding. A hidden draft city was created if needed.")}>Approve & start pilot onboarding</Button>}
          </div>
          <p className="text-xs text-muted-foreground">"Official partner confirmed" here doesn't change the city's public status. Set that separately in Cities after verifying.</p>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}
    </li>
  );
}
