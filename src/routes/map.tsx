import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import fargoImg from "@/assets/city-fargo.jpg";
import westFargoImg from "@/assets/city-west-fargo.jpg";
import moorheadImg from "@/assets/city-moorhead.jpg";

type CityStat = {
  city: string;
  image: string;
  votes: number;
  issues: number;
  topIssue: { id: string; title: string; votes: number } | null;
};

const CITY_META: { name: string; image: string; blurb: string }[] = [
  { name: "Fargo", image: fargoImg, blurb: "North Dakota" },
  { name: "West Fargo", image: westFargoImg, blurb: "North Dakota" },
  { name: "Moorhead", image: moorheadImg, blurb: "Minnesota" },
];

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "YouthVoice Map — See where young voices are heard" },
      {
        name: "description",
        content:
          "See which Fargo-Moorhead cities are using Youth Voice, how many under-18 votes have been cast, and each city's most popular issue.",
      },
      { property: "og:title", content: "YouthVoice Map — Fargo, West Fargo, Moorhead" },
      {
        property: "og:description",
        content:
          "Cities using Youth Voice, total votes, and the most popular local issue in each community.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [stats, setStats] = useState<CityStat[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: issues }, { data: votes }] = await Promise.all([
        supabase.from("issues").select("id, title, city"),
        supabase.from("votes").select("issue_id"),
      ]);

      const votesByIssue = new Map<string, number>();
      (votes ?? []).forEach((v) => {
        votesByIssue.set(v.issue_id, (votesByIssue.get(v.issue_id) ?? 0) + 1);
      });

      const byCity = new Map<
        string,
        { votes: number; issues: number; top: { id: string; title: string; votes: number } | null }
      >();
      (issues ?? []).forEach((i) => {
        const v = votesByIssue.get(i.id) ?? 0;
        const cur = byCity.get(i.city) ?? { votes: 0, issues: 0, top: null };
        cur.votes += v;
        cur.issues += 1;
        if (!cur.top || v > cur.top.votes) {
          cur.top = { id: i.id, title: i.title, votes: v };
        }
        byCity.set(i.city, cur);
      });

      const result: CityStat[] = CITY_META.map((c) => {
        const s = byCity.get(c.name);
        return {
          city: c.name,
          image: c.image,
          votes: s?.votes ?? 0,
          issues: s?.issues ?? 0,
          topIssue: s?.top ?? null,
        };
      });
      setStats(result);
    })();
  }, []);

  const totalVotes = stats?.reduce((a, b) => a + b.votes, 0) ?? 0;
  const totalIssues = stats?.reduce((a, b) => a + b.issues, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            📍 YouthVoice Map
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Where young voices are heard
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Cities using Youth Voice today and the total votes cast by young
            people in each community.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Cities active" value={stats?.filter((s) => s.issues > 0).length ?? 0} />
          <StatCard label="Youth votes" value={totalVotes} />
          <StatCard label="Live issues" value={totalIssues} />
        </div>

        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(stats ?? CITY_META.map((c) => ({
            city: c.name,
            image: c.image,
            votes: 0,
            issues: 0,
            topIssue: null,
          }))).map((s) => {
            const meta = CITY_META.find((c) => c.name === s.city)!;
            return (
              <article
                key={s.city}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative h-40 w-full overflow-hidden">
                  <img
                    src={s.image}
                    alt={`${s.city} skyline`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4 pb-3 text-white">
                    <div>
                      <div className="text-xs uppercase tracking-widest opacity-80">
                        📍 {meta.blurb}
                      </div>
                      <div className="text-xl font-bold">{s.city}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold leading-none">
                        {s.votes.toLocaleString()}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest opacity-80">
                        youth votes
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.issues} active issues</span>
                    <Link
                      to="/"
                      className="font-medium text-primary hover:underline"
                    >
                      Explore {s.city} →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Want Youth Voice in your city?{" "}
          <a
            href="mailto:abhi.kotala561@gmail.com"
            className="font-semibold text-primary hover:underline"
          >
            Get in touch
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
      <div className="text-3xl font-extrabold text-primary">
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
