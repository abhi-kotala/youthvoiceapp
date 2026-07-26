import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const generateIssueSummary = createServerFn({ method: "POST" })
  .inputValidator((d: { issueId: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const [{ data: issue }, { data: votes }, { data: comments }] =
      await Promise.all([
        supabaseAdmin
          .from("issues")
          .select("title, description")
          .eq("id", data.issueId)
          .maybeSingle(),
        supabaseAdmin
          .from("votes")
          .select("choice")
          .eq("issue_id", data.issueId),
        supabaseAdmin
          .from("comments")
          .select("stance, body")
          .eq("issue_id", data.issueId)
          .eq("hidden", false)
          .order("created_at", { ascending: false })
          .limit(120),
      ]);

    if (!issue) throw new Error("Issue not found");
    const cmts = comments ?? [];
    if (cmts.length < 3) {
      return {
        summary: null,
        reason: "Need at least 3 comments to summarize.",
      };
    }

    const tally = { agree: 0, disagree: 0, neutral: 0 };
    (votes ?? []).forEach((v) => {
      const c = v.choice as "agree" | "disagree" | "neutral";
      if (tally[c] !== undefined) tally[c] += 1;
    });
    const total = tally.agree + tally.disagree + tally.neutral;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

    const commentBlock = cmts
      .map(
        (c, i) =>
          `${i + 1}. [${c.stance}] ${String(c.body).slice(0, 400)}`,
      )
      .join("\n");

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("openai/gpt-5.4-mini"),
      system:
        "You summarize community debates for youth civic engagement. Be neutral, plain, and concise. Do not invent facts.",
      prompt: `Issue: ${issue.title}\n\nContext: ${issue.description}\n\nVote tally: Agree ${pct(tally.agree)}% (${tally.agree}), Disagree ${pct(tally.disagree)}% (${tally.disagree}), Neutral ${pct(tally.neutral)}% (${tally.neutral}). Total ${total} votes.\n\nComments:\n${commentBlock}\n\nWrite a short summary titled "What Youth Voice users think" with three markdown sections:\n**Main opinions** — 2-3 short sentences.\n**Common concerns** — 2-3 short bullets starting with "- ".\n**Key arguments** — 2-3 short bullets starting with "- ".\nKeep the entire response under 180 words. No preamble.`,
    });

    return { summary: text.trim(), reason: null };
  });
