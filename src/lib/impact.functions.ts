import { createServerFn } from "@tanstack/react-start";
import { POINTS, type ImpactAction } from "./impact";

const ACTIONS = new Set<ImpactAction>([
  "vote",
  "comment",
  "constructive_comment",
  "idea_submitted",
  "idea_100_votes",
  "idea_reviewed",
  "idea_implemented",
]);

function validDevice(id: string) {
  return typeof id === "string" && id.length > 0 && id.length <= 128;
}

export const awardImpact = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { deviceId: string; action: ImpactAction; refType?: string; refId?: string }) => {
      if (!validDevice(d.deviceId)) throw new Error("Invalid device id");
      if (!ACTIONS.has(d.action)) throw new Error("Invalid action");
      return d;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const points = POINTS[data.action];
    // Idempotent: unique index on (device_id, action, ref_type, ref_id) blocks duplicates.
    const { error } = await supabaseAdmin
      .from("impact_events")
      .insert({
        device_id: data.deviceId,
        action: data.action,
        points,
        ref_type: data.refType ?? null,
        ref_id: data.refId ?? null,
      });
    if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
    return { ok: true, points };
  });

export const getMyImpact = createServerFn({ method: "POST" })
  .inputValidator((d: { deviceId: string }) => {
    if (!validDevice(d.deviceId)) throw new Error("Invalid device id");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("impact_events")
      .select("action, points, created_at")
      .eq("device_id", data.deviceId);
    if (error) throw new Error(error.message);
    const events = rows ?? [];
    const points = events.reduce((sum, r: { points: number }) => sum + r.points, 0);
    const counts: Record<string, number> = {};
    for (const r of events as { action: string }[]) {
      counts[r.action] = (counts[r.action] ?? 0) + 1;
    }
    return { points, counts, eventCount: events.length };
  });
