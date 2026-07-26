import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

type EventItem = {
  date: string; // ISO
  time?: string;
  title: string;
  city: "Fargo" | "West Fargo" | "Moorhead" | "Regional";
  location: string;
  description: string;
  link?: string;
};

const EVENTS: EventItem[] = [
  {
    date: "2026-08-03",
    time: "5:00 PM",
    title: "Fargo City Commission Meeting",
    city: "Fargo",
    location: "Fargo City Hall, 225 4th St N",
    description:
      "Regular commission meeting. Public comment period near the start — youth are welcome to attend and speak.",
    link: "https://fargond.gov/city-government/city-commission",
  },
  {
    date: "2026-08-10",
    time: "5:30 PM",
    title: "West Fargo City Commission Meeting",
    city: "West Fargo",
    location: "West Fargo City Hall, 800 4th Ave E",
    description:
      "Twice-monthly meeting covering ordinances, budget items, and public hearings.",
    link: "https://www.westfargond.gov/162/City-Commission",
  },
  {
    date: "2026-08-11",
    time: "6:00 PM",
    title: "Moorhead City Council Meeting",
    city: "Moorhead",
    location: "Moorhead City Hall, 500 Center Ave",
    description:
      "Council business meeting. Agendas are posted the Friday before.",
    link: "https://www.ci.moorhead.mn.us/government/mayor-city-council",
  },
  {
    date: "2026-08-17",
    time: "5:15 PM",
    title: "Fargo School Board Meeting",
    city: "Fargo",
    location: "Fargo Public Schools District Office",
    description:
      "Boundary changes, bond referendum updates, and student policy — directly affects students.",
  },
  {
    date: "2026-08-24",
    time: "5:00 PM",
    title: "Fargo Planning Commission",
    city: "Fargo",
    location: "Fargo City Hall",
    description:
      "Zoning, development approvals, and neighborhood plans. Where a lot of the tax-incentive debates start.",
  },
  {
    date: "2026-09-02",
    time: "All day",
    title: "National Voter Registration Day",
    city: "Regional",
    location: "Nationwide",
    description:
      "Turning 18 soon? Pre-register or register in ND/MN. Great day to help friends and family get set up.",
    link: "https://vote.gov",
  },
];

const CITY_STYLE: Record<EventItem["city"], string> = {
  Fargo: "bg-primary/10 text-primary",
  "West Fargo": "bg-accent/15 text-accent",
  Moorhead: "bg-secondary text-foreground",
  Regional: "bg-muted text-muted-foreground",
};

function fmt(dateISO: string) {
  const d = new Date(dateISO + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const Route = createFileRoute("/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter — Upcoming City Meetings & Civic Dates | Youth Voice" },
      {
        name: "description",
        content:
          "Upcoming Fargo, West Fargo, and Moorhead city commission meetings, school board dates, and civic deadlines that under-18s should know about.",
      },
      { property: "og:title", content: "Youth Voice Newsletter — Civic Dates" },
      {
        property: "og:description",
        content:
          "Stay informed: city commission meetings, school board dates, and civic deadlines in Fargo-Moorhead.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://youthvoiceapp.lovable.app/newsletter" },
      { property: "og:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
    ],
    links: [{ rel: "canonical", href: "https://youthvoiceapp.lovable.app/newsletter" }],
  }),
  component: NewsletterPage,
});

function NewsletterPage() {
  const now = new Date();
  const upcoming = EVENTS.filter((e) => new Date(e.date + "T23:59:59") >= now).sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            📰 Newsletter
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            What's happening in our cities
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Public meetings are where decisions get made — and most of them are
            open to anyone, including students. Here are the dates worth
            knowing for Fargo, West Fargo, and Moorhead.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Upcoming dates</h2>
          <ul className="space-y-4">
            {upcoming.map((e) => (
              <li
                key={e.date + e.title}
                className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CITY_STYLE[e.city]}`}
                      >
                        {e.city}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {fmt(e.date)}
                        {e.time ? ` · ${e.time}` : ""}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold leading-snug">
                      {e.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      📍 {e.location}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm">{e.description}</p>
                {e.link && (
                  <a
                    href={e.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Official info →
                  </a>
                )}
              </li>
            ))}
            {upcoming.length === 0 && (
              <li className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
                No upcoming dates listed right now. Check back soon.
              </li>
            )}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-border bg-secondary p-6">
          <h2 className="text-lg font-semibold">How to show up</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Meetings are public. You don't need to sign up — just walk in and
              sit down.
            </li>
            <li>
              Most commissions have a <strong>public comment</strong> period
              near the start. You get 2–3 minutes to speak.
            </li>
            <li>
              Can't attend? Agendas and video recordings are usually posted on
              each city's website.
            </li>
            <li>
              Want a topic added here? Message us on the{" "}
              <a href="/about" className="text-primary underline-offset-4 hover:underline">
                About page
              </a>
              .
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
