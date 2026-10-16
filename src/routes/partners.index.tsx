import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { listPublicPartners, listImpactStories } from "@/lib/partners.functions";

const partnersQ = () => queryOptions({ queryKey: ["public-partners"], queryFn: () => listPublicPartners() });
const storiesQ = () => queryOptions({ queryKey: ["impact-stories", "all"], queryFn: () => listImpactStories({ data: {} }) });

export const Route = createFileRoute("/partners/")({
  head: () => ({
    meta: [
      { title: "Partner with YouthVoice — youth input for local decisions" },
      { name: "description", content: "How cities, youth councils, schools and nonprofits can use YouthVoice to gather privacy-protected youth perspectives on local issues." },
      { property: "og:title", content: "Partner with YouthVoice" },
      { property: "og:description", content: "Bring privacy-protected youth civic polls to your community. Apply or request a demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(partnersQ()); context.queryClient.ensureQueryData(storiesQ()); },
  component: PartnersPage,
});

const BENEFITS = [
  ["Youth councils & advisory boards", "Hear from more young people than can attend a meeting, and bring their totals to your agenda."],
  ["Local governments", "Get a privacy-protected read on how young residents see an issue before or during public discussion."],
  ["Schools & educators", "Turn real local questions into civics practice with moderated, respectful debate."],
  ["Nonprofits & civic groups", "Learn which issues young people care about to shape programs and service projects."],
];

function PartnersPage() {
  const { data: p } = useSuspenseQuery(partnersQ());
  const { data: s } = useSuspenseQuery(storiesQ());
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs uppercase tracking-[0.22em] text-primary/80">Partnerships</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Give young people a real say in local decisions</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Most young people can't vote, and few can make it to a council meeting. YouthVoice gives them short, neutral civic polls about real local issues, plus moderated debate. Communities get privacy-protected totals they can bring into their own conversations.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link to="/request-city">Apply for a partnership</Link></Button>
          <Button asChild variant="secondary"><Link to="/partners/demo">Request a demo</Link></Button>
          <Button asChild variant="outline"><Link to="/partners/toolkit">Partner toolkit</Link></Button>
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[["1. Ask", "A partner and YouthVoice agree on a few neutral local questions."], ["2. Share", "Young people vote anonymously and discuss respectfully, with no account needed."], ["3. Review", "Totals are published once enough people respond, then reviewed together with the partner."]].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-card/60 p-5"><h3 className="font-display text-lg font-bold">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">Who it's for</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map(([t, d]) => <div key={t} className="rounded-xl border border-border p-4"><div className="font-semibold">{t}</div><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Results inform conversations. They aren't binding votes, and voluntary respondents don't represent every young person in a community.</p>
        </section>

        <section className="mt-14 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-display text-2xl font-bold">Privacy and safety</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Anonymous voting. Accounts are optional and only for ages 13+.</li>
            <li>Results stay hidden until a poll reaches a minimum number of responses.</li>
            <li>Partners never see individual votes, identities or device data.</li>
            <li>Topics and comments are moderated. AI only suggests drafts, and people approve them.</li>
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">Current verified partners</h2>
          {p.partners.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">There are no verified partners yet. West Fargo is a <b>Pilot</b> community used for testing, which is not an official partnership. Fargo and Moorhead are <b>Not Yet Participating</b>.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">{p.partners.map((x) => <li key={x.id} className="rounded-xl border border-border p-3 text-sm font-semibold">{x.name}{x.state_code ? `, ${x.state_code}` : ""}</li>)}</ul>
          )}
          <Link to="/partners/directory" className="mt-3 inline-block text-sm text-primary underline">Open the partner directory</Link>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">Documented outcomes</h2>
          {s.stories.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No reviewed outcomes have been published yet.</p> : (
            <ul className="mt-3 grid gap-3">{s.stories.map((x) => (
              <li key={x.id} className="rounded-xl border border-border p-4 text-sm">
                <div className="text-xs text-muted-foreground">{x.communities?.name}, {x.communities?.state_code} · {x.occurred_on} · {x.status === "verified" ? "Verified" : "Reviewed"}</div>
                <p className="mt-1">{x.description}</p>
                {x.evidence_url && <a href={x.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Source</a>}
              </li>
            ))}</ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
