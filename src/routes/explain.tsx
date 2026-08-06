import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { explainPolicy, type PolicyExplanation } from "@/lib/explain.functions";

export const Route = createFileRoute("/explain")({
  head: () => {
    const title = "AI Policy Summaries — Youth Voice";
    const description =
      "Paste or upload a city council agenda and get a 30-second, high-school-level explanation with pros, cons, and who it affects.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        {
          property: "og:image",
          content: "https://youthvoiceapp.lovable.app/youth-voice-og.png",
        },
        {
          name: "twitter:image",
          content: "https://youthvoiceapp.lovable.app/youth-voice-og.png",
        },
      ],
      links: [
        { rel: "canonical", href: "https://youthvoiceapp.lovable.app/explain" },
      ],
    };
  },
  component: ExplainPage,
});

const MAX_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function ExplainPage() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolicyExplanation | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (file && file.size > MAX_BYTES) {
      setError("That file is larger than 8 MB. Try a smaller PDF or paste the text.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload: {
        text?: string;
        file?: { name: string; mimeType: string; dataBase64: string };
      } = {};
      if (text.trim()) payload.text = text.trim();
      if (file) {
        payload.file = {
          name: file.name,
          mimeType: file.type || "application/pdf",
          dataBase64: await fileToBase64(file),
        };
      }
      setResult(await explainPolicy({ data: payload }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          AI Policy Summaries
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Understand a council agenda in 30 seconds
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          City documents are written for lawyers, not students. Paste the text or
          upload the PDF and get a plain-English breakdown — what it does, the pros,
          the cons, and who it actually affects.
        </p>

        <form
          onSubmit={run}
          className="mt-8 rounded-2xl border border-border bg-card p-5"
        >
          <label htmlFor="policy-text" className="text-sm font-semibold">
            Paste the agenda item or proposal
          </label>
          <textarea
            id="policy-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste text from a city council agenda, ordinance, or school board proposal…"
            className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="mt-4">
            <label htmlFor="policy-file" className="text-sm font-semibold">
              …or upload a document (PDF or image, max 8 MB)
            </label>
            <input
              id="policy-file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
            />
            {file && (
              <p className="mt-1 text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Anonymous — nothing you upload is saved.
            </p>
            <button
              type="submit"
              disabled={loading || (!text.trim() && !file)}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-50"
            >
              {loading ? "Reading it…" : "Explain it to me"}
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            {error}
          </p>
        )}

        {loading && (
          <p className="mt-6 text-sm text-muted-foreground">
            Breaking down the document… this usually takes a few seconds.
          </p>
        )}

        {result && (
          <section className="mt-8 space-y-5">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-5">
              <h2 className="font-display text-2xl font-bold leading-tight">
                {result.title}
              </h2>
              {result.tldr && (
                <p className="mt-2 text-base leading-relaxed">{result.tldr}</p>
              )}
            </div>

            {result.plainEnglish.length > 0 && (
              <Card title="What it actually does">
                <ul className="space-y-2">
                  {result.plainEnglish.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed">
                      <span className="text-primary">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              {result.pros.length > 0 && (
                <Card title="👍 Arguments for">
                  <ul className="space-y-2">
                    {result.pros.map((p, i) => (
                      <li key={i} className="text-sm leading-relaxed">
                        • {p}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {result.cons.length > 0 && (
                <Card title="👎 Arguments against">
                  <ul className="space-y-2">
                    {result.cons.map((c, i) => (
                      <li key={i} className="text-sm leading-relaxed">
                        • {c}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {result.affected.length > 0 && (
              <Card title="Who is affected">
                <ul className="space-y-3">
                  {result.affected.map((a, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      <span className="font-semibold">{a.group}</span> — {a.how}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {result.whatYouCanDo.length > 0 && (
              <Card title="What you can do">
                <ul className="space-y-2">
                  {result.whatYouCanDo.map((w, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      • {w}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <p className="text-xs text-muted-foreground">
              AI-generated and neutral by design. Always check the original document
              before quoting it.
            </p>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
