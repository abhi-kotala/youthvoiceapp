import { createServerFn } from "@tanstack/react-start";

const STANCES = new Set(["agree", "disagree", "neutral"]);

export const castVote = createServerFn({ method: "POST" })
  .inputValidator((d: { issueId: string; deviceId: string; choice: string }) => {
    if (!d.issueId || !d.deviceId) throw new Error("Missing fields");
    if (!STANCES.has(d.choice)) throw new Error("Invalid choice");
    if (d.deviceId.length > 128) throw new Error("Invalid device id");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("votes")
      .upsert(
        { issue_id: data.issueId, device_id: data.deviceId, choice: data.choice },
        { onConflict: "issue_id,device_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
