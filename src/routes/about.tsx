import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CivicVoice — For city officials" },
      {
        name: "description",
        content:
          "CivicVoice is a nonpartisan platform that gives under-18 residents of Fargo and West Fargo a way to weigh in on local issues. Built for city officials to hear from the next generation of voters.",
      },
      { property: "og:title", content: "About CivicVoice — For city officials" },
      {
        property: "og:description",
        content:
          "How the CivicVoice under-18 poll works, and how results reach the city council and mayor's office.",
      },
      { property: "og:url", content: "https://city-voice-forum.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://city-voice-forum.lovable.app/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          For city officials
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight">
          A voice for the residents who can't vote yet.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          CivicVoice is a nonpartisan community poll built by a Fargo/West
          Fargo high schooler. It gives under-18 residents a structured way
          to weigh in on the local issues shaping their city — and delivers
          those results directly to the officials making the decisions.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">How it works</h2>
          <ol className="mt-3 space-y-3 text-sm leading-relaxed">
            <li>
              <span className="font-semibold">1. Real local issues.</span>{" "}
              Each poll is a real question currently in front of the Fargo or
              West Fargo city council — bike lanes, tax incentives, public
              safety funding, and more.
            </li>
            <li>
              <span className="font-semibold">2. Anonymous, one-per-device.</span>{" "}
              No accounts. Every device gets one vote to keep results honest
              while removing sign-up friction for teens.
            </li>
            <li>
              <span className="font-semibold">3. Structured debate.</span>{" "}
              Every comment is tagged Agree, Disagree, or Neutral so
              officials can read the actual reasoning — not just a number.
            </li>
            <li>
              <span className="font-semibold">4. Shareable results reports.</span>{" "}
              Every poll has a clean, printable results page ready to
              forward, screenshot, or hand to council members.
            </li>
            <li>
              <span className="font-semibold">5. Community moderation.</span>{" "}
              Users flag inappropriate comments; the site owner reviews and
              hides them from a moderation dashboard.
            </li>
          </ol>
        </section>

        <section className="mt-10 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Why under-18?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Roughly 22% of Fargo's population is under 18. They can't vote,
            but they ride the buses, walk the sidewalks, and live under
            every policy passed today. CivicVoice makes their input
            legible and easy to consider alongside the rest of the public
            record.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">What we ask of officials</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Treat this as one more input alongside public comment, surveys,
            and constituent email — not a binding vote. When a poll closes,
            we share a results report with the relevant council members and
            the mayor's office.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            View current polls
          </Link>
          <a
            href="mailto:abhi.kotala561@gmail.com"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Contact the creator
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
