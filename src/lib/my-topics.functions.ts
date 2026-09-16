import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SupabaseAdmin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function ownsIssue(
  supabaseAdmin: SupabaseAdmin,
  issueId: string,
  userId: string,
) {
  const { data: issue, error } = await supabaseAdmin
    .from("issues")
    .select("id, source, submitted_by_device")
    .eq("id", issueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!issue || issue.source !== "user" || !issue.submitted_by_device) return false;

  const { data: device, error: deviceError } = await supabaseAdmin
    .from("account_devices")
    .select("user_id")
    .eq("device_id", issue.submitted_by_device)
    .maybeSingle();
  if (deviceError) throw new Error(deviceError.message);
  return !!device && device.user_id === userId;
}

function validateIssueId(issueId: string) {
  if (!issueId || issueId.length > 64) throw new Error("Invalid topic id");
  return issueId;
}

export const canDeleteMyTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { issueId: string }) => ({
    issueId: validateIssueId(data.issueId),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return { canDelete: await ownsIssue(supabaseAdmin, data.issueId, context.userId) };
  });

export const deleteMyTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { issueId: string }) => ({
    issueId: validateIssueId(data.issueId),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allowed = await ownsIssue(supabaseAdmin, data.issueId, context.userId);
    if (!allowed) throw new Error("You can only delete topics you submitted.");

    const { data: comments } = await supabaseAdmin
      .from("comments")
      .select("id")
      .eq("issue_id", data.issueId);
    const commentIds = (comments ?? []).map((c) => c.id);
    if (commentIds.length > 0) {
      await supabaseAdmin.from("reports").delete().in("comment_id", commentIds);
      await supabaseAdmin.from("comments").delete().in("id", commentIds);
    }
    await supabaseAdmin.from("votes").delete().eq("issue_id", data.issueId);
    await supabaseAdmin
      .from("impact_events")
      .delete()
      .eq("ref_type", "issue")
      .eq("ref_id", data.issueId);
    const { error } = await supabaseAdmin.from("issues").delete().eq("id", data.issueId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });
