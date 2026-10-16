import { createServerFn } from "@tanstack/react-start";
import { checkSession, audit } from "@/lib/admin.functions";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
const DAY = 86400_000;

/** Everything the /admin/partners dashboard needs. Platform admins only. */
export const adminPartnersOverview = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const a = await db();
    const [reqs, pipe, steps, demos, outreach, impact, toolkit, partners, settings, comms, issues] = await Promise.all([
      a.from("community_requests").select("id, city_name, state_code, org_type, organization, contact_name, contact_email, status, created_at, reviewed_at, community_id").order("created_at", { ascending: false }),
      a.from("partner_pipeline").select("*"),
      a.from("onboarding_steps").select("pipeline_id, step_no, done_at, done_by"),
      a.from("demo_requests").select("*").order("created_at", { ascending: false }).limit(200),
      a.from("outreach_log").select("*").order("contacted_on", { ascending: false }).limit(200),
      a.from("impact_records").select("*, communities(name, state_code)").order("created_at", { ascending: false }),
      a.from("toolkit_pages").select("*").order("sort_order"),
      a.from("partner_organizations").select("*").order("created_at", { ascending: false }),
      a.from("program_settings").select("*").eq("id", 1).maybeSingle(),
      a.from("communities").select("id, name, state_code, status, approved_at, created_at, min_votes_for_results"),
      a.from("issues").select("id, community_id, created_at, review_status, source").not("community_id", "is", null),
    ]);
    const s = settings.data ?? { pilot_target: 5, pilot_start: new Date().toISOString().slice(0, 10), pilot_end: new Date(Date.now() + 180 * DAY).toISOString().slice(0, 10) };
    const start = new Date(s.pilot_start).getTime(); const end = new Date(s.pilot_end).getTime() + DAY;
    // Vote counts per community within the pilot period and the last 30 days (aggregates only).
    const issueComm = new Map((issues.data ?? []).map((i) => [i.id, i.community_id!]));
    const inPeriod = new Map<string, number>(); const last30 = new Map<string, number>(); const allVotes = new Map<string, number>();
    const ids = [...issueComm.keys()];
    for (let k = 0; k < ids.length; k += 200) {
      const { data: v } = await a.from("votes").select("issue_id, created_at").in("issue_id", ids.slice(k, k + 200)).limit(100000);
      for (const r of v ?? []) {
        const c = issueComm.get(r.issue_id)!; const t = new Date(r.created_at).getTime();
        allVotes.set(c, (allVotes.get(c) ?? 0) + 1);
        if (t >= start && t < end) inPeriod.set(c, (inPeriod.get(c) ?? 0) + 1);
        if (t >= Date.now() - 30 * DAY) last30.set(c, (last30.get(c) ?? 0) + 1);
      }
    }
    const pubIssues = (issues.data ?? []).filter((i) => i.source === "official" || i.review_status === "approved");
    const pollsInPeriod = new Map<string, number>(); const pollsAll = new Map<string, number>();
    for (const i of pubIssues) {
      pollsAll.set(i.community_id!, (pollsAll.get(i.community_id!) ?? 0) + 1);
      const t = new Date(i.created_at).getTime();
      if (t >= start && t < end) pollsInPeriod.set(i.community_id!, (pollsInPeriod.get(i.community_id!) ?? 0) + 1);
    }
    const communities = (comms.data ?? []).map((c) => ({
      id: c.id, name: c.name, state_code: c.state_code, status: c.status,
      pollsInPeriod: pollsInPeriod.get(c.id) ?? 0, votesInPeriod: inPeriod.get(c.id) ?? 0,
      pollsAll: pollsAll.get(c.id) ?? 0, votesAll: allVotes.get(c.id) ?? 0, votesLast30: last30.get(c.id) ?? 0,
    }));
    return {
      requests: reqs.data ?? [], pipeline: pipe.data ?? [], steps: steps.data ?? [], demos: demos.data ?? [],
      outreach: outreach.data ?? [], impact: impact.data ?? [], toolkit: toolkit.data ?? [], partners: partners.data ?? [],
      settings: s, communities,
    };
  });

export const adminSavePipeline = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; requestId?: string; communityId?: string; coordinator?: string; lastContact?: string; nextFollowup?: string; notes?: string }) => {
    if (!d.requestId && !d.communityId) throw new Error("Missing application or city");
    const dt = (x?: string) => (x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);
    return { ...d, lastContact: dt(d.lastContact), nextFollowup: dt(d.nextFollowup), coordinator: (d.coordinator ?? "").trim().slice(0, 100) || null, notes: (d.notes ?? "").trim().slice(0, 4000) || null };
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    let communityId = data.communityId ?? null;
    if (data.requestId && !communityId) {
      const { data: r } = await a.from("community_requests").select("community_id").eq("id", data.requestId).maybeSingle();
      communityId = r?.community_id ?? null;
    }
    const patch = { coordinator: data.coordinator, last_contact_at: data.lastContact, next_followup_at: data.nextFollowup, notes: data.notes, community_id: communityId };
    const { data: existing } = data.requestId
      ? await a.from("partner_pipeline").select("id").eq("request_id", data.requestId).maybeSingle()
      : await a.from("partner_pipeline").select("id").eq("community_id", communityId!).is("request_id", null).maybeSingle();
    let id = existing?.id;
    if (id) await a.from("partner_pipeline").update(patch).eq("id", id);
    else {
      const { data: row, error } = await a.from("partner_pipeline").insert({ ...patch, request_id: data.requestId ?? null }).select("id").single();
      if (error) throw new Error(error.message);
      id = row.id;
    }
    await audit(actor, "pipeline.update", "pipeline", id!, { coordinator: data.coordinator, nextFollowup: data.nextFollowup });
    return { id };
  });

export const adminToggleStep = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; pipelineId: string; step: number; done: boolean }) => {
    if (!Number.isInteger(d.step) || d.step < 1 || d.step > 10) throw new Error("Invalid step");
    return d;
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    if (data.done) {
      await a.from("onboarding_steps").upsert({ pipeline_id: data.pipelineId, step_no: data.step, done_by: actor, done_at: new Date().toISOString() }, { onConflict: "pipeline_id,step_no" });
      if (data.step === 7) await a.from("partner_pipeline").update({ activated_at: new Date().toISOString() }).eq("id", data.pipelineId).is("activated_at", null);
    } else {
      await a.from("onboarding_steps").delete().eq("pipeline_id", data.pipelineId).eq("step_no", data.step);
    }
    await audit(actor, data.done ? "onboarding.step_done" : "onboarding.step_undone", "pipeline", data.pipelineId, { step: data.step });
    return { ok: true };
  });

export const adminAddOutreach = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; organization: string; channel: string; summary: string; contactedOn: string; nextFollowup?: string }) => {
    if (d.organization.trim().length < 2 || d.summary.trim().length < 3) throw new Error("Add an organization and a short summary.");
    if (!["email", "call", "meeting", "event", "other"].includes(d.channel)) throw new Error("Pick a channel");
    return d;
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    const { data: row, error } = await a.from("outreach_log").insert({
      organization: data.organization.trim().slice(0, 120), channel: data.channel, summary: data.summary.trim().slice(0, 2000),
      contacted_on: data.contactedOn || new Date().toISOString().slice(0, 10), next_followup_at: data.nextFollowup || null, created_by: actor,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await audit(actor, "outreach.add", "outreach", row.id, { organization: data.organization });
    return { ok: true };
  });

export const adminSetDemoStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; status: string }) => {
    if (!["new", "scheduled", "completed", "declined"].includes(d.status)) throw new Error("Invalid status");
    return d;
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    await a.from("demo_requests").update({ status: data.status }).eq("id", data.id);
    await audit(actor, "demo.status", "demo_request", data.id, { status: data.status });
    return { ok: true };
  });

export const adminReviewImpact = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; status: string; publish: boolean }) => {
    if (!["proposed", "in_progress", "completed", "verified"].includes(d.status)) throw new Error("Invalid status");
    return d;
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    await a.from("impact_records").update({ status: data.status, public: data.publish, reviewed_by: actor, reviewed_at: new Date().toISOString() }).eq("id", data.id);
    await audit(actor, data.publish ? "impact.publish" : "impact.review", "impact", data.id, { status: data.status, public: data.publish });
    return { ok: true };
  });

export const adminSaveToolkit = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; slug: string; title: string; body: string }) => {
    if (!d.title.trim() || d.title.length > 120) throw new Error("Add a title");
    if (d.body.length > 20000) throw new Error("Too long");
    return d;
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    await a.from("toolkit_pages").update({ title: data.title.trim(), body: data.body, updated_at: new Date().toISOString() }).eq("slug", data.slug);
    await audit(actor, "toolkit.update", "toolkit", data.slug);
    return { ok: true };
  });

export const adminSavePartner = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id?: string; name: string; orgType: string; stateCode?: string; communityId?: string; requestId?: string; verified: boolean; verificationNote?: string; publicListing: boolean; publicDescription?: string }) => {
    if (d.name.trim().length < 2) throw new Error("Add the organization name");
    if (d.verified && (d.verificationNote ?? "").trim().length < 10) throw new Error("Describe how the partnership was verified (at least 10 characters).");
    if (d.publicListing && !d.verified) throw new Error("Only verified partners can be listed publicly.");
    return d;
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    const row = {
      name: data.name.trim().slice(0, 120), org_type: data.orgType, state_code: data.stateCode || null, community_id: data.communityId || null,
      request_id: data.requestId || null, verified: data.verified, verification_note: data.verificationNote?.trim() || null,
      verified_by: data.verified ? actor : null, verified_at: data.verified ? new Date().toISOString() : null,
      public_listing: data.publicListing, public_description: (data.publicDescription ?? "").trim().slice(0, 600) || null,
    };
    const res = data.id ? await a.from("partner_organizations").update(row).eq("id", data.id).select("id").single() : await a.from("partner_organizations").insert(row).select("id").single();
    if (res.error) throw new Error(res.error.message);
    await audit(actor, data.verified ? "partner.verify" : "partner.save", "partner", res.data.id, { verified: data.verified, publicListing: data.publicListing });
    return { id: res.data.id };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; target: number; start: string; end: string }) => {
    if (!Number.isInteger(d.target) || d.target < 1 || d.target > 1000) throw new Error("Target must be 1–1000");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.start) || !/^\d{4}-\d{2}-\d{2}$/.test(d.end) || d.end < d.start) throw new Error("Check the pilot dates");
    return d;
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const a = await db();
    await a.from("program_settings").update({ pilot_target: data.target, pilot_start: data.start, pilot_end: data.end }).eq("id", 1);
    await audit(actor, "program.settings", "program", "1", { target: data.target, start: data.start, end: data.end });
    return { ok: true };
  });
