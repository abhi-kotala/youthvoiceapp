import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const URL = "https://youthvoiceapp.lovable.app/guide/get-involved";

export const Route = createFileRoute("/guide/get-involved")({
  head: () => ({
    meta: [
      { title: "How to get involved in local government as a teen" },
      {
        name: "description",
        content:
          "A practical guide for teens: contact city council, attend public meetings, and make your voice heard through Youth Voice.",
      },
      {
        property: "og:title",
        content: "How to get involved in local government as a teen",
      },
      {
        property: "og:description",
        content:
          "A practical guide for teens: contact city council, attend public meetings, and make your voice heard.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to get involved in local government as a teen",
          url: URL,
        }),
      },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Guide
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight">
          How to get involved in local government as a teen
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          You don't have to wait until you're 18 to shape your city. Here are
          five concrete ways students in Fargo, West Fargo, and Moorhead can
          be part of the decisions that affect their schools, streets, and
          neighborhoods — starting this week.
        </p>

        <section className="mt-10 space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold">1. Read the agenda</h2>
            <p className="mt-2">
              Every city council posts its agenda online a few days before
              the meeting. Skim it, pick one item you care about, and read
              the background packet. That alone puts you ahead of most
              adults in the room.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">2. Attend a public meeting</h2>
            <p className="mt-2">
              City council and school board meetings are open to everyone,
              including under-18 residents. You don't need to speak — just
              showing up teaches you how decisions actually get made.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">3. Email your council member</h2>
            <p className="mt-2">
              Keep it short: who you are, what issue, what you want them to
              do. Council members read constituent email — even from
              constituents who can't vote yet.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">4. Use Youth Voice</h2>
            <p className="mt-2">
              Vote on the active polls and add your argument to the debate.
              We share the aggregated, nonpartisan results with local
              officials so the under-18 perspective actually lands on their
              desks.{" "}
              <Link to="/" className="text-accent underline">
                See the active polls →
              </Link>
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">5. Bring a friend</h2>
            <p className="mt-2">
              A single teen at a council meeting is a novelty. Five is a
              constituency. Civic power is a team sport — organize your
              friends.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
