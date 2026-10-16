import { createServerFn } from "@tanstack/react-start";
import { STATE_CODES } from "@/lib/community-requests.functions";
import { checkSession, audit } from "@/lib/admin.functions";
import { INTEREST_MIN, COMMUNITY_TYPES, INTEREST_STATUSES, communityKey } from "@/lib/interest";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function hashDevice(id: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`yv-interest:${id}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const submitInterest = createServerFn({ method: "POST" })
  .inputValidator((d: { cityName: string; stateCode: string; communityType: string; reason?: string; wantsToHelp: boolean; organization?: string; contactEmail?: string; acknowledged: boolean; website?: string; deviceId: string }) => {
    if ((d.website ?? "").trim()) throw new Error("Couldn't send your request.");
    if (!d.acknowledged) throw new Error("Please confirm that a request isn't an official partnership.");
    const cityName = (d.cityName ?? "").trim().replace(/\s+/g, " ");
    if (cityName.length < 2 || cityName.length > 80 || !/^[\p{L}0-9 .,'&()-]+$/u.test(cityName)) throw new Error("Enter a community or city name.");
    if (!(STATE_CODES as readonly string[]).includes(d.stateCode)) throw new Error("Pick a state.");
    if (!(d.communityType in COMMUNITY_TYPES)) throw new Error("Pick a community type.");
    const reason = (d.reason ?? "").trim();
    if (reason.length > 500) throw new Error("Keep your reason under 500 characters.");
    const email = (d.contactEmail ?? "").trim().toLowerCase();
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)) throw new Error("Enter a valid email or leave it blank.");
    if (!/^[0-9a-f-]{36}$/i.test(d.deviceId ?? "")) throw new Error("Couldn't send your request. Refresh and try again.");
    return { cityName, stateCode: d.stateCode, communityType: d.communityType, reason: reason || null, wantsToHelp: !!d.wantsToHelp, organization: (d.organization ?? "").trim().slice(0, 120) || null, email: email || null, deviceId: d.deviceId };
  })
  .handler(async ({ data }) => {
    const a = await db();
    const device = await hashDevice(data.deviceId);
    const key = communityKey(data.cityName, data.stateCode);
    const since = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await a.from("community_interest_requests").select("id", { count: "exact", head: true }).eq("device_hash", device).gte("created_at", since);
    if ((count ?? 0) >= 5) throw new Error("You've sent several requests today. Please try again tomorrow.");
    const { data: mine } = await a.from("community_interest_requests").select("id").eq("community_key", key).eq("device_hash", device).maybeSingle();
    if (mine) return { result: "already" as const };
    if (data.reason) {
      const { moderateText } = await import("@/lib/moderation.server");
      const check = await moderateText(data.reason, "comment");
      if (!check.allowed) throw new Error(check.reason || "Please rephrase your reason.");
    }
    const { count: others } = await a.from("community_interest_requests").select("id", { count: "exact", head: true }).eq("community_key", key);
    const { error } = await a.from("community_interest_requests").insert({
      community_key: key, city_name: data.cityName, state_code: data.stateCode, community_type: data.communityType, reason: data.reason,
      wants_to_help: data.wantsToHelp, organization: data.organization, contact_email: data.email, device_hash: device,
    });
    if (error) throw new Error(error.code === "23505" ? "Your interest in this community is already counted." : "Couldn't send your request.");
    return { result: (others ?? 0) > 0 ? ("joined" as const) : ("new" as const) };
  });

/** Public: aggregated interest only, at or above INTEREST_MIN distinct devices. No names, emails or reasons. */
export const listPublicInterest = createServerFn({ method: "GET" }).handler(async () => {
  const a = await db();
  const { data } = await a.from("community_interest_requests").select("community_key, city_name, state_code, status").limit(20000);
  const groups = new Map<string, { city: string; state: string; n: number; reviewing: boolean; hidden: boolean }>();
  for (const r of data ?? []) {
    const g = groups.get(r.community_key) ?? { city: r.city_name, state: r.state_code, n: 0, reviewing: false, hidden: false };
    g.n += 1;
    if (["under_review", "more_info", "outreach"].includes(r.status)) g.reviewing = true;
    if (["declined", "on_hold", "approved_pilot", "official_confirmed"].includes(r.status)) g.hidden = true;
    groups.set(r.community_key, g);
  }
  const shown = [...groups.values()].filter((g) => !g.hidden && g.n >= INTEREST_MIN)
    .map((g) => ({ city: g.city, state: g.state, stage: g.reviewing ? ("reviewing" as const) : ("requested" as const), interest: g.n }))
    .sort((x, y) => y.interest - x.interest);
  return { communities: shown, min: INTEREST_MIN };
});

// ---------- Admin (platform_admin only) ----------
export const adminListInterest = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const a = await db();
    const { data: rows } = await a.from("community_interest_requests").select("id, community_key, city_name, state_code, community_type, reason, wants_to_help, organization, contact_email, status, admin_note, verification_note, outreach_at, followup_at, community_id, pipeline_id, created_at, updated_at").order("created_at", { ascending: false }).limit(5000);
    const counts = new Map<string, number>();
    for (const r of rows ?? []) counts.set(r.community_key, (counts.get(r.community_key) ?? 0) + 1);
    return { rows: (rows ?? []).map((r) => ({ ...r, interest: counts.get(r.community_key) ?? 1 })) };
  });

export const adminUpdateInterest = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; status: string; adminNote?: string; verificationNote?: string; outreachAt?: string; followupAt?: string }) => {
    if (!(INTEREST_STATUSES as readonly string[]).includes(d.status)) throw new Error("Invalid status");
    if (d.status === "official_confirmed" && (d.verificationNote ?? "").trim().length < 10) throw new Error("Describe how the partnership was verified (at least 10 characters).");
    const dt = (x?: string) => (x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);
    return { ...d, outreachAt: dt(d.outreachAt), followupAt: dt(d.followupAt), adminNote: (d.adminNote ?? "").trim().slice(0, 4000) || null, verificationNote: (d.verificationNote ?? "").trim().slice(0, 1000) || null };
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    const { error } = await a.from("community_interest_requests").update({ status: data.status, admin_note: data.adminNote, verification_note: data.verificationNote, outreach_at: data.outreachAt, followup_at: data.followupAt }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(actor, "interest.update", "interest_request", data.id, { status: data.status });
    return { ok: true };
  });

/** Approved request -> hidden draft city (if needed) + onboarding pipeline. Never Official. */
export const adminConvertInterest = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    const { data: r } = await a.from("community_interest_requests").select("*").eq("id", data.id).single();
    if (!r) throw new Error("Request not found");
    if (r.pipeline_id) return { pipelineId: r.pipeline_id };
    const slug = r.city_name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    const { data: existing } = await a.from("communities").select("id").eq("slug", slug).eq("state_code", r.state_code).maybeSingle();
    let communityId = existing?.id;
    if (!communityId) {
      const { data: c, error } = await a.from("communities").insert({ slug, name: r.city_name, state_code: r.state_code, status: "draft" }).select("id").single();
      if (error) throw new Error(error.message);
      communityId = c.id;
      await audit(actor, "community.create", "community", communityId, { status: "draft", fromInterest: r.id });
    }
    const { data: pipe } = await a.from("partner_pipeline").select("id").eq("community_id", communityId).is("request_id", null).maybeSingle();
    let pipelineId = pipe?.id;
    if (!pipelineId) {
      const { data: p, error } = await a.from("partner_pipeline").insert({ community_id: communityId, notes: `From community request: ${r.city_name}, ${r.state_code}` }).select("id").single();
      if (error) throw new Error(error.message);
      pipelineId = p.id;
      await a.from("onboarding_steps").insert({ pipeline_id: pipelineId, step_no: 1, done_by: actor });
    }
    await a.from("community_interest_requests").update({ status: "approved_pilot", community_id: communityId, pipeline_id: pipelineId }).eq("community_key", r.community_key).in("status", ["received", "under_review", "more_info", "outreach", "on_hold"]);
    await a.from("community_interest_requests").update({ pipeline_id: pipelineId, community_id: communityId }).eq("id", r.id);
    await audit(actor, "interest.convert", "interest_request", r.id, { communityId, pipelineId });
    return { pipelineId, communityId };
  });
