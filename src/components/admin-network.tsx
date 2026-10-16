import { useCallback, useEffect, useState } from "react";
import {
  adminListCommunities,
  adminUpdateCommunity,
  adminReviewRequest,
  adminListDrafts,
  adminReviewDraft,
  adminListRoles,
  adminGrantRole,
  adminRevokeRole,
  adminListAudit,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Community = {
  id: string;
  name: string;
  state_code: string;
  status: string;
  ai_topics_enabled: boolean;
  min_votes_for_results: number;
};
type Req = {
  contact_name: string | null;
  contact_phone: string | null;
  org_type: string | null;
  engagement_plan: string | null;
  admin_note: string | null;
  decision_reason: string | null;
  community_id: string | null;
  id: string;
  city_name: string;
  state_code: string;
  requester_role: string;
  organization: string | null;
  contact_email: string;
  message: string | null;
  status: string;
  created_at: string;
};

const STATUS_HELP: Record<string, string> = {
  draft: "Hidden — setup only",
  pending: "Public, labeled Pending Approval (awaiting your review)",
  listed: "Public, labeled Not Yet Participating (no partnership)",
  pilot: "Public, labeled Pilot (testing only, not an official partnership)",
  official: "Public — verified partnership, approved by you",
  paused: "Hidden — temporarily off",
};

export function CitiesPanel({ token }: { token: string }) {
  const [data, setData] = useState<{
    communities: Community[];
    requests: Req[];
    usage: { runs: number; totalCost: number; monthCost: number };
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData((await adminListCommunities({ data: { token } })) as never);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [token]);
  useEffect(() => {
    reload();
  }, [reload]);

  async function update(id: string, patch: { status?: string; aiTopicsEnabled?: boolean; minVotes?: number; verificationNote?: string }) {
    if (patch.status === "official") {
      const note = window.prompt("Mark OFFICIAL PARTNER only after verifying a real partnership. Who confirmed it, and how? (saved to the audit log)");
      if (!note) return reload();
      patch.verificationNote = note;
    }
    try {
      await adminUpdateCommunity({ data: { token, id, ...patch } });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!data) return <p className="text-sm text-muted-foreground">{err ?? "Loading…"}</p>;

  return (
    <div className="space-y-8">
      {err && <p className="text-sm text-destructive">{err}</p>}
      <section className="rounded-xl border border-border bg-card/50 p-4">
        <h3 className="font-display text-lg font-bold">AI usage (estimated)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.usage.runs} runs · ${data.usage.monthCost.toFixed(3)} this month · ${data.usage.totalCost.toFixed(3)} total.
          Estimates only — your actual credit usage may differ.
        </p>
      </section>

      <section>
        <h3 className="font-display text-lg font-bold">Cities</h3>
        <div className="mt-3 space-y-3">
          {data.communities.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/50 p-3">
              <div className="min-w-40 flex-1">
                <div className="font-semibold">
                  {c.name}, {c.state_code}
                </div>
                <div className="text-xs text-muted-foreground">{STATUS_HELP[c.status]}</div>
              </div>
              <select
                aria-label={`Status for ${c.name}`}
                value={c.status}
                onChange={(e) => update(c.id, { status: e.target.value })}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                {Object.keys(STATUS_HELP).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={c.ai_topics_enabled}
                  onChange={(e) => update(c.id, { aiTopicsEnabled: e.target.checked })}
                />
                AI drafts
              </label>
              <label className="flex items-center gap-1 text-sm">
                Min votes
                <input
                  type="number"
                  min={1}
                  defaultValue={c.min_votes_for_results}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (n !== c.min_votes_for_results) update(c.id, { minVotes: n });
                  }}
                  className="w-16 rounded-md border border-input bg-background px-2 py-1"
                />
              </label>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

type Draft = {
  id: string;
  title: string;
  description: string;
  category: string;
  communities: { name: string; state_code: string } | null;
};

export function DraftsPanel({ token }: { token: string }) {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [edits, setEdits] = useState<Record<string, { title: string; description: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const r = await adminListDrafts({ data: { token } });
    setDrafts(r.drafts as never);
  }, [token]);
  useEffect(() => {
    reload();
  }, [reload]);

  async function act(d: Draft, action: "approve" | "discard") {
    const e = edits[d.id];
    try {
      await adminReviewDraft({ data: { token, id: d.id, action, title: e?.title, description: e?.description } });
      setMsg(action === "approve" ? "Published." : "Discarded.");
      reload();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  if (!drafts) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        AI suggestions wait here. Nothing goes live until you approve it.
      </p>
      {msg && <p className="text-sm">{msg}</p>}
      {drafts.length === 0 && <p className="text-sm text-muted-foreground">No drafts waiting.</p>}
      {drafts.map((d) => {
        const e = edits[d.id] ?? { title: d.title, description: d.description };
        return (
          <div key={d.id} className="space-y-2 rounded-xl border border-border bg-card/50 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {d.communities?.name}, {d.communities?.state_code} · {d.category}
            </div>
            <Input value={e.title} onChange={(ev) => setEdits({ ...edits, [d.id]: { ...e, title: ev.target.value } })} />
            <Textarea
              rows={4}
              value={e.description}
              onChange={(ev) => setEdits({ ...edits, [d.id]: { ...e, description: ev.target.value } })}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => act(d, "approve")}>
                Approve & publish
              </Button>
              <Button size="sm" variant="outline" onClick={() => act(d, "discard")}>
                Discard
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type RoleRow = {
  id: string;
  role: string;
  email: string;
  communities: { name: string; state_code: string } | null;
};

export function RolesPanel({ token }: { token: string }) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [cities, setCities] = useState<Community[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("community_admin");
  const [cityId, setCityId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [r, c] = await Promise.all([adminListRoles({ data: { token } }), adminListCommunities({ data: { token } })]);
    setRoles(r.roles as never);
    setCities(c.communities as never);
  }, [token]);
  useEffect(() => {
    reload();
  }, [reload]);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminGrantRole({ data: { token, email, role, communityId: cityId || null } });
      setEmail("");
      setMsg("Role granted.");
      reload();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={grant} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card/50 p-4">
        <Input className="w-64" type="email" placeholder="account email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
          <option value="community_admin">City admin</option>
          <option value="partner">Partner</option>
          <option value="official">Official (totals only)</option>
          <option value="platform_admin">Platform admin</option>
        </select>
        {role !== "platform_admin" && (
          <select aria-label="City" value={cityId} onChange={(e) => setCityId(e.target.value)} className="rounded-md border border-input bg-background px-2 py-2 text-sm" required>
            <option value="">Pick a city…</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.state_code}
              </option>
            ))}
          </select>
        )}
        <Button type="submit">Grant</Button>
        {msg && <p className="w-full text-sm">{msg}</p>}
      </form>
      <div className="space-y-2">
        {roles.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <span>
              <b>{r.email}</b> · {r.role.replace("_", " ")}
              {r.communities ? ` · ${r.communities.name}, ${r.communities.state_code}` : " · all cities"}
            </span>
            <Button size="sm" variant="outline" onClick={async () => { if (window.confirm("Remove this role?")) { await adminRevokeRole({ data: { token, id: r.id } }); reload(); } }}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

const APP_TABS = ["pending", "needs_info", "approved", "rejected"] as const;
const APP_LABEL: Record<string, string> = { pending: "Pending", needs_info: "Needs info", approved: "Approved", rejected: "Rejected" };

export function ApplicationsPanel({ token }: { token: string }) {
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [tab, setTab] = useState<string>("pending");
  const [q, setQ] = useState("");
  const [stateF, setStateF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      const r = await adminListCommunities({ data: { token } });
      setReqs(r.requests as never);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [token]);
  useEffect(() => {
    reload();
  }, [reload]);

  async function act(id: string, action: "draft" | "pending" | "reject" | "needs_info") {
    setMsg(null);
    try {
      await adminReviewRequest({ data: { token, id, action, note } });
      setNote("");
      setOpen(null);
      setMsg(action === "reject" ? "Rejected." : action === "needs_info" ? "Marked as needing info — email them from your inbox." : "Approved. The city was created (not public until you set its status).");
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!reqs) return <p className="text-sm text-muted-foreground">{msg ?? "Loading…"}</p>;
  const states = [...new Set(reqs.map((r) => r.state_code))].sort();
  const types = [...new Set(reqs.map((r) => r.org_type ?? r.requester_role))].sort();
  const ql = q.trim().toLowerCase();
  const list = reqs.filter(
    (r) =>
      r.status === tab &&
      (!stateF || r.state_code === stateF) &&
      (!typeF || (r.org_type ?? r.requester_role) === typeF) &&
      (!ql || `${r.city_name} ${r.organization ?? ""} ${r.contact_name ?? ""}`.toLowerCase().includes(ql)),
  );
  const sel = "rounded-md border border-input bg-background px-2 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {APP_TABS.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            {APP_LABEL[t]} ({reqs.filter((r) => r.status === t).length})
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="w-56" placeholder="Search city, org, contact" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter state" className={sel} value={stateF} onChange={(e) => setStateF(e.target.value)}>
          <option value="">All states</option>
          {states.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Filter type" className={sel} value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="">All types</option>
          {types.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {list.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      {list.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card/50 p-3 text-sm">
          <button className="w-full text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
            <div className="font-semibold">
              {r.city_name}, {r.state_code}{" "}
              <span className="font-normal text-muted-foreground">· {r.org_type ?? r.requester_role} · {new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            {r.organization && <div>{r.organization}</div>}
          </button>
          {open === r.id && (
            <div className="mt-3 space-y-2">
              <div className="text-muted-foreground">
                {r.contact_name && <div>{r.contact_name}</div>}
                <div>{r.contact_email}</div>
                {r.contact_phone && <div>{r.contact_phone}</div>}
              </div>
              {r.message && <p><b>Why:</b> {r.message}</p>}
              {r.engagement_plan && <p><b>Engagement plan:</b> {r.engagement_plan}</p>}
              {r.admin_note && <p className="text-muted-foreground"><b>Admin note:</b> {r.admin_note}</p>}
              {r.decision_reason && <p className="text-muted-foreground"><b>Reason:</b> {r.decision_reason}</p>}
              {(r.status === "pending" || r.status === "needs_info") && (
                <>
                  <Textarea rows={2} placeholder="Note / reason (required to reject or request info)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => act(r.id, "draft")}>Approve as hidden draft</Button>
                    <Button size="sm" variant="secondary" onClick={() => act(r.id, "pending")}>Approve as Pending (public)</Button>
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "needs_info")}>Request more info</Button>
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "reject")}>Reject</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type AuditRow = { id: string; actor: string; action: string; target_type: string; target_id: string | null; details: unknown; created_at: string };

export function AuditPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  useEffect(() => {
    adminListAudit({ data: { token } }).then((r) => setRows(r.entries as never));
  }, [token]);
  if (!rows) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No admin actions recorded yet.</p>;
  return (
    <div className="space-y-2 text-sm">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-border p-3">
          <div><b>{r.action}</b> · {r.target_type} · {new Date(r.created_at).toLocaleString()}</div>
          <div className="text-muted-foreground">by {r.actor}</div>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(r.details)}</pre>
        </div>
      ))}
    </div>
  );
}
