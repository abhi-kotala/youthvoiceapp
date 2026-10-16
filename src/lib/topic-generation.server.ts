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

export const TOPIC_RUN_DAYS = 45;

const OWNER_EMAIL = "abhi.kotala561@gmail.com";
const RESULTS_RECIPIENTS = [
  "eric@gjerdevig.com",
  "shelly.carlson@moorheadmn.gov",
  "steinec@fargo.k12.nd.us",
  "lanarakow@gmail.com",
  OWNER_EMAIL,
] as const;

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

async function callModelWithUsage(
  existing: string[],
  count: number,
  cities: string[] = [],
): Promise<{ topics: GeneratedTopic[]; usage: { prompt: number | null; completion: number | null } }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const prompt = `Create ${count} new civic discussion topics for Youth Voice, a polling and debate platform for people under 18 in Fargo (ND), West Fargo (ND), and Moorhead (MN).

Rules:
- ${cities.length ? `Write the topics for these cities specifically (one each, repeat a city only if needed): ${cities.join(", ")}.` : "One topic per city where possible: Fargo, West Fargo, Moorhead."}
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
      model: MODEL,
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
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { topics?: unknown[] };
  const topics = (parsed.topics ?? []).filter(isValid).map((t) => ({
    title: t.title.trim(),
    description: t.description.trim(),
    category: CATEGORIES.includes(t.category.trim()) ? t.category.trim() : "Community",
    city: t.city.trim(),
  }));
  return {
    topics,
    usage: { prompt: json.usage?.prompt_tokens ?? null, completion: json.usage?.completion_tokens ?? null },
  };
}

/**
 * Topics with fewer than MIN_VOTES_TO_CLOSE votes get extended by
 * EXTENSION_DAYS instead of closing, up to MAX_TOPIC_LIFETIME_DAYS total.
 */
export const MIN_VOTES_TO_CLOSE = 10;
export const EXTENSION_DAYS = 14;
export const MAX_TOPIC_LIFETIME_DAYS = 120;

async function extendLowVoteTopics(): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data: due } = await supabaseAdmin
    .from("issues")
    .select("id, created_at")
    .eq("status", "open")
    .lt("closes_at", nowIso);
  for (const t of (due ?? []) as { id: string; created_at: string }[]) {
    const ageDays = (Date.now() - new Date(t.created_at).getTime()) / 86400_000;
    if (ageDays >= MAX_TOPIC_LIFETIME_DAYS) continue;
    const { count } = await supabaseAdmin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("issue_id", t.id);
    if ((count ?? 0) >= MIN_VOTES_TO_CLOSE) continue;
    const maxEnd = new Date(t.created_at).getTime() + MAX_TOPIC_LIFETIME_DAYS * 86400_000;
    const newEnd = Math.min(Date.now() + EXTENSION_DAYS * 86400_000, maxEnd);
    await supabaseAdmin
      .from("issues")
      .update({ closes_at: new Date(newEnd).toISOString() })
      .eq("id", t.id);
  }
}

/**
 * Marks any topic whose closing date has passed as closed
 * (after first extending low-participation topics).
 */
export async function closeExpiredTopics(): Promise<{ id: string; city: string }[]> {
  await extendLowVoteTopics();
  const { data } = await supabaseAdmin
    .from("issues")
    .update({ status: "closed" })
    .eq("status", "open")
    .lt("closes_at", new Date().toISOString())
    .select("id, title, category, city, community_id");
  const closed = (data ?? []) as {
    id: string;
    title: string;
    category: string;
    city: string;
    community_id: string | null;
  }[];

  for (const issue of closed) {
    const [{ data: votes }, { count: commentCount }] = await Promise.all([
      supabaseAdmin.from("votes").select("choice").eq("issue_id", issue.id),
      supabaseAdmin
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("issue_id", issue.id)
        .eq("hidden", false),
    ]);
    const tally = { agree: 0, disagree: 0, neutral: 0 };
    for (const vote of votes ?? []) {
      if (vote.choice === "agree" || vote.choice === "disagree" || vote.choice === "neutral") {
        tally[vote.choice] += 1;
      }
    }
    const total = tally.agree + tally.disagree + tally.neutral;
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const issueCommunity = issue.community_id;
    let recipientQuery = supabaseAdmin
      .from("community_recipients")
      .select("email")
      .eq("active", true);
    recipientQuery = issueCommunity
      ? recipientQuery.or(`community_id.is.null,community_id.eq.${issueCommunity}`)
      : recipientQuery.is("community_id", null);
    const { data: recipientRows, error: recipientErr } = await recipientQuery;
    const recipients = recipientErr
      ? [...RESULTS_RECIPIENTS]
      : Array.from(new Set([...(recipientRows ?? []).map((r) => r.email), OWNER_EMAIL]));
    for (const recipient of recipients) {
      try {
        await sendTemplateEmail("closed-topic-results", recipient, {
          idempotencyKey: `closed-topic-results-${issue.id}-${recipient}`,
          replyTo: OWNER_EMAIL,
          templateData: {
            title: issue.title,
            city: issue.city,
            category: issue.category,
            ...tally,
            total,
            commentCount: commentCount ?? 0,
            resultsUrl: `https://youthvoice.world/results/${issue.id}`,
          },
        });
      } catch (error) {
        console.error(`Closed-topic email failed for issue ${issue.id}`, error);
      }
    }
  }

  return closed.map(({ id, city }) => ({ id, city }));
}

// Rough per-run cost estimate (USD per 1M tokens); shown to admins as an estimate only.
const EST_INPUT_PER_M = 1.25;
const EST_OUTPUT_PER_M = 10;
const MODEL = "openai/gpt-5.5";

/**
 * Creates AI draft suggestions ONLY for communities with AI topics enabled.
 * Drafts are never published automatically — an admin must approve each one.
 */
export async function generateTopics(opts?: {
  count?: number;
  force?: boolean;
  minHoursBetweenRuns?: number;
  cities?: string[];
}): Promise<{ created: { id: string; title: string }[]; skipped?: string }> {
  const count = Math.min(Math.max(opts?.count ?? 3, 1), 5);

  let q = supabaseAdmin
    .from("communities")
    .select("id, legacy_city")
    .eq("ai_topics_enabled", true)
    .in("status", ["pilot", "official"]);
  if (opts?.cities?.length) q = q.in("legacy_city", opts.cities);
  const { data: enabled } = await q;
  const byCity = new Map(
    (enabled ?? [])
      .filter((c) => c.legacy_city && (CITIES as readonly string[]).includes(c.legacy_city))
      .map((c) => [c.legacy_city as string, c.id]),
  );
  if (byCity.size === 0) {
    return { created: [], skipped: "AI topics are off for these cities." };
  }

  const existing = await recentTitles();
  const { topics, usage } = await callModelWithUsage(existing, count, [...byCity.keys()]);
  const rows = topics
    .filter((t) => byCity.has(t.city))
    .map((t) => ({
      community_id: byCity.get(t.city)!,
      title: t.title,
      description: t.description,
      category: t.category,
    }));

  let created: { id: string; title: string }[] = [];
  if (rows.length) {
    const { data, error } = await supabaseAdmin.from("topic_drafts").insert(rows).select("id, title");
    if (error) throw new Error(error.message);
    created = data ?? [];
  }

  const est =
    ((usage.prompt ?? 0) * EST_INPUT_PER_M + (usage.completion ?? 0) * EST_OUTPUT_PER_M) / 1e6;
  await supabaseAdmin.from("ai_usage_log").insert({
    community_id: byCity.size === 1 ? [...byCity.values()][0] : null,
    feature: "topic_drafts",
    model: MODEL,
    drafts_created: created.length,
    prompt_tokens: usage.prompt,
    completion_tokens: usage.completion,
    est_cost_usd: Number(est.toFixed(5)),
  });

  return created.length ? { created } : { created, skipped: "No usable drafts returned." };
}

/** Publishes an approved draft as a live topic. */
export async function publishDraft(draftId: string, reviewer: string) {
  const { data: d, error } = await supabaseAdmin
    .from("topic_drafts")
    .select("id, title, description, category, status, community_id, communities(legacy_city, name, topic_run_days)")
    .eq("id", draftId)
    .single();
  if (error || !d) throw new Error("Draft not found");
  if (d.status !== "pending") throw new Error("Draft was already reviewed");
  const c = d.communities as unknown as { legacy_city: string | null; name: string; topic_run_days: number };
  const { data: issue, error: e2 } = await supabaseAdmin
    .from("issues")
    .insert({
      title: d.title,
      description: d.description,
      category: d.category,
      city: c.legacy_city ?? c.name,
      community_id: d.community_id,
      source: "auto",
      status: "open",
      review_status: "approved",
      closes_at: new Date(Date.now() + (c.topic_run_days || TOPIC_RUN_DAYS) * 86400_000).toISOString(),
    })
    .select("id, title")
    .single();
  if (e2) throw new Error(e2.message);
  await supabaseAdmin
    .from("topic_drafts")
    .update({ status: "approved", published_issue_id: issue.id, reviewed_by: reviewer, reviewed_at: new Date().toISOString() })
    .eq("id", draftId);
  try {
    const { broadcastPush } = await import("@/lib/fcm.server");
    await broadcastPush({ title: "New topic on Youth Voice", body: issue.title, url: `/issue/${issue.id}` });
  } catch (e) {
    console.error("broadcastPush failed", e);
  }
  return issue;
}
