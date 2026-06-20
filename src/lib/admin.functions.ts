import { createServerFn } from "@tanstack/react-start";

function checkPasscode(passcode: string) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) throw new Error("Admin passcode not configured");
  if (passcode !== expected) throw new Error("Invalid passcode");
}

export const adminVerify = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string }) => d)
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    return { ok: true };
  });

export const adminListReports = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string }) => d)
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select("id, reason, created_at, comment_id, comments(id, body, stance, display_name, hidden, issue_id, issues(title))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { reports: reports ?? [] };
  });

export const adminSetCommentHidden = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; commentId: string; hidden: boolean }) => d)
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("comments")
      .update({ hidden: data.hidden })
      .eq("id", data.commentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDismissReport = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; reportId: string }) => d)
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reports").delete().eq("id", data.reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCreateIssue = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; title: string; description: string; category: string }) => d)
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("issues")
      .insert({
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category.trim() || "General",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { issue: row };
  });

export const adminUpdateIssue = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      passcode: string;
      id: string;
      title: string;
      description: string;
      category: string;
      status: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("issues")
      .update({
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category.trim() || "General",
        status: data.status,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteIssue = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; id: string }) => d)
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("issues").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
