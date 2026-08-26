import { createServerFn } from "@tanstack/react-start";

/**
 * Aggregate participation stats. Device identifiers never leave the server —
 * only anonymous counts are returned to the browser.
 */
export const getParticipationStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [issuesRes, votesRes, commentsRes] = await Promise.all([
    supabaseAdmin.from("issues").select("id, city"),
    supabaseAdmin.from("votes").select("issue_id, device_id"),
    supabaseAdmin.from("comments").select("issue_id, device_id").eq("hidden", false),
  ]);

  const cityOf = new Map(
    ((issuesRes.data ?? []) as { id: string; city: string | null }[]).map((i) => [i.id, i.city]),
  );
  const devices = new Set<string>();
  const perCity: Record<string, Set<string>> = {};

  const track = (rows: { issue_id: string; device_id: string }[]) => {
    rows.forEach((r) => {
      devices.add(r.device_id);
      const c = cityOf.get(r.issue_id);
      if (c) (perCity[c] ??= new Set()).add(r.device_id);
    });
  };

  track((votesRes.data ?? []) as { issue_id: string; device_id: string }[]);
  track((commentsRes.data ?? []) as { issue_id: string; device_id: string }[]);

  return {
    participants: devices.size,
    cityDevices: Object.fromEntries(
      Object.entries(perCity).map(([k, v]) => [k, v.size]),
    ) as Record<string, number>,
  };
});
