import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { listToolkit } from "@/lib/partners.functions";

const q = () => queryOptions({ queryKey: ["toolkit"], queryFn: () => listToolkit() });

export const Route = createFileRoute("/partners/toolkit")({
  head: () => ({
    meta: [
      { title: "YouthVoice partner toolkit" },
      { name: "description", content: "Guides for running a YouthVoice pilot: checklists, poll-writing tips, privacy, a 30-day plan and a results meeting agenda." },
      { property: "og:title", content: "YouthVoice partner toolkit" },
      { property: "og:description", content: "Printable guides for communities running youth civic polls." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(q()); },
  component: Toolkit,
});

/** Tiny safe renderer: bold (**x**), bullet lines, paragraphs. No HTML injection. */
function Body({ text }: { text: string }) {
  const blocks = text.split(/\n(?=- )|\n\n/);
  const lines = text.split("\n");
  const bullets = lines.every((l) => l.startsWith("- "));
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((p, i) => p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p);
  if (bullets) return <ul className="list-disc space-y-1 pl-5">{lines.map((l, i) => <li key={i}>{inline(l.slice(2))}</li>)}</ul>;
  void blocks;
  return <>{lines.map((l, i) => <p key={i} className="mt-1">{inline(l.replace(/^- /, "• "))}</p>)}</>;
}

function Toolkit() {
  const { data } = useSuspenseQuery(q());
  return (
    <div className="min-h-screen">
      <div className="print:hidden"><SiteHeader /></div>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold">Partner toolkit</h1>
            <p className="mt-2 text-sm text-muted-foreground">Every community sets its own local process. These guides are starting points, not requirements.</p>
          </div>
          <Button variant="outline" className="print:hidden" onClick={() => window.print()}>Print</Button>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2 print:hidden">
          {data.pages.map((p) => <a key={p.slug} href={`#${p.slug}`} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary">{p.title}</a>)}
        </nav>
        {data.pages.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No guides yet.</p>}
        {data.pages.map((p) => (
          <section key={p.slug} id={p.slug} className="mt-8 break-inside-avoid rounded-2xl border border-border p-5 text-sm leading-relaxed">
            <h2 className="font-display text-xl font-bold">{p.title}</h2>
            <div className="mt-2"><Body text={p.body} /></div>
          </section>
        ))}
      </main>
      <div className="print:hidden"><SiteFooter /></div>
    </div>
  );
}
