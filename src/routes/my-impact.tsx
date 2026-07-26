import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ImpactProgressCard } from "@/components/impact-progress-card";
import { POINTS } from "@/lib/impact";

export const Route = createFileRoute("/my-impact")({
  component: MyImpactPage,
  head: () => ({
    meta: [
      { title: "My Civic Impact — Youth Voice" },
      {
        name: "description",
        content:
          "Track your Civic Impact Points, level, and badges. Earn points anonymously by voting, commenting, and shaping community decisions.",
      },
      { property: "og:title", content: "My Civic Impact — Youth Voice" },
      {
        property: "og:description",
        content: "Anonymous impact tracking for youth civic participation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const HOW = [
  { emoji: "🗳", label: "Vote on an issue", pts: POINTS.vote },
  { emoji: "💬", label: "Post a comment", pts: POINTS.comment },
  { emoji: "💡", label: "Submit a community idea", pts: POINTS.idea_submitted },
  { emoji: "📈", label: "Idea reaches 100 votes", pts: POINTS.idea_100_votes },
  { emoji: "🏛", label: "Official reviews your idea", pts: POINTS.idea_reviewed },
  { emoji: "✅", label: "Idea gets implemented", pts: POINTS.idea_implemented },
];

function MyImpactPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Civic Impact</h1>
          <p className="mt-2 text-muted-foreground">
            Anonymous, tied to this device. No account required — your voice still counts.
          </p>
        </div>

        <ImpactProgressCard />

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">How you earn points</h2>
          <ul className="mt-3 space-y-2">
            {HOW.map((h) => (
              <li
                key={h.label}
                className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{h.emoji}</span>
                  <span>{h.label}</span>
                </span>
                <span className="font-semibold text-primary">+{h.pts}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Points reward impact, not popularity. Duplicate actions (e.g. changing your vote) don't
            re-award.
          </p>
        </section>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90"
          >
            Browse issues to earn points
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
