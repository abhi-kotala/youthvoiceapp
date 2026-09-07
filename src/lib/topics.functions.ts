import { createServerFn } from "@tanstack/react-start";

const CITIES = new Set(["Fargo", "West Fargo", "Moorhead", "Statewide"]);
const SCOPES = new Set(["school", "city", "statewide"]);
const TYPES = new Set(["poll", "discussion", "idea"]);
const CATEGORIES = new Set([
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
]);

type SubmitInput = {
  deviceId: string;
  title: string;
  description: string;
  category: string;
  city: string;
  locationScope: string;
  locationName?: string;
  topicType: string;
};

export const submitTopic = createServerFn({ method: "POST" })
  .inputValidator((d: SubmitInput) => {
    if (!d.deviceId || d.deviceId.length > 128) throw new Error("Invalid device id");
    const title = (d.title ?? "").trim();
    const description = (d.description ?? "").trim();
    if (title.length < 8 || title.length > 140) throw new Error("Title must be 8–140 characters");
    if (description.length < 20 || description.length > 1200)
      throw new Error("Description must be 20–1200 characters");
    if (!CATEGORIES.has(d.category)) throw new Error("Invalid category");
    if (!CITIES.has(d.city)) throw new Error("Invalid city");
    if (!SCOPES.has(d.locationScope)) throw new Error("Invalid location scope");
    if (!TYPES.has(d.topicType)) throw new Error("Invalid topic type");
    const locationName = (d.locationName ?? "").trim().slice(0, 120) || null;
    return { ...d, title, description, locationName };
  })
  .handler(async ({ data }) => {
    const { moderateText } = await import("@/lib/moderation.server");
    const check = await moderateText(`${data.title}\n\n${data.description}`, "topic");
    if (!check.allowed) {
      throw new Error(check.reason || "This topic isn't allowed here.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit: max 3 pending/approved submissions per device per 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by_device", data.deviceId)
      .gte("created_at", since);
    if ((recentCount ?? 0) >= 3) {
      throw new Error("You've submitted a lot recently — try again tomorrow.");
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("issues")
      .insert({
        title: data.title,
        description: data.description,
        category: data.category,
        city: data.city,
        source: "user",
        topic_type: data.topicType,
        location_scope: data.locationScope,
        location_name: data.locationName,
        submitted_by_device: data.deviceId,
        review_status: "approved", // auto-approved; admins can hide later
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Award impact points (idempotent via unique index)
    await supabaseAdmin.from("impact_events").insert({
      device_id: data.deviceId,
      action: "idea_submitted",
      points: 15,
      ref_type: "issue",
      ref_id: inserted.id,
    });

    return { id: inserted.id };
  });

export const getTrendingYouthIdeas = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: issues } = await supabaseAdmin
    .from("issues")
    .select("id, title, description, category, city, topic_type, location_scope, location_name, created_at")
    .eq("source", "user")
    .eq("review_status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);
  if (!issues || issues.length === 0) return [];
  const ids = issues.map((i) => i.id);
  const [{ data: votes }, { data: comments }] = await Promise.all([
    supabaseAdmin.from("votes").select("issue_id").in("issue_id", ids),
    supabaseAdmin
      .from("comments")
      .select("issue_id")
      .in("issue_id", ids)
      .eq("hidden", false),
  ]);
  const voteCounts: Record<string, number> = {};
  const commentCounts: Record<string, number> = {};
  (votes ?? []).forEach((v: { issue_id: string }) => {
    voteCounts[v.issue_id] = (voteCounts[v.issue_id] ?? 0) + 1;
  });
  (comments ?? []).forEach((c: { issue_id: string }) => {
    commentCounts[c.issue_id] = (commentCounts[c.issue_id] ?? 0) + 1;
  });
  const now = Date.now();
  const scored = issues.map((i) => {
    const ageHours = Math.max(1, (now - new Date(i.created_at).getTime()) / 36e5);
    const v = voteCounts[i.id] ?? 0;
    const c = commentCounts[i.id] ?? 0;
    // Simple trending: weighted engagement decayed by age
    const score = (v + 2 * c + 1) / Math.pow(ageHours + 2, 0.6);
    return { ...i, voteCount: v, commentCount: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6);
});
