import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import {
  adminLogin,
  adminVerify,
  adminLogout,
  adminListReports,
  adminSetCommentHidden,
  adminDismissReport,
  adminCreateIssue,
  adminUpdateIssue,
  adminDeleteIssue,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "civicvoice_admin_token";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  city: string;
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
  const [passcode, setPasscode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!saved) return;
    (async () => {
      try {
        await adminVerify({ data: { token: saved } });
        setToken(saved);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    })();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token: t } = await adminLogin({ data: { passcode } });
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      setPasscode("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const t = token;
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    if (t) {
      try {
        await adminLogout({ data: { token: t } });
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin</h1>
          {token && (
            <button
              onClick={logout}
              className="text-sm text-muted-foreground hover:underline"
            >
              Sign out
            </button>
          )}
        </div>

        {!token ? (
          <form onSubmit={login} className="mt-6 max-w-sm rounded-lg border border-border bg-card p-5">
            <label className="text-sm font-medium">Admin passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-accent">{error}</p>}
            <button
              type="submit"
              disabled={busy || !passcode}
              className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Checking…" : "Enter"}
            </button>
          </form>
        ) : (
          <AdminDashboard token={token} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function AdminDashboard({ token }: { token: string }) {
  const [tab, setTab] = useState<"reports" | "issues">("reports");
  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-border">
        {(["reports", "issues"] as const).map((t) => (
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
        {tab === "reports" ? (
          <ReportsPanel token={token} />
        ) : (
          <IssuesPanel token={token} />
        )}
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

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("issues")
      .select("id, title, description, category, status, city")
      .order("created_at", { ascending: false });
    setIssues((data ?? []) as Issue[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function remove(id: string) {
    if (!window.confirm("Delete this issue? All votes and comments will also be removed.")) return;
    await adminDeleteIssue({ data: { token, id } });
    reload();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
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
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (initial) {
        await adminUpdateIssue({
          data: { token, id: initial.id, title, description, category, status, city },
        });
      } else {
        await adminCreateIssue({ data: { token, title, description, category, city } });
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
