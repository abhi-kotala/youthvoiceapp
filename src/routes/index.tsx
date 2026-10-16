import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import { CityStatusBadge } from "@/components/city-status-badge";
import { listCities } from "@/lib/cities.functions";
import { cityKey } from "@/lib/cities";
import { ArrowRight, MapPin, Search } from "lucide-react";
import heroCivic from "@/assets/hero-civic.png";

const FEATURED = ["west-fargo-nd", "fargo-nd", "moorhead-mn"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Youth Voice — Your community. Your voice." },
      {
        name: "description",
        content:
          "Share your perspective on local issues and help decision-makers understand what matters to young people. Anonymous polls and debate for under-18s.",
      },
      { property: "og:title", content: "Youth Voice — Your community. Your voice." },
      {
        property: "og:description",
        content:
          "Share your perspective on local issues and help decision-makers understand what matters to young people.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://youthvoiceapp.lovable.app/" },
      { property: "og:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://youthvoiceapp.lovable.app/youth-voice-og.png" },
    ],
    links: [{ rel: "canonical", href: "https://youthvoiceapp.lovable.app/" }],
  }),
  loader: () => listCities().catch(() => ({ cities: [], states: [] })),
  component: HomePage,
});

function HomePage() {
  const { cities } = Route.useLoaderData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const featured = useMemo(() => {
    const byKey = new Map(cities.map((c) => [cityKey(c.slug, c.state_code), c]));
    const picked = FEATURED.map((k) => byKey.get(k)).filter(Boolean);
    return picked.length > 0 ? picked : cities.slice(0, 3);
  }, [cities]);

  const submitSearch = () => {
    navigate({ to: "/explore" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* ================= HERO ================= */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-24">
          <div className="animate-rise">
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-accent sm:text-5xl lg:text-6xl">
              Your community.
              <br />
              <span className="text-primary">Your voice.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Share your perspective on local issues and help decision-makers understand what
              matters to young people.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/explore"
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
              >
                Explore Communities
              </Link>
              <Link
                to="/about"
                className="text-sm font-semibold text-accent underline-offset-4 transition hover:text-primary hover:underline"
              >
                How It Works
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <img
              src={heroCivic}
              alt="Young people sharing ideas and participating in their community"
              width={1024}
              height={1024}
              className="w-full animate-float"
            />
          </div>
        </div>
      </section>

      {/* ================= FIND YOUR COMMUNITY ================= */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-accent sm:text-3xl">
          Find Your Community
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Youth Voice is growing city by city. See whether your community is here yet.
        </p>

        <form
          className="relative mt-6 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
        >
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            aria-label="Search a city or state"
            placeholder="Search a city or state…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            className="h-12 rounded-full pl-11 text-base shadow-sm"
          />
        </form>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c) => (
            <Link
              key={c!.id}
              to="/cities/$key"
              params={{ key: cityKey(c!.slug, c!.state_code) }}
              className="glass glass-hover group rounded-2xl p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {c!.state_name}
                  </span>
                </div>
                <CityStatusBadge status={c!.status} />
              </div>
              <h3 className="mt-3 font-display text-xl font-bold text-accent">{c!.name}</h3>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Explore
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1 text-sm font-semibold text-accent underline-offset-4 transition hover:text-primary hover:underline"
          >
            Explore All Communities
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ================= REQUEST YOUR COMMUNITY ================= */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl bg-accent px-6 py-12 text-center sm:px-12">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-accent-foreground sm:text-3xl">
            Don't see your community?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-accent-foreground/80 sm:text-base">
            Help bring Youth Voice to the place you call home.
          </p>
          <Link
            to="/bring-youth-voice"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
          >
            Request Your Community
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
