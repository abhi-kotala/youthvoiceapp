import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "get_issue",
  title: "Get issue with poll results",
  description:
    "Fetch one civic issue by id, along with its aggregated poll tallies (agree, disagree, neutral).",
  inputSchema: {
    issue_id: z.string().uuid().describe("Issue UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ issue_id }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const [issueRes, votesRes] = await Promise.all([
      supabase
        .from("issues")
        .select("id, title, description, category, status, city, created_at")
        .eq("id", issue_id)
        .maybeSingle(),
      supabase.from("votes").select("choice").eq("issue_id", issue_id),
    ]);
    if (issueRes.error) {
      return { content: [{ type: "text", text: issueRes.error.message }], isError: true };
    }
    if (!issueRes.data) {
      return { content: [{ type: "text", text: "Issue not found." }], isError: true };
    }
    const tallies: Record<string, number> = {};
    for (const v of votesRes.data ?? []) {
      tallies[v.choice] = (tallies[v.choice] ?? 0) + 1;
    }
    const total = (votesRes.data ?? []).length;
    const payload = { issue: issueRes.data, tallies, total_votes: total };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
