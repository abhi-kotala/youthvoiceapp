import { createServerFn } from "@tanstack/react-start";

type PostCommentInput = {
  issueId: string;
  deviceId: string;
  displayName: string;
  stance: string;
  body: string;
};

const STANCES = new Set(["agree", "disagree", "neutral"]);

export const postComment = createServerFn({ method: "POST" })
  .inputValidator((d: PostCommentInput) => {
    if (!d.issueId) throw new Error("Missing issue");
    if (!d.deviceId || d.deviceId.length > 128) throw new Error("Invalid device id");
    if (!STANCES.has(d.stance)) throw new Error("Invalid stance");
    const body = (d.body ?? "").trim();
    if (body.length < 2 || body.length > 2000)
      throw new Error("Comment must be 2–2000 characters");
    const displayName = (d.displayName ?? "").trim().slice(0, 40) || "Anonymous";
    return { ...d, body, displayName };
  })
  .handler(async ({ data }) => {
    const { moderateText } = await import("@/lib/moderation.server");
    const check = await moderateText(`${data.displayName}\n${data.body}`, "comment");
    if (!check.allowed) {
      throw new Error(check.reason || "This post isn't allowed here.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("comments")
      .insert({
        issue_id: data.issueId,
        device_id: data.deviceId,
        display_name: data.displayName,
        stance: data.stance,
        body: data.body,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });
