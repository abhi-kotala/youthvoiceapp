import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_comments",
  title: "List debate comments",
  description:
    "List visible (non-hidden) debate comments for a specific issue on Youth Voice. Returns each comment's stance, body, display name, and timestamp.",
  inputSchema: {
    issue_id: z.string().uuid().describe("Issue UUID."),
    limit: z.number().int().min(1).max(200).optional().describe("Max results (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ issue_id, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("comments")
      .select("id, stance, body, display_name, created_at")
      .eq("issue_id", issue_id)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(limit ?? 100);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { comments: data },
    };
  },
});
