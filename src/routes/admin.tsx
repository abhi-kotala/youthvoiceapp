import { CitiesPanel, DraftsPanel, RolesPanel, ApplicationsPanel, AuditPanel } from "@/components/admin-network";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import {
  adminVerify,
  adminListReports,
  adminSetCommentHidden,
  adminDismissReport,
  adminCreateIssue,
  adminUpdateIssue,
  adminDeleteIssue,
  adminGenerateTopics,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";


type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  city: string;
  impact_status?: string | null;
  impact_note?: string | null;
  closes_at?: string | null;
};

type ReportRow = {
  id: string;
  reason: string | null;
  created_at: string;
  comment_id: string;
  comments: {
    id: string;
    body: string;
    stance: string;
    display_name: string;
    hidden: boolean;
    issue_id: string;
    issues: { title: string } | null;
  } | null;
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Youth Voice" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "signedout" | "denied" | "ok">("loading");

  useEffect(() => {
    let active = true;
    async function check(t: string | null) {
      if (!t) return active && setState("signedout");
      try {
        await adminVerify({ data: { token: t } });
        if (!active) return;
        setToken(t);
        setState("ok");
      } catch {
        if (active) setState("denied");
      }
    }
    supabase.auth.getSession().then(({ data }) => check(data.session?.access_token ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "TOKEN_REFRESHED" && s) setToken(s.access_token);
      if (event === "SIGNED_OUT") { setToken(null); setState("signedout"); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        {state === "loading" && <p className="mt-4 text-sm text-muted-foreground">Checking access…</p>}
        {state === "signedout" && (
          <p className="mt-4 text-sm">Sign in with your admin account on the <a className="underline" href="/account">Profile page</a>, then come back.</p>
        )}
        {state === "denied" && <p className="mt-4 text-sm text-destructive">This account isn't a platform admin.</p>}
        {state === "ok" && token && <AdminDashboard token={token} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function AdminDashboard({ token }: { token: string }) {
  const [tab, setTab] = useState<"reports" | "issues" | "applications" | "cities" | "drafts" | "roles" | "audit">("reports");
  return (
    <div className="mt-6">
      <div className="flex gap-2 overflow-x-auto border-b border-border">
        {(["reports", "issues", "cities", "drafts", "roles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "border-b-2 px-3 py-2 text-sm font-medium capitalize",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "reports" && <ReportsPanel token={token} />}
        {tab === "issues" && <IssuesPanel token={token} />}
        {tab === "cities" && <CitiesPanel token={token} />}
        {tab === "drafts" && <DraftsPanel token={token} />}
        {tab === "roles" && <RolesPanel token={token} />}
        {tab === "applications" && <ApplicationsPanel token={token} />}
        {tab === "audit" && <AuditPanel token={token} />}
      </div>
    </div>
  );
}

function ReportsPanel({ token }: { token: string }) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await adminListReports({ data: { token } });
    setReports((res.reports ?? []) as unknown as ReportRow[]);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function hide(commentId: string, hidden: boolean) {
    await adminSetCommentHidden({ data: { token, commentId, hidden } });
    reload();
  }
  async function dismiss(reportId: string) {
    await adminDismissReport({ data: { token, reportId } });
    reload();
  }

  if (loading) return <p className="text-muted-foreground">Loading reports…</p>;
  if (reports.length === 0)
    return <p className="text-muted-foreground">No reports right now. 🎉</p>;

  return (
    <ul className="space-y-3">
      {reports.map((r) => {
        const c = r.comments;
        return (
          <li key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                On: <span className="font-medium text-foreground">{c?.issues?.title ?? "(deleted)"}</span>
              </span>
              <span>{new Date(r.created_at).toLocaleString()}</span>
            </div>
            {r.reason && (
              <p className="mt-2 text-sm">
                <span className="font-semibold">Reason: </span>
                {r.reason}
              </p>
            )}
            {c ? (
              <div className="mt-3 rounded-md border border-border bg-background p-3">
                <div className="text-xs text-muted-foreground">
                  {c.display_name} · {c.stance} {c.hidden && "· hidden"}
                </div>
                <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Comment deleted.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {c && (
                <button
                  onClick={() => hide(c.id, !c.hidden)}
                  className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-secondary"
                >
                  {c.hidden ? "Unhide comment" : "Hide comment"}
                </button>
              )}
              <button
                onClick={() => dismiss(r.id)}
                className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-secondary"
              >
                Dismiss report
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function IssuesPanel({ token }: { token: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("issues")
      .select("id, title, description, category, status, city, impact_status, impact_note, closes_at")
      .order("created_at", { ascending: false });
    setIssues((data ?? []) as Issue[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function generate() {
    setGenerating(true);
    setGenMsg(null);
    try {
      const res = await adminGenerateTopics({ data: { token, count: 3 } });
      setGenMsg(
        res.created.length
          ? `Created ${res.created.length} AI draft${res.created.length === 1 ? "" : "s"} — review them in the Drafts tab.` +
              (res.closed ? ` Closed ${res.closed} expired.` : "")
          : (res.skipped ?? "No topics created."),
      );
      reload();
    } catch (e) {
      setGenMsg((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this issue? All votes and comments will also be removed.")) return;
    await adminDeleteIssue({ data: { token, id } });
    reload();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {genMsg && <p className="mr-auto text-xs text-muted-foreground">{genMsg}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
        >
          {generating ? "Generating…" : "✨ Auto-generate topics"}
        </button>
        <button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          + New issue
        </button>
      </div>

      {(creating || editing) && (
        <IssueForm
          token={token}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {issues.map((i) => (
            <li key={i.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                    {i.category} · {i.city} · {i.status}
                    {i.closes_at ? ` · closes ${new Date(i.closes_at).toLocaleDateString()}` : ""}
                  </div>
                  <h3 className="mt-1 font-semibold">{i.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {i.description}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => {
                      setCreating(false);
                      setEditing(i);
                    }}
                    className="rounded-md border border-border px-3 py-1 text-xs hover:bg-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(i.id)}
                    className="rounded-md border border-border px-3 py-1 text-xs text-accent hover:bg-secondary"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IssueForm({
  token,
  initial,
  onClose,
  onSaved,
}: {
  token: string;
  initial: Issue | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "General");
  const [status, setStatus] = useState(initial?.status ?? "open");
  const [city, setCity] = useState(initial?.city ?? "Fargo");
  const [impactStatus, setImpactStatus] = useState(initial?.impact_status ?? "none");
  const [impactNote, setImpactNote] = useState(initial?.impact_note ?? "");
  const [closesAt, setClosesAt] = useState(
    initial?.closes_at ? new Date(initial.closes_at).toISOString().slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (initial) {
        await adminUpdateIssue({
          data: {
            token,
            id: initial.id,
            title,
            description,
            category,
            status,
            city,
            impact_status: impactStatus,
            impact_note: impactNote,
            closes_at: closesAt || null,
          },
        });
      } else {
        await adminCreateIssue({
          data: { token, title, description, category, city, closes_at: closesAt || null },
        });
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="mb-6 rounded-lg border border-border bg-card p-5"
    >
      <h3 className="font-semibold">{initial ? "Edit issue" : "New issue"}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
          Voting closes on
          <input
            type="date"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="mt-1 block">Leave blank for no closing date (defaults to 30 days for new topics).</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          maxLength={140}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:col-span-2"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (e.g. Transportation)"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="Fargo">Fargo</option>
          <option value="West Fargo">West Fargo</option>
          <option value="Moorhead">Moorhead</option>
        </select>
        {initial && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="open">open</option>
            <option value="closed">closed</option>
            <option value="archived">archived</option>
          </select>
        )}
        {initial && (
          <>
            <select
              value={impactStatus ?? "none"}
              onChange={(e) => setImpactStatus(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
            >
              <option value="none">Impact: ⏳ No update</option>
              <option value="discussing">Impact: 🔵 Being discussed</option>
              <option value="under_review">Impact: 🟡 Under review</option>
              <option value="implemented">Impact: 🟢 Implemented</option>
            </select>
            <input
              value={impactNote ?? ""}
              onChange={(e) => setImpactNote(e.target.value)}
              placeholder='Impact note (e.g. "Presented to city council on Aug 12")'
              maxLength={280}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
            />
          </>
        )}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue, what's being proposed, and the context."
          required
          rows={5}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:col-span-2"
        />
      </div>
      {err && <p className="mt-2 text-sm text-accent">{err}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Create issue"}
        </button>
      </div>
    </form>
  );
}
