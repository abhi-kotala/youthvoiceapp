import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ShareButton, CopyLinkButton } from "@/components/share-button";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
};

type Stance = "agree" | "disagree" | "neutral";

export const Route = createFileRoute("/results/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("issues")
      .select("id, title")
      .eq("id", params.id)
      .maybeSingle();
    return { issue: data as { id: string; title: string } | null };
  },
  head: ({ params, loaderData }) => {
    const base = loaderData?.issue?.title ?? "Poll results";
    const short = base.length > 45 ? base.slice(0, 42) + "…" : base;
    const pageTitle = `Results: ${short} — Youth Voice`.slice(0, 60);
    const desc =
      "See how the community voted and read the debate. Results shared with the city council and mayor.";
    const url = `https://youthvoiceapp.lovable.app/results/${params.id}`;
    return {
      meta: [
        { title: pageTitle },
        { name: "description", content: desc },
        { property: "og:title", content: pageTitle },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ResultsPage,
});

const LABEL: Record<Stance, string> = {
  agree: "Agree",
  disagree: "Disagree",
  neutral: "Neutral",
};

const COLOR: Record<Stance, string> = {
  agree: "oklch(0.45 0.15 155)",
  disagree: "oklch(0.58 0.18 28)",
  neutral: "oklch(0.6 0.03 258)",
};

function ResultsPage() {
  const { id } = Route.useParams();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [tally, setTally] = useState({ agree: 0, disagree: 0, neutral: 0, total: 0 });
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: iss }, { data: votes }, { count }] = await Promise.all([
        supabase.from("issues").select("*").eq("id", id).maybeSingle(),
        supabase.from("votes").select("choice").eq("issue_id", id),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("issue_id", id)
          .eq("hidden", false),
      ]);
      setIssue((iss as Issue) ?? null);
      const t = { agree: 0, disagree: 0, neutral: 0, total: 0 };
      (votes ?? []).forEach((v: { choice: string }) => {
        t[v.choice as Stance] += 1;
        t.total += 1;
      });
      setTally(t);
      setCommentCount(count ?? 0);
      setLoading(false);
    })();
  }, [id]);

  const pct = (n: number) => (tally.total === 0 ? 0 : Math.round((n / tally.total) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← All issues
        </Link>

        {loading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : !issue ? (
          <p className="mt-6">Issue not found.</p>
        ) : (
          <>
            <header className="mt-3 border-b border-border pb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Results report · {issue.category}
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight">
                {issue.title}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Prepared for the city council and mayor's office · Generated{" "}
                {new Date().toLocaleDateString()}
              </p>
            </header>

            <section className="mt-8">
              <h2 className="text-lg font-semibold">Summary</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {tally.total} young residents (under voting age) participated
                in this poll. {commentCount} contributed to the public debate
                thread.
              </p>
            </section>

            <section className="mt-8 rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Vote breakdown</h2>
              <div className="mt-4 space-y-4">
                {(["agree", "disagree", "neutral"] as Stance[]).map((s) => (
                  <div key={s}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{LABEL[s]}</span>
                      <span>
                        <span className="font-semibold">{pct(tally[s])}%</span>{" "}
                        <span className="text-muted-foreground">
                          ({tally[s]} votes)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        style={{
                          width: `${pct(tally[s])}%`,
                          height: "100%",
                          background: COLOR[s],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Methodology: Open public poll. One vote per device, anonymous.
                Participants self-selected via shareable links distributed
                through high school networks.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-semibold">Issue description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {issue.description}
              </p>
            </section>

            <div className="mt-8 flex flex-wrap gap-3 print:hidden">
              <Link
                to="/issue/$id"
                params={{ id: issue.id }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                View debate thread
              </Link>
              <button
                onClick={() => window.print()}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium"
              >
                Print / Save as PDF
              </button>
              <ShareButton
                title={`Results: ${issue.title}`}
                text="See how the community voted on this city issue."
                url={`https://youthvoiceapp.lovable.app/results/${issue.id}`}
                variant="outline"
              />
              <CopyLinkButton
                url={`https://youthvoiceapp.lovable.app/results/${issue.id}`}
              />
            </div>

          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
