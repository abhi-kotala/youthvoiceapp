// Server-only: auto-generates fresh civic topics for Youth Voice.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CITIES = ["Fargo", "West Fargo", "Moorhead"] as const;

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
];

export const TOPIC_RUN_DAYS = 30;

type GeneratedTopic = {
  title: string;
  description: string;
  category: string;
  city: string;
};

function isValid(t: unknown): t is GeneratedTopic {
  const x = t as GeneratedTopic;
  return (
    !!x &&
    typeof x.title === "string" &&
    x.title.trim().length >= 12 &&
    x.title.trim().length <= 140 &&
    typeof x.description === "string" &&
    x.description.trim().length >= 60 &&
    typeof x.category === "string" &&
    typeof x.city === "string" &&
    (CITIES as readonly string[]).includes(x.city)
  );
}

async function recentTitles(limit = 40): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("issues")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: { title: string }) => r.title);
}

async function callModel(existing: string[], count: number): Promise<GeneratedTopic[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const prompt = `Create ${count} new civic discussion topics for Youth Voice, a polling and debate platform for people under 18 in Fargo (ND), West Fargo (ND), and Moorhead (MN).

Rules:
- One topic per city where possible: Fargo, West Fargo, Moorhead.
- Each topic must be a real, ongoing local-government style question a city council or school board could plausibly decide (budgets, school policy, transit, parks, housing, safety, youth programs, downtown development).
- Phrase the title as a clear yes/no style question under 140 characters. Do NOT state fake facts, dollar amounts, dates, or claim a specific vote happened.
- Description: 3-5 sentences of neutral, high-school-level background explaining both sides. No opinions. No invented statistics.
- Category must be one of: ${CATEGORIES.join(", ")}.
- Must NOT duplicate or closely repeat any of these existing topics:
${existing.map((t) => `- ${t}`).join("\n")}

Return strict JSON: {"topics":[{"title":"","description":"","category":"","city":""}]}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "openai/gpt-5.5",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write neutral, factual civic discussion prompts for teenagers. You never invent specific facts, figures, or events.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { topics?: unknown[] };
  return (parsed.topics ?? []).filter(isValid).map((t) => ({
    title: t.title.trim(),
    description: t.description.trim(),
    category: CATEGORIES.includes(t.category.trim()) ? t.category.trim() : "Community",
    city: t.city.trim(),
  }));
}

/**
 * Marks any topic whose closing date has passed as closed.
 */
export async function closeExpiredTopics(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("issues")
    .update({ status: "closed" })
    .eq("status", "open")
    .lt("closes_at", new Date().toISOString())
    .select("id");
  return (data ?? []).length;
}

/**
 * Generates and publishes fresh topics. Skips generation if topics were
 * already auto-generated within `minHoursBetweenRuns` hours.
 */
export async function generateTopics(opts?: {
  count?: number;
  force?: boolean;
  minHoursBetweenRuns?: number;
}): Promise<{ created: { id: string; title: string }[]; skipped?: string }> {
  const count = Math.min(Math.max(opts?.count ?? 3, 1), 5);
  const minHours = opts?.minHoursBetweenRuns ?? 24;

  if (!opts?.force) {
    const since = new Date(Date.now() - minHours * 3600_000).toISOString();
    const { count: recent } = await supabaseAdmin
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("source", "auto")
      .gte("created_at", since);
    if ((recent ?? 0) > 0) {
      return { created: [], skipped: "Topics were already generated recently." };
    }
  }

  const existing = await recentTitles();
  const topics = await callModel(existing, count);
  if (topics.length === 0) return { created: [], skipped: "No usable topics returned." };

  const closesAt = new Date(Date.now() + TOPIC_RUN_DAYS * 86400_000).toISOString();
  const rows = topics.map((t) => ({
    title: t.title,
    description: t.description,
    category: t.category,
    city: t.city,
    source: "auto",
    status: "open",
    review_status: "approved",
    closes_at: closesAt,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from("issues")
    .insert(rows as never)
    .select("id, title");
  if (error) throw new Error(error.message);

  const created = (inserted ?? []) as { id: string; title: string }[];

  try {
    const { broadcastPush } = await import("@/lib/fcm.server");
    if (created[0]) {
      await broadcastPush({
        title:
          created.length > 1
            ? `${created.length} new topics on Youth Voice`
            : "New topic on Youth Voice",
        body: created[0].title,
        url: `/issue/${created[0].id}`,
      });
    }
  } catch (e) {
    console.error("broadcastPush failed", e);
  }

  return { created };
}
