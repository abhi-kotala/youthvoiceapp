import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function validateDeviceId(deviceId: string) {
  if (!deviceId || deviceId.length > 128) throw new Error("Invalid device id");
  return deviceId;
}

function cleanDisplayName(displayName: string) {
  const value = displayName.trim();
  if (value.length < 1 || value.length > 40) {
    throw new Error("Display name must be 1–40 characters");
  }
  return value;
}

export const connectCurrentDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { deviceId: string; displayName?: string }) => ({
    deviceId: validateDeviceId(data.deviceId),
    displayName: data.displayName?.trim() || undefined,
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("account_devices")
      .select("user_id")
      .eq("device_id", data.deviceId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (existing && existing.user_id !== context.userId) {
      throw new Error("This device is already connected to another account.");
    }
    if (!existing) {
      const { error } = await supabaseAdmin.from("account_devices").insert({
        device_id: data.deviceId,
        user_id: context.userId,
      });
      if (error) throw new Error(error.message);
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile && data.displayName) {
      const { error } = await context.supabase.from("profiles").insert({
        user_id: context.userId,
        display_name: cleanDisplayName(data.displayName),
      });
      if (error) throw new Error(error.message);
    }
    return { connected: true };
  });

export const getAccountProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateAccountProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { displayName: string }) => ({
    displayName: cleanDisplayName(data.displayName),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").upsert({
      user_id: context.userId,
      display_name: data.displayName,
    });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const getAccountImpact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: devices, error: deviceError } = await supabaseAdmin
      .from("account_devices")
      .select("device_id")
      .eq("user_id", context.userId);
    if (deviceError) throw new Error(deviceError.message);
    const deviceIds = (devices ?? []).map((row) => row.device_id);
    if (deviceIds.length === 0) return { points: 0, counts: {}, eventCount: 0 };
    const { data: rows, error } = await supabaseAdmin
      .from("impact_events")
      .select("action, points")
      .in("device_id", deviceIds);
    if (error) throw new Error(error.message);
    const events = rows ?? [];
    const counts: Record<string, number> = {};
    let points = 0;
    for (const row of events) {
      points += row.points;
      counts[row.action] = (counts[row.action] ?? 0) + 1;
    }
    return { points, counts, eventCount: events.length };
  });