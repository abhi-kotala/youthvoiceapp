import { createServerFn } from "@tanstack/react-start";

const SESSION_TTL_HOURS = 8;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function checkSession(token: string) {
  if (!token) throw new Error("Not signed in");
  const admin = await getAdmin();
  const { data, error } = await admin
    .from("admin_sessions")
    .select("token, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Session expired");
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await admin.from("admin_sessions").delete().eq("token", token);
    throw new Error("Session expired");
  }
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string }) => d)
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSCODE;
    if (!expected) throw new Error("Admin passcode not configured");
    if (!timingSafeEqualStr(data.passcode, expected)) {
      throw new Error("Invalid passcode");
    }
    const admin = await getAdmin();
    const token = randomToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const { error } = await admin
      .from("admin_sessions")
      .insert({ token, expires_at: expiresAt });
    if (error) throw new Error(error.message);
    // Best-effort cleanup of expired rows.
    await admin.from("admin_sessions").delete().lt("expires_at", new Date().toISOString());
    return { token, expiresAt };
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
  .inputValidator((d: { token: string; title: string; description: string; category: string; city?: string }) => d)
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
    }) => d,
  )
  .handler(async ({ data }) => {
    await checkSession(data.token);
    const admin = await getAdmin();
    const update: Record<string, unknown> = {
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
    await checkSession(data.token);
    const admin = await getAdmin();
    const { error } = await admin.from("issues").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
