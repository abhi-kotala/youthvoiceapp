import type { PublishedResult } from "@/lib/insights.functions";

const ROWS = [
  { key: "agree", label: "Agree", cls: "bg-primary" },
  { key: "neutral", label: "Neutral", cls: "bg-muted-foreground" },
  { key: "disagree", label: "Disagree", cls: "bg-accent" },
] as const;

export function ResultBars({ result, open, title, city }: { result: PublishedResult; open: boolean; title: string; city: string }) {
  if (!result.published) {
    return <p className="mt-2 text-xs text-muted-foreground">Not enough responses yet — results stay hidden to protect small groups.</p>;
  }
  const pct = (n: number) => Math.round((n / result.total) * 100);
  const alt = `${title} (${city}): ${ROWS.map((r) => `${r.label} ${pct(result[r.key])}% (${result[r.key]})`).join(", ")}. ${result.total} responses, ${open ? "live" : "final"} results.`;
  return (
    <figure className="mt-3" aria-label={alt}>
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`rounded-full border px-2 py-0.5 font-semibold ${open ? "border-primary/40 text-primary" : "border-border"}`}>{open ? "Live" : "Final"}</span>
        <span>{result.total} responses</span>
      </div>
      <div className="grid gap-1.5" aria-hidden>
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-muted-foreground">{r.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full ${r.cls}`} style={{ width: `${pct(result[r.key])}%` }} />
            </div>
            <span className="w-16 text-right tabular-nums">{pct(result[r.key])}% ({result[r.key]})</span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );
}
