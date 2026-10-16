import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CityStatusBadge } from "@/components/city-status-badge";
import { listPublicPartners } from "@/lib/partners.functions";
import { ORG_TYPES } from "@/lib/community-requests.functions";
import { cityKey, type CityStatus } from "@/lib/cities";

const q = () => queryOptions({ queryKey: ["public-partners"], queryFn: () => listPublicPartners() });

export const Route = createFileRoute("/partners/directory")({
  head: () => ({
    meta: [
      { title: "YouthVoice partner directory" },
      { name: "description", content: "Verified YouthVoice partner organizations that have approved being listed publicly." },
      { property: "og:title", content: "YouthVoice partner directory" },
      { property: "og:description", content: "Only verified partners with approved public profiles are listed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(q()); },
  component: Directory,
});

function Directory() {
  const { data } = useSuspenseQuery(q());
  const [st, setSt] = useState(""); const [type, setType] = useState(""); const [status, setStatus] = useState("");
  const rows = data.partners.filter((p) => (!st || p.state_code === st) && (!type || p.org_type === type) && (!status || p.communities?.status === status));
  const sel = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-4xl font-extrabold">Partner directory</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only organizations whose partnership has been verified and who have approved a public profile are listed. Being contacted, applying, or meeting with us doesn't add an organization here.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <select className={sel} value={st} onChange={(e) => setSt(e.target.value)} aria-label="State"><option value="">All states</option>{[...new Set(data.partners.map((p) => p.state_code).filter(Boolean))].map((s) => <option key={s!}>{s}</option>)}</select>
          <select className={sel} value={type} onChange={(e) => setType(e.target.value)} aria-label="Organization type"><option value="">All types</option>{Object.entries(ORG_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">Any status</option><option value="official">Official Partner</option><option value="pilot">Pilot</option></select>
        </div>
        {rows.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No verified partners to show yet.</p> : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {rows.map((p) => (
              <li key={p.id} className="rounded-xl border border-border p-4 text-sm">
                <div className="flex items-start justify-between gap-2"><div className="font-semibold">{p.name}</div>{p.communities && <CityStatusBadge status={p.communities.status as CityStatus} />}</div>
                <div className="text-xs text-muted-foreground">{ORG_TYPES[p.org_type as keyof typeof ORG_TYPES] ?? "Organization"}{p.state_code ? ` · ${p.state_code}` : ""}</div>
                {p.public_description && <p className="mt-2">{p.public_description}</p>}
                <div className="mt-2 flex gap-3 text-xs">
                  {p.communities && <Link to="/cities/$key" params={{ key: cityKey(p.communities.slug, p.communities.state_code) }} className="text-primary underline">City page</Link>}
                  <a className="text-muted-foreground underline" href={`mailto:abhi.kotala561@gmail.com?subject=${encodeURIComponent(`Correction request: ${p.name}`)}`}>Request a correction</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
