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

  async function update(id: string, patch: { status?: string; aiTopicsEnabled?: boolean; minVotes?: number }) {
    if (patch.status === "official" && !window.confirm("Mark this city OFFICIAL? Only do this after verifying a real partnership with the city.")) return;
    try {
      await adminUpdateCommunity({ data: { token, id, ...patch } });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function review(id: string, action: "draft" | "reject") {
    await adminReviewRequest({ data: { token, id, action } });
    reload();
  }

  if (!data) return <p className="text-sm text-muted-foreground">{err ?? "Loading…"}</p>;
  const pending = data.requests.filter((r) => r.status === "pending");

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

      <section>
        <h3 className="font-display text-lg font-bold">City requests ({pending.length} pending)</h3>
        {pending.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No pending requests.</p>}
        <div className="mt-3 space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card/50 p-3 text-sm">
              <div className="font-semibold">
                {r.city_name}, {r.state_code} <span className="font-normal text-muted-foreground">· {r.requester_role}</span>
              </div>
              {r.organization && <div>{r.organization}</div>}
              <div className="text-muted-foreground">{r.contact_email}</div>
              {r.message && <p className="mt-1">{r.message}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => review(r.id, "draft")}>
                  Create as draft city
                </Button>
                <Button size="sm" variant="outline" onClick={() => review(r.id, "reject")}>
                  Reject
                </Button>
              </div>
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
