import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
};

type Tally = { agree: number; disagree: number; neutral: number; total: number };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicVoice — Where under-18s weigh in on city issues" },
      {
        name: "description",
        content:
          "Vote and debate on the political issues happening in our city. Results go straight to the council and mayor.",
      },
      { property: "og:title", content: "CivicVoice — Under-18 city polls" },
      {
        property: "og:description",
        content:
          "Can't vote yet? You can still be heard. Weigh in on the issues shaping our city.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tallies, setTallies] = useState<Record<string, Tally>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false });
      setIssues(rows ?? []);

      const { data: voteRows } = await supabase
        .from("votes")
        .select("issue_id, choice");
      const t: Record<string, Tally> = {};
      (voteRows ?? []).forEach((v: { issue_id: string; choice: string }) => {
        t[v.issue_id] ??= { agree: 0, disagree: 0, neutral: 0, total: 0 };
        t[v.issue_id][v.choice as keyof Omit<Tally, "total">] += 1;
        t[v.issue_id].total += 1;
      });
      setTallies(t);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            For people who can't vote yet
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            The issues happening in our city.
            <br />
            Make your voice count anyway.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Vote on real political proposals in our community, debate them in a
            structured thread, and we'll deliver the results to the city council
            and mayor.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="mb-4 text-xl font-semibold">Open issues</h2>

        {loading ? (
          <p className="text-muted-foreground">Loading issues…</p>
        ) : issues.length === 0 ? (
          <p className="text-muted-foreground">No issues yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {issues.map((i) => {
              const t = tallies[i.id] ?? { agree: 0, disagree: 0, neutral: 0, total: 0 };
              return (
                <li key={i.id}>
                  <Link
                    to="/issue/$id"
                    params={{ id: i.id }}
                    className="block h-full rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                      {i.category}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold leading-snug">
                      {i.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {i.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t.total} {t.total === 1 ? "vote" : "votes"}</span>
                      <span className="font-medium text-primary">Weigh in →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
