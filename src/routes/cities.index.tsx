import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CityStatusBadge } from "@/components/city-status-badge";
import { listCities } from "@/lib/cities.functions";
import { cityKey, SELECTED_CITY_KEY } from "@/lib/cities";

export const Route = createFileRoute("/cities/")({
  head: () => ({
    meta: [
      { title: "Choose Your City — Youth Voice" },
      { name: "description", content: "Pick your state, then your community, to see local Youth Voice polls and discussions." },
      { property: "og:title", content: "Choose Your City — Youth Voice" },
      { property: "og:description", content: "Pick your state and community on Youth Voice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => listCities(),
  errorComponent: () => <div className="min-h-screen"><SiteHeader /><p className="p-10 text-center text-muted-foreground">Couldn't load cities. Please try again.</p></div>,
  component: ChooseCity,
});

function ChooseCity() {
  const { cities, states } = Route.useLoaderData();
  const navigate = useNavigate();
  const [state, setState] = useState("");
  const [q, setQ] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => { setSaved(localStorage.getItem(SELECTED_CITY_KEY)); }, []);

  const statesWithCities = states.filter((s) => cities.some((c) => c.state_code === s.code));
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    return cities.filter((c) => (!state || c.state_code === state) && (!t || c.name.toLowerCase().includes(t) || c.zip_codes.some((z) => z.startsWith(t))));
  }, [cities, state, q]);
  const savedCity = cities.find((c) => cityKey(c.slug, c.state_code) === saved);

  function pick(key: string) {
    localStorage.setItem(SELECTED_CITY_KEY, key); // only stored on this device
    navigate({ to: "/cities/$key", params: { key } });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl font-extrabold">Choose Your City</h1>
        <p className="mt-2 text-muted-foreground">No location access needed. Your choice is saved only on this device, and you can change it anytime.</p>

        {savedCity && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4">
            <span className="text-sm">Your city: <strong>{savedCity.name}, {savedCity.state_code}</strong></span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => pick(saved!)}>Go</Button>
              <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem(SELECTED_CITY_KEY); setSaved(null); }}>Clear</Button>
            </div>
          </div>
        )}

        <label className="mt-8 block text-sm font-medium">1. Select your state</label>
        <select aria-label="State" className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All states with communities</option>
          {statesWithCities.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>

        <label className="mt-6 block text-sm font-medium">2. Find your community</label>
        <Input className="mt-2" placeholder="City name or ZIP" value={q} onChange={(e) => setQ(e.target.value)} />

        <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
          {matches.map((c) => (
            <li key={c.id}>
              <button onClick={() => pick(cityKey(c.slug, c.state_code))} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/50">
                <span><span className="font-semibold">{c.name}</span> <span className="text-sm text-muted-foreground">{c.state_name}</span></span>
                <CityStatusBadge status={c.status} />
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Youth Voice isn't available there yet.</li>}
        </ul>

        <p className="mt-8 text-center text-sm">
          Not listed? <Link to="/request-city" className="font-semibold text-primary underline">Request Youth Voice for your community</Link>
          {" · "}<Link to="/explore" className="text-primary underline">Browse all communities</Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
