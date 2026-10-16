import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STATE_CODES } from "@/lib/community-requests.functions";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: key.startsWith("sb_")
      ? { fetch: (input, init) => { const h = new Headers(init?.headers); if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } }
      : undefined,
  });
}

export const ONBOARDING_STEPS = [
  "Application received", "Initial review", "Introductory meeting", "Demonstration completed",
  "Pilot scope agreed", "Participation approved", "Community activated", "First civic poll published",
  "First results reviewed with the partner", "Partnership check-in",
] as const;

/** Public: only verified partners approved for listing (RLS enforces). */
export const listPublicPartners = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("partner_organizations")
    .select("id, name, org_type, state_code, public_description, verified_at, communities(slug, name, state_code, status)")
    .order("name");
  return { partners: data ?? [] };
});

export const listToolkit = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("toolkit_pages").select("slug, title, body, updated_at").order("sort_order");
  return { pages: data ?? [] };
});

/** Public: reviewed + published impact stories only (RLS enforces). */
export const listImpactStories = createServerFn({ method: "GET" })
  .inputValidator((d: { communityId?: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("impact_records").select("id, occurred_on, description, evidence_url, status, community_id, communities(name, state_code, slug)").order("occurred_on", { ascending: false }).limit(50);
    if (data.communityId) q = q.eq("community_id", data.communityId);
    const { data: rows } = await q;
    return { stories: rows ?? [] };
  });

export const submitDemoRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; organization: string; email: string; stateCode?: string; message?: string; website?: string; deviceId?: string }) => {
    if ((d.website ?? "").trim()) throw new Error("Couldn't send your request.");
    const name = (d.name ?? "").trim(); const organization = (d.organization ?? "").trim();
    const email = (d.email ?? "").trim().toLowerCase(); const message = (d.message ?? "").trim();
    if (name.length < 2 || name.length > 100) throw new Error("Enter your name.");
    if (organization.length < 2 || organization.length > 120) throw new Error("Enter your organization.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Enter a valid email.");
    if (message.length > 1000) throw new Error("Message is too long.");
    const stateCode = d.stateCode && (STATE_CODES as readonly string[]).includes(d.stateCode) ? d.stateCode : null;
    return { name, organization, email, message: message || null, stateCode, deviceId: (d.deviceId ?? "").slice(0, 64) || null };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await supabaseAdmin.from("demo_requests").select("id", { count: "exact", head: true }).eq("email", data.email).gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("You've already sent a few requests today. We'll be in touch.");
    if (data.deviceId) {
      const { count: c2 } = await supabaseAdmin.from("demo_requests").select("id", { count: "exact", head: true }).eq("submitter_device", data.deviceId).gte("created_at", since);
      if ((c2 ?? 0) >= 3) throw new Error("Too many requests from this device today.");
    }
    if (data.message) {
      const { moderateText } = await import("@/lib/moderation.server");
      const check = await moderateText(data.message, "comment");
      if (!check.allowed) throw new Error(check.reason || "Please rephrase your message.");
    }
    const { error } = await supabaseAdmin.from("demo_requests").insert({
      name: data.name, organization: data.organization, email: data.email, state_code: data.stateCode, message: data.message, submitter_device: data.deviceId,
    });
    if (error) throw new Error("Couldn't send your request.");
    return { ok: true };
  });

/** City managers: their own city's impact records + onboarding steps. RLS scopes everything. */
export const managerPartnerData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { communityId: string }) => d)
  .handler(async ({ data, context }) => {
    const [{ data: impact }, { data: steps }] = await Promise.all([
      context.supabase.from("impact_records").select("id, occurred_on, description, evidence_url, status, public, reviewed_by").eq("community_id", data.communityId).order("occurred_on", { ascending: false }),
      context.supabase.from("onboarding_steps").select("step_no, done_at, partner_pipeline!inner(community_id)").eq("partner_pipeline.community_id", data.communityId),
    ]);
    return { impact: (impact ?? []).map((r) => ({ ...r, reviewed: !!r.reviewed_by, reviewed_by: undefined })), steps: (steps ?? []).map((s) => ({ step_no: s.step_no, done_at: s.done_at })) };
  });

export const managerAddImpact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { communityId: string; issueId?: string; occurredOn: string; description: string; evidenceUrl?: string; status: string }) => {
    const description = d.description.trim();
    if (description.length < 20 || description.length > 1500) throw new Error("Describe the outcome in 20–1500 characters.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.occurredOn)) throw new Error("Pick a date.");
    if (!["proposed", "in_progress", "completed"].includes(d.status)) throw new Error("Pick a status.");
    const evidenceUrl = (d.evidenceUrl ?? "").trim();
    if (evidenceUrl && !/^https:\/\/\S+$/.test(evidenceUrl)) throw new Error("Evidence link must start with https://");
    return { ...d, description, evidenceUrl: evidenceUrl || null, issueId: d.issueId || null };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("impact_records").insert({
      community_id: data.communityId, issue_id: data.issueId, occurred_on: data.occurredOn, description: data.description,
      evidence_url: data.evidenceUrl, status: data.status, created_by: context.userId,
    });
    if (error) throw new Error(error.code === "42501" ? "You can't record outcomes for this city" : error.message);
    return { ok: true };
  });
