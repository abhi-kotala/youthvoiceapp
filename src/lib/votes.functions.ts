import { createServerFn } from "@tanstack/react-start";

const STANCES = new Set(["agree", "disagree", "neutral"]);
const MILESTONES = [10, 50, 100, 250, 500];

export const castVote = createServerFn({ method: "POST" })
  .inputValidator((d: { issueId: string; deviceId: string; choice: string }) => {
    if (!d.issueId || !d.deviceId) throw new Error("Missing fields");
    if (!STANCES.has(d.choice)) throw new Error("Invalid choice");
    if (d.deviceId.length > 128) throw new Error("Invalid device id");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reject votes on topics that have closed.
    const { data: openCheck } = await supabaseAdmin
      .from("issues")
      .select("status, closes_at")
      .eq("id", data.issueId)
      .maybeSingle();
    const closesAt = (openCheck as { closes_at?: string | null } | null)?.closes_at;
    if (
      openCheck?.status === "closed" ||
      (closesAt && new Date(closesAt).getTime() < Date.now())
    ) {
      throw new Error("Voting on this topic has closed.");
    }

    const { error } = await supabaseAdmin
      .from("votes")
      .upsert(
        { issue_id: data.issueId, device_id: data.deviceId, choice: data.choice },
        { onConflict: "issue_id,device_id" },
      );
    if (error) throw new Error(error.message);

    // Reward the submitter of a youth-submitted topic as engagement milestones hit.
    const { data: issue } = await supabaseAdmin
      .from("issues")
      .select("source, submitted_by_device")
      .eq("id", data.issueId)
      .maybeSingle();
    if (issue?.source === "user" && issue.submitted_by_device) {
      const { count } = await supabaseAdmin
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("issue_id", data.issueId);
      const total = count ?? 0;
      if (MILESTONES.includes(total)) {
        const action = total >= 100 ? "idea_100_votes" : "idea_submitted";
        const points = total >= 100 ? 50 : 5;
        await supabaseAdmin.from("impact_events").insert({
          device_id: issue.submitted_by_device,
          action,
          points,
          ref_type: "issue_milestone",
          ref_id: `${data.issueId}:${total}`,
        });
      }
    }

    return { ok: true };
  });
