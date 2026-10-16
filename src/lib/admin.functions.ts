import { createServerFn } from "@tanstack/react-start";


async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * `token` is the caller's signed-in access token. Verified server-side, then the
 * caller must hold platform_admin in user_roles. Returns the admin's user id.
 */
export async function checkSession(token: string): Promise<string> {
  if (!token) throw new Error("Not signed in");
  const admin = await getAdmin();
  const { data: u, error } = await admin.auth.getUser(token);
  if (error || !u?.user) throw new Error("Session expired — sign in again");
  const { data: role } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", u.user.id)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (!role) throw new Error("Not authorized");
  return u.user.id;
}

export async function audit(actorId: string, action: string, targetType: string, targetId: string | null, details: Record<string, unknown> = {}) {
  const admin = await getAdmin();
  await admin.from("admin_audit_log").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, details: details as never });
}



/** Retired: passcode sign-in replaced by platform_admin accounts. */
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string }) => d)
  .handler(async () => {
    throw new Error("Passcode sign-in has been retired. Sign in with your admin account.");
  });

export const adminVerify = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    if (!data.token) return { ok: true };
    const admin = await getAdmin();
    await admin.from("admin_sessions").delete().eq("token", data.token);
    return { ok: true };
  });

export const adminListReports = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const { data: reports, error } = await admin
      .from("reports")
      .select("id, reason, created_at, comment_id, comments(id, body, stance, display_name, hidden, issue_id, issues(title))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { reports: reports ?? [] };
  });

export const adminSetCommentHidden = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; commentId: string; hidden: boolean }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const { error } = await admin
      .from("comments")
      .update({ hidden: data.hidden })
      .eq("id", data.commentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDismissReport = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; reportId: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const { error } = await admin.from("reports").delete().eq("id", data.reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCreateIssue = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      token: string;
      title: string;
      description: string;
      category: string;
      city?: string;
      closes_at?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const { data: row, error } = await admin
      .from("issues")
      .insert({
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category.trim() || "General",
        city: (data.city ?? "Fargo").trim() || "Fargo",
        closes_at: data.closes_at
          ? new Date(data.closes_at).toISOString()
          : new Date(Date.now() + 45 * 86400_000).toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    try {
      const { broadcastPush } = await import("@/lib/fcm.server");
      await broadcastPush({
        title: "New issue on Youth Voice",
        body: row.title,
        url: `/issue/${row.id}`,
      });
    } catch (e) {
      console.error("broadcastPush failed", e);
    }

    return { issue: row };
  });

export const adminUpdateIssue = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      token: string;
      id: string;
      title: string;
      description: string;
      category: string;
      status: string;
      city?: string;
      impact_status?: string;
      impact_note?: string | null;
      closes_at?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const update: {
      title: string;
      description: string;
      category: string;
      status: string;
      city: string;
      impact_status?: string;
      impact_note?: string | null;
      closes_at?: string | null;
    } = {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category.trim() || "General",
      status: data.status,
      city: (data.city ?? "Fargo").trim() || "Fargo",
    };
    if (data.impact_status !== undefined) {
      update.impact_status = data.impact_status || "none";
    }
    if (data.impact_note !== undefined) {
      update.impact_note = data.impact_note?.trim() || null;
    }
    if (data.closes_at !== undefined) {
      update.closes_at = data.closes_at ? new Date(data.closes_at).toISOString() : null;
    }
    const { error } = await admin
      .from("issues")
      .update(update)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteIssue = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const admin = await getAdmin();
    const { error } = await admin.from("issues").delete().eq("id", data.id);
    if (!error) await audit(actor, "issue.delete", "issue", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGenerateTopics = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; count?: number }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const { generateTopics, closeExpiredTopics } = await import(
      "@/lib/topic-generation.server"
    );
    const closed = await closeExpiredTopics();
    const result = await generateTopics({ count: data.count ?? 3, force: true });
    return { closed: closed.length, created: result.created, skipped: result.skipped ?? null };
  });

// ---------- Phase 2A: cities, requests, AI drafts, usage, roles ----------

const COMMUNITY_STATUSES = new Set(["draft", "pending", "listed", "pilot", "official", "paused"]);

export const adminListCommunities = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const [{ data: communities }, { data: requests }, { data: usage }] = await Promise.all([
      admin
        .from("communities")
        .select("id, slug, name, state_code, type, status, ai_topics_enabled, min_votes_for_results, topic_run_days, approved_at, approved_by")
        .order("state_code")
        .order("name"),
      admin.from("community_requests").select("*").order("created_at", { ascending: false }).limit(100),
      admin.from("ai_usage_log").select("community_id, drafts_created, est_cost_usd, created_at"),
    ]);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    let monthCost = 0;
    let totalCost = 0;
    let runs = 0;
    for (const u of usage ?? []) {
      const c = Number(u.est_cost_usd) || 0;
      totalCost += c;
      runs += 1;
      if (new Date(u.created_at) >= monthStart) monthCost += c;
    }
    return {
      communities: communities ?? [],
      requests: requests ?? [],
      usage: { runs, totalCost, monthCost },
    };
  });

export const adminUpdateCommunity = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { token: string; id: string; status?: string; aiTopicsEnabled?: boolean; minVotes?: number; verificationNote?: string }) => {
      if (d.status && !COMMUNITY_STATUSES.has(d.status)) throw new Error("Invalid status");
      if (d.minVotes !== undefined && (d.minVotes < 1 || d.minVotes > 1000)) throw new Error("Invalid minimum");
      const note = (d.verificationNote ?? "").trim().slice(0, 500);
      if (d.status === "official" && note.length < 10)
        throw new Error("Describe how the partnership was verified (who confirmed, how) before marking Official.");
      return { ...d, verificationNote: note };
    },
  )
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const admin = await getAdmin();
    const update: Record<string, unknown> = {};
    if (data.status) {
      update.status = data.status;
      if (data.status === "official") {
        update.approved_at = new Date().toISOString();
        update.approved_by = "platform_admin";
        update.verification_note = data.verificationNote;
        update.verified_by = actor;
      }
    }
    if (data.aiTopicsEnabled !== undefined) update.ai_topics_enabled = data.aiTopicsEnabled;
    if (data.minVotes !== undefined) update.min_votes_for_results = data.minVotes;
    const { error } = await admin.from("communities").update(update as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(actor, data.status ? `community.status.${data.status}` : "community.settings", "community", data.id, {
      aiTopicsEnabled: data.aiTopicsEnabled, minVotes: data.minVotes, verificationNote: data.verificationNote || undefined,
    });
    return { ok: true };
  });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export const adminReviewRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; action: "draft" | "pending" | "reject" | "needs_info"; note?: string }) => {
    if (!["draft", "pending", "reject", "needs_info"].includes(d.action)) throw new Error("Invalid action");
    const note = (d.note ?? "").trim().slice(0, 1000);
    if ((d.action === "reject" || d.action === "needs_info") && note.length < 3) throw new Error("Add a short reason or note.");
    return { ...d, note };
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const admin = await getAdmin();
    const { data: req } = await admin.from("community_requests").select("*").eq("id", data.id).single();
    if (!req) throw new Error("Application not found");
    const now = new Date().toISOString();
    if (data.action === "reject") {
      await admin.from("community_requests")
        .update({ status: "rejected", reviewed_at: now, reviewed_by: actor, decision_reason: data.note })
        .eq("id", data.id);
      await audit(actor, "application.reject", "application", data.id, { reason: data.note });
      return { ok: true };
    }
    if (data.action === "needs_info") {
      await admin.from("community_requests")
        .update({ status: "needs_info", reviewed_at: now, reviewed_by: actor, admin_note: data.note })
        .eq("id", data.id);
      await audit(actor, "application.needs_info", "application", data.id, { note: data.note });
      return { ok: true };
    }
    // Approval creates (or links) a city as Draft (hidden) or Pending — never Official.
    const slug = slugify(req.city_name);
    const { data: existing } = await admin
      .from("communities").select("id").eq("state_code", req.state_code).eq("slug", slug).maybeSingle();
    let communityId = existing?.id;
    if (!communityId) {
      const { data: c, error } = await admin
        .from("communities")
        .insert({ slug, name: req.city_name, state_code: req.state_code, status: data.action })
        .select("id").single();
      if (error) throw new Error(error.message);
      communityId = c.id;
      await audit(actor, "community.create", "community", communityId, { status: data.action, from: data.id });
    }
    await admin.from("community_requests")
      .update({ status: "approved", community_id: communityId, reviewed_at: now, reviewed_by: actor, admin_note: data.note || req.admin_note })
      .eq("id", data.id);
    await audit(actor, "application.approve", "application", data.id, { communityId });
    return { ok: true, communityId };
  });

export const adminListAudit = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const { data: rows } = await admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    const emails = new Map<string, string>();
    for (const r of rows ?? []) {
      if (r.actor_id && !emails.has(r.actor_id)) {
        const { data: u } = await admin.auth.admin.getUserById(r.actor_id);
        emails.set(r.actor_id, u?.user?.email ?? "(unknown)");
      }
    }
    return { entries: (rows ?? []).map((r) => ({ ...r, actor: r.actor_id ? emails.get(r.actor_id) : "system" })) };
  });

export const adminListDrafts = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const { data: drafts, error } = await admin
      .from("topic_drafts")
      .select("id, title, description, category, status, created_at, communities(name, state_code)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { drafts: drafts ?? [] };
  });

export const adminReviewDraft = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { token: string; id: string; action: "approve" | "discard"; title?: string; description?: string }) => d,
  )
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    if (data.title || data.description) {
      const patch: { title?: string; description?: string } = {};
      if (data.title) patch.title = data.title.trim().slice(0, 140);
      if (data.description) patch.description = data.description.trim().slice(0, 1200);
      await admin.from("topic_drafts").update(patch).eq("id", data.id).eq("status", "pending");
    }
    if (data.action === "discard") {
      await admin
        .from("topic_drafts")
        .update({ status: "discarded", reviewed_by: "platform_admin", reviewed_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("status", "pending");
      return { ok: true };
    }
    const { publishDraft } = await import("@/lib/topic-generation.server");
    const issue = await publishDraft(data.id, "platform_admin");
    return { ok: true, issueId: issue.id };
  });

const ROLES = new Set(["platform_admin", "community_admin", "partner", "official"]);

export const adminListRoles = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const { data: roles } = await admin
      .from("user_roles")
      .select("id, user_id, role, community_id, created_at, communities(name, state_code)")
      .order("created_at");
    const out = [];
    for (const r of roles ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(r.user_id);
      out.push({ ...r, email: u?.user?.email ?? "(unknown)" });
    }
    return { roles: out };
  });

export const adminGrantRole = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; email: string; role: string; communityId?: string | null }) => {
    if (!ROLES.has(d.role)) throw new Error("Invalid role");
    if (d.role !== "platform_admin" && !d.communityId) throw new Error("Pick a city for this role");
    return { ...d, email: d.email.trim().toLowerCase() };
  })
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const admin = await getAdmin();
    let userId: string | null = null;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const hit = list?.users.find((u) => u.email?.toLowerCase() === data.email);
      if (hit) userId = hit.id;
      if (!list || list.users.length < 200) break;
    }
    if (!userId) throw new Error("No YouthVoice account uses that email.");
    if (userId === actor) throw new Error("You can't change your own roles.");
    const { error } = await admin.from("user_roles").insert({
      user_id: userId,
      role: data.role as "platform_admin" | "community_admin" | "partner" | "official",
      community_id: data.role === "platform_admin" ? null : data.communityId,
    });
    if (error) throw new Error(error.code === "23505" ? "That person already has this role." : error.message);
    await audit(actor, "role.grant", "user", userId, { role: data.role, communityId: data.communityId ?? null, email: data.email });
    return { ok: true };
  });

export const adminRevokeRole = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    const actor = await checkSession(data.token);
    const admin = await getAdmin();
    const { data: row } = await admin.from("user_roles").select("user_id, role, community_id").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Role not found");
    if (row.user_id === actor) throw new Error("You can't remove your own role.");
    const { error } = await admin.from("user_roles").delete().eq("id", data.id);
    if (!error) await audit(actor, "role.revoke", "user", row.user_id, row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
