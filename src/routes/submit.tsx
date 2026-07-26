import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getDeviceId } from "@/lib/device-id";
import { submitTopic } from "@/lib/topics.functions";

const CATEGORIES = [
  "Education",
  "Transportation",
  "Environment",
  "Economy",
  "Healthcare",
  "Public Safety",
  "Community",
  "Housing",
  "Government",
  "Ideas",
  "General",
];

const CITIES = ["Fargo", "West Fargo", "Moorhead", "Statewide"] as const;
const SCOPES = [
  { value: "school", label: "🏫 My school" },
  { value: "city", label: "🏙️ City-wide" },
  { value: "statewide", label: "🗺️ Statewide" },
] as const;
const TYPES = [
  { value: "poll", label: "📊 Poll", desc: "Yes / no / neutral vote" },
  { value: "discussion", label: "💬 Discussion", desc: "Open debate, no strict sides" },
  { value: "idea", label: "💡 Idea proposal", desc: "A concrete proposal for change" },
] as const;

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit a topic — Youth Voice" },
      {
        name: "description",
        content:
          "Anonymously propose a new topic for the Fargo–Moorhead community to vote and debate on. No accounts required.",
      },
      { property: "og:title", content: "Submit a youth-led topic — Youth Voice" },
      {
        property: "og:description",
        content:
          "Young people shape what issues matter. Submit a topic for your school, city, or state.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const navigate = useNavigate();
  const deviceId = useMemo(() => getDeviceId(), []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Community");
  const [city, setCity] = useState<(typeof CITIES)[number]>("Fargo");
  const [scope, setScope] = useState<(typeof SCOPES)[number]["value"]>("city");
  const [locationName, setLocationName] = useState("");
  const [topicType, setTopicType] = useState<(typeof TYPES)[number]["value"]>("poll");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleValid = title.trim().length >= 8 && title.trim().length <= 140;
  const descValid =
    description.trim().length >= 20 && description.trim().length <= 1200;
  const canSubmit = titleValid && descValid && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitTopic({
        data: {
          deviceId,
          title: title.trim(),
          description: description.trim(),
          category,
          city,
          locationScope: scope,
          locationName: locationName.trim() || undefined,
          topicType,
        },
      });
      navigate({ to: "/issue/$id", params: { id: res.id } });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            🌱 Youth-led topic
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Shape what issues matter
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Propose a topic your community should be talking about. Stays anonymous.
            Earn <strong>+15 Impact Points</strong> for submitting, plus bonuses if
            it gets real engagement.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold">
              Topic title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder="e.g. Should our schools push start times later?"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{titleValid || title === "" ? "8–140 characters" : "Too short"}</span>
              <span>{title.length}/140</span>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1200}
              rows={5}
              placeholder="What's going on? Why does it matter to young people? What decision should be made?"
              className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{descValid || description === "" ? "20–1200 characters" : "Add a bit more detail"}</span>
              <span>{description.length}/1200</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="block text-sm font-semibold">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-semibold">
                Location
              </label>
              <select
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value as typeof city)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold">Scope</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SCOPES.map((s) => {
                const active = scope === s.value;
                return (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => setScope(s.value)}
                    className={[
                      "rounded-md border px-2 py-2 text-xs font-medium transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-secondary",
                    ].join(" ")}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            {scope === "school" && (
              <input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                maxLength={120}
                placeholder="School name (optional)"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>

          <div>
            <span className="block text-sm font-semibold">Topic type</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {TYPES.map((t) => {
                const active = topicType === t.value;
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setTopicType(t.value)}
                    className={[
                      "rounded-lg border p-3 text-left text-xs transition",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-secondary",
                    ].join(" ")}
                  >
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="mt-1 text-muted-foreground">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary p-3 text-xs text-muted-foreground">
            <strong>Community guidelines:</strong> Keep it civil and constructive.
            Topics that target individuals, contain hate speech, or spread
            misinformation may be removed. Submissions are visible to everyone in
            your community.
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Anonymous submission · +15 Impact Points
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit topic"}
            </button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
