import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_issues",
  title: "List issues",
  description:
    "List public civic issues on Youth Voice. Optionally filter by city (Fargo, West Fargo, Moorhead) or status (open, closed).",
  inputSchema: {
    city: z
      .enum(["Fargo", "West Fargo", "Moorhead"])
      .optional()
      .describe("Filter issues by city."),
    status: z
      .enum(["open", "closed"])
      .optional()
      .describe("Filter issues by status."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, status, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("issues")
      .select("id, title, description, category, status, city, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (city) q = q.eq("city", city);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { issues: data },
    };
  },
});
