import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getDeviceId } from "@/lib/device-id";
import { ShareButton } from "@/components/share-button";
import { ImpactBadge } from "@/components/impact-badge";
import { generateIssueSummary } from "@/lib/summary.functions";
import { coachComment, type CoachFeedback } from "@/lib/coach.functions";
import { getClosingInfo, formatCloseDate } from "@/lib/closing";


type Stance = "agree" | "disagree" | "neutral";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  impact_status?: string | null;
  impact_note?: string | null;
  status?: string | null;
  closes_at?: string | null;
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
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("issues")
      .select("id, title, description")
      .eq("id", params.id)
      .maybeSingle();
    return { issue: data as { id: string; title: string; description: string } | null };
  },
  head: ({ params, loaderData }) => {
    const title = loaderData?.issue?.title ?? "City issue";
    const shortTitle =
      title.length > 50 ? title.slice(0, 47) + "…" : title;
    const pageTitle = `${shortTitle} — Youth Voice`;
    const desc =
      loaderData?.issue?.description?.slice(0, 155) ??
      "Cast your vote and join the structured debate. Your voice goes straight to the city council.";
    const url = `https://youthvoiceapp.lovable.app/issue/${params.id}`;
    return {
      meta: [
        { title: pageTitle.slice(0, 60) },
        { name: "description", content: desc },
        { property: "og:title", content: pageTitle.slice(0, 60) },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: loaderData?.issue
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "DiscussionForumPosting",
                headline: loaderData.issue.title,
                articleBody: loaderData.issue.description,
                url,
              }),
            },
          ]
        : [],
    };
  },
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

  const myVoteKey = `civicvoice_vote_${id}`;

  const reload = useCallback(async () => {
    const [{ data: iss }, { data: votes }, { data: cmts }] = await Promise.all([
      supabase.from("issues").select("*").eq("id", id).maybeSingle(),
      supabase.from("votes").select("choice").eq("issue_id", id),
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
    (votes ?? []).forEach((v: { choice: string }) => {
      t[v.choice as Stance] += 1;
      t.total += 1;
    });
    setTally(t);
    const localMine =
      typeof window !== "undefined"
        ? (localStorage.getItem(myVoteKey) as Stance | null)
        : null;
    setMyVote(localMine);
    setComments((cmts ?? []) as Comment[]);
    setLoading(false);
  }, [id, myVoteKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function castVote(choice: Stance) {
    if (getClosingInfo(issue?.closes_at, issue?.status).closed) return;
    setMyVote(choice);
    if (typeof window !== "undefined") localStorage.setItem(myVoteKey, choice);
    const { castVote: castVoteFn } = await import("@/lib/votes.functions");
    await castVoteFn({ data: { issueId: id, deviceId, choice } });
    const { awardImpact } = await import("@/lib/impact.functions");
    awardImpact({ data: { deviceId, action: "vote", refType: "issue", refId: id } }).catch(() => {});
    reload();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!composerBody.trim()) return;
    setPosting(true);
    const body = composerBody.trim();
    const { data: inserted } = await supabase.from("comments").insert({
      issue_id: id,
      device_id: deviceId,
      display_name: composerName.trim() || "Anonymous",
      stance: composerStance,
      body,
    }).select("id").maybeSingle();
    const { awardImpact } = await import("@/lib/impact.functions");
    const action = body.length >= 80 ? "constructive_comment" : "comment";
    awardImpact({
      data: { deviceId, action, refType: "comment", refId: inserted?.id ?? `${id}:${Date.now()}` },
    }).catch(() => {});
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

  const closing = getClosingInfo(issue.closes_at, issue.status);
  const closeDate = formatCloseDate(issue.closes_at);

  const pct = (n: number) => (tally.total === 0 ? 0 : Math.round((n / tally.total) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← All issues
        </Link>

        <article className="mt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <span>{issue.category}</span>
            <ImpactBadge status={issue.impact_status} />
            {closing.label && (
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal",
                  closing.closed
                    ? "bg-muted text-muted-foreground"
                    : closing.urgent
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-foreground",
                ].join(" ")}
              >
                {closing.closed ? "🔒" : "⏳"} {closing.label}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            {issue.title}
          </h1>
          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {issue.description}
          </p>
          {issue.impact_status && issue.impact_status !== "none" && (
            <div className="mt-4 rounded-lg border border-border bg-secondary p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>📢 You Said → We Did</span>
                <ImpactBadge status={issue.impact_status} />
              </div>
              {issue.impact_note && (
                <p className="mt-2 text-sm text-foreground/80">
                  {issue.impact_note}
                </p>
              )}
            </div>
          )}
        </article>

        <AiSummarySection issueId={issue.id} commentCount={comments.length} />

        {/* Poll */}
        <section className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">
            {closing.closed ? "Final results" : "Cast your vote"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {closing.closed
              ? `Voting closed${closeDate ? ` on ${closeDate}` : ""}. These results are being shared with city leaders.`
              : `One vote per person. You can change your mind any time.${closeDate ? ` Voting closes ${closeDate}.` : ""}`}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["agree", "disagree", "neutral"] as Stance[]).map((s) => {
              const active = myVote === s;
              return (
                <button
                  key={s}
                  onClick={() => castVote(s)}
                  disabled={closing.closed}
                  className={[
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    closing.closed ? "cursor-not-allowed opacity-50" : "",
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
                text="Vote and debate on this city issue on Youth Voice."
                url={`https://youthvoiceapp.lovable.app/issue/${issue.id}`}
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
            <label htmlFor="composer-name" className="sr-only">
              Display name (optional)
            </label>
            <input
              id="composer-name"
              value={composerName}
              onChange={(e) => setComposerName(e.target.value)}
              placeholder="Display name (optional)"
              aria-label="Display name (optional)"
              maxLength={40}
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <label htmlFor="composer-body" className="sr-only">
              Share your argument
            </label>
            <textarea
              id="composer-body"
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              placeholder="Share your argument…"
              aria-label="Share your argument"
              maxLength={1000}
              rows={3}
              className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <DebateCoach
              draft={composerBody}
              stance={composerStance}
              issueTitle={issue.title}
              onUseRewrite={(t) => setComposerBody(t)}
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

function AiSummarySection({
  issueId,
  commentCount,
}: {
  issueId: string;
  commentCount: number;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (commentCount < 3) return null;

  async function generate() {
    setLoading(true);
    setError(null);
    setReason(null);
    try {
      const res = await generateIssueSummary({ data: { issueId } });
      setSummary(res.summary);
      setReason(res.reason);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span>✨</span> What Youth Voice users think
        </h2>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading
            ? "Summarizing…"
            : summary
              ? "Regenerate"
              : "Generate AI summary"}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        AI-generated overview of the debate. Neutral, no accounts involved.
      </p>
      {!summary && !loading && !error && !reason && (
        <p className="mt-3 text-sm text-muted-foreground">
          Click generate to see the main opinions, common concerns, and key
          arguments from the community.
        </p>
      )}
      {reason && (
        <p className="mt-3 text-sm text-muted-foreground">{reason}</p>
      )}
      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
      {summary && (
        <div className="prose prose-sm mt-4 max-w-none whitespace-pre-line text-sm leading-relaxed text-foreground">
          {summary}
        </div>
      )}
    </section>
  );
}

function DebateCoach({
  draft,
  stance,
  issueTitle,
  onUseRewrite,
}: {
  draft: string;
  stance: Stance;
  issueTitle: string;
  onUseRewrite: (text: string) => void;
}) {
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await coachComment({
        data: { draft, stance, issueTitle },
      });
      setFeedback(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const toneLabel: Record<CoachFeedback["tone"], string> = {
    respectful: "Respectful tone 👍",
    "needs-work": "Tone could be softer",
    harsh: "Tone reads harsh",
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-secondary/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">🧠 AI Debate Coach</p>
          <p className="text-xs text-muted-foreground">
            Get evidence tips, fallacy checks, and a respect check before you post.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading || draft.trim().length < 15}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {loading ? "Checking…" : feedback ? "Check again" : "Check my argument"}
        </button>
      </div>

      {draft.trim().length < 15 && !feedback && (
        <p className="mt-2 text-xs text-muted-foreground">
          Write a sentence or two first, then run the coach.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}

      {feedback && (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
              Clarity {feedback.score}/10
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
              {toneLabel[feedback.tone]}
            </span>
          </div>

          {feedback.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What works
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {feedback.evidence.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stronger evidence
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {feedback.evidence.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Logic check
            </p>
            {feedback.fallacies.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No logical fallacies spotted. Nice.
              </p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {feedback.fallacies.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium">{f.name}</span> — {f.why}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {feedback.respect.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Respectful language
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {feedback.respect.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {feedback.rewrite && (
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Suggested stronger version
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                {feedback.rewrite}
              </p>
              <button
                type="button"
                onClick={() => onUseRewrite(feedback.rewrite)}
                className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                Use this version
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Coaching only — the AI never changes your stance or posts for you.
          </p>
        </div>
      )}
    </div>
  );
}



// Silence unused import warning in environments where notFound isn't used.
void notFound;
