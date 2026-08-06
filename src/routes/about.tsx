import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Youth Voice — For city officials" },
      {
        name: "description",
        content:
          "Nonpartisan under-18 poll for Fargo, West Fargo, and Moorhead. Results delivered to city council and mayors.",
      },
      { property: "og:title", content: "About Youth Voice — For city officials" },
      {
        property: "og:description",
        content:
          "How the Youth Voice under-18 poll works, and how results reach the city council and mayor's office.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      { property: "og:url", content: "https://youthvoiceapp.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://youthvoiceapp.lovable.app/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Youth Voice",
          url: "https://youthvoiceapp.lovable.app/about",
          description:
            "Nonpartisan under-18 poll for Fargo, West Fargo, and Moorhead. Results delivered to city council and mayors.",
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          For city officials
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight">
          A voice for the residents who can't vote yet.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Youth Voice is a nonpartisan community poll built by a Fargo/West
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
            Young people aren't just the future of Fargo, West Fargo, and
            Moorhead — they're the future right now. They use the roads, attend
            the schools, work local jobs, and live with every decision city
            leaders make. Youth Voice exists to give them a real platform where
            their perspectives are heard, their ideas matter, and their input
            reaches the officials shaping the community they'll inherit.
          </p>
        </section>

        <section className="mt-10 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Start at my school</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Want to see Youth Voice in your school? It only takes one student
            to get it moving. Share the link in class chats, show it to your
            student council or government teacher, and encourage classmates to
            vote on the topics that affect them.
          </p>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              <span className="font-semibold">1.</span> Open Youth Voice on
              your phone.
            </li>
            <li>
              <span className="font-semibold">2.</span> Vote on one local
              topic and read the debate.
            </li>
            <li>
              <span className="font-semibold">3.</span> Share the link with
              friends, classmates, or a teacher.
            </li>
            <li>
              <span className="font-semibold">4.</span> Submit a topic that
              matters at your school or in your neighborhood.
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Submit a topic
            </Link>
            <Link
              to="/"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Browse topics
            </Link>
          </div>
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
