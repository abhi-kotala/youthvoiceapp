import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getDeviceId } from "@/lib/device-id";
import { ShareButton } from "@/components/share-button";

type Stance = "agree" | "disagree" | "neutral";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
};

type Comment = {
  id: string;
  display_name: string;
  stance: Stance;
  body: string;
  created_at: string;
};

const STANCE_LABEL: Record<Stance, string> = {
  agree: "Agree",
  disagree: "Disagree",
  neutral: "Neutral",
};

const STANCE_CLASSES: Record<Stance, string> = {
  agree: "bg-[oklch(0.45_0.15_155)] text-white",
  disagree: "bg-accent text-accent-foreground",
  neutral: "bg-muted text-foreground",
};

export const Route = createFileRoute("/issue/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Vote on this city issue — CivicVoice" },
      {
        name: "description",
        content:
          "Cast your vote and join the structured debate. Your voice goes straight to the city council.",
      },
      {
        property: "og:title",
        content: "Vote on this city issue — CivicVoice",
      },
      {
        property: "og:description",
        content:
          "Cast your vote and join the structured debate. Your voice goes straight to the city council.",
      },
      {
        property: "og:url",
        content: `https://city-voice-forum.lovable.app/issue/${params.id}`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `https://city-voice-forum.lovable.app/issue/${params.id}`,
      },
    ],
  }),
  component: IssuePage,
});

function IssuePage() {
  const { id } = Route.useParams();
  const deviceId = useMemo(() => getDeviceId(), []);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const [tally, setTally] = useState({ agree: 0, disagree: 0, neutral: 0, total: 0 });
  const [myVote, setMyVote] = useState<Stance | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [composerStance, setComposerStance] = useState<Stance>("agree");
  const [composerName, setComposerName] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [posting, setPosting] = useState(false);

  const reload = useCallback(async () => {
    const [{ data: iss }, { data: votes }, { data: cmts }] = await Promise.all([
      supabase.from("issues").select("*").eq("id", id).maybeSingle(),
      supabase.from("votes").select("choice, device_id").eq("issue_id", id),
      supabase
        .from("comments")
        .select("id, display_name, stance, body, created_at")
        .eq("issue_id", id)
        .eq("hidden", false)
        .order("created_at", { ascending: false }),
    ]);
    if (!iss) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setIssue(iss as Issue);
    const t = { agree: 0, disagree: 0, neutral: 0, total: 0 };
    let mine: Stance | null = null;
    (votes ?? []).forEach((v: { choice: string; device_id: string }) => {
      t[v.choice as Stance] += 1;
      t.total += 1;
      if (v.device_id === deviceId) mine = v.choice as Stance;
    });
    setTally(t);
    setMyVote(mine);
    setComments((cmts ?? []) as Comment[]);
    setLoading(false);
  }, [id, deviceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function castVote(choice: Stance) {
    setMyVote(choice);
    await supabase
      .from("votes")
      .upsert(
        { issue_id: id, device_id: deviceId, choice },
        { onConflict: "issue_id,device_id" }
      );
    reload();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!composerBody.trim()) return;
    setPosting(true);
    await supabase.from("comments").insert({
      issue_id: id,
      device_id: deviceId,
      display_name: composerName.trim() || "Anonymous",
      stance: composerStance,
      body: composerBody.trim(),
    });
    setComposerBody("");
    setPosting(false);
    reload();
  }

  async function report(commentId: string) {
    const reason = window.prompt("Why are you reporting this comment? (optional)") ?? "";
    await supabase
      .from("reports")
      .insert({ comment_id: commentId, device_id: deviceId, reason });
    alert("Reported. Thanks — a moderator will review it.");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">
          Loading…
        </main>
      </div>
    );
  }

  if (missing || !issue) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <p>Issue not found.</p>
          <Link to="/" className="text-primary underline">
            Back to all issues
          </Link>
        </main>
      </div>
    );
  }

  const pct = (n: number) => (tally.total === 0 ? 0 : Math.round((n / tally.total) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← All issues
        </Link>

        <article className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">
            {issue.category}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            {issue.title}
          </h1>
          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {issue.description}
          </p>
        </article>

        {/* Poll */}
        <section className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Cast your vote</h2>
          <p className="text-sm text-muted-foreground">
            One vote per person. You can change your mind any time.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["agree", "disagree", "neutral"] as Stance[]).map((s) => {
              const active = myVote === s;
              return (
                <button
                  key={s}
                  onClick={() => castVote(s)}
                  className={[
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    active
                      ? STANCE_CLASSES[s] + " border-transparent"
                      : "border-border bg-background hover:bg-secondary",
                  ].join(" ")}
                >
                  {STANCE_LABEL[s]}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-2">
            {(["agree", "disagree", "neutral"] as Stance[]).map((s) => (
              <div key={s}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{STANCE_LABEL[s]}</span>
                  <span className="text-muted-foreground">
                    {pct(tally[s])}% · {tally[s]}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={STANCE_CLASSES[s]}
                    style={{ width: `${pct(tally[s])}%`, height: "100%" }}
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <p className="text-xs text-muted-foreground">
                {tally.total} total {tally.total === 1 ? "vote" : "votes"}
              </p>
              <Link
                to="/results/$id"
                params={{ id: issue.id }}
                className="text-xs underline"
              >
                shareable results page
              </Link>
              <ShareButton
                title={issue.title}
                text="Vote and debate on this city issue on CivicVoice."
                url={`https://city-voice-forum.lovable.app/issue/${issue.id}`}
                variant="outline"
                className="text-xs px-3 py-1.5"
              />
            </div>
          </div>
        </section>

        {/* Debate */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Debate</h2>
          <p className="text-sm text-muted-foreground">
            Keep it civil. Attack arguments, not people. Reported comments are
            reviewed.
          </p>

          <form
            onSubmit={postComment}
            className="mt-4 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-wrap gap-2">
              {(["agree", "disagree", "neutral"] as Stance[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setComposerStance(s)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    composerStance === s
                      ? STANCE_CLASSES[s] + " border-transparent"
                      : "border-border bg-background",
                  ].join(" ")}
                >
                  {STANCE_LABEL[s]}
                </button>
              ))}
            </div>
            <input
              value={composerName}
              onChange={(e) => setComposerName(e.target.value)}
              placeholder="Display name (optional)"
              maxLength={40}
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              placeholder="Share your argument…"
              maxLength={1000}
              rows={3}
              className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {composerBody.length}/1000
              </span>
              <button
                type="submit"
                disabled={posting || !composerBody.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post comment"}
              </button>
            </div>
          </form>

          <ul className="mt-6 space-y-3">
            {comments.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No comments yet. Start the debate.
              </li>
            )}
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-semibold " +
                        STANCE_CLASSES[c.stance]
                      }
                    >
                      {STANCE_LABEL[c.stance]}
                    </span>
                    <span className="text-sm font-medium">{c.display_name}</span>
                  </div>
                  <button
                    onClick={() => report(c.id)}
                    className="text-xs text-muted-foreground hover:text-accent"
                    aria-label="Report comment"
                  >
                    Report
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                  {c.body}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// Silence unused import warning in environments where notFound isn't used.
void notFound;
