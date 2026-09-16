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

function cleanHandle(handle: string | null | undefined) {
  const value = (handle ?? "").trim().replace(/^@/, "");
  if (!value) return null;
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
    throw new Error("Handles use 3–20 letters, numbers or underscores.");
  }
  return value;
}

export async function signAvatar(path: string | null | undefined) {
  if (!path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const getAccountProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("display_name, handle, avatar_url, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      display_name: data.display_name,
      handle: data.handle,
      avatar_path: data.avatar_url,
      avatar_url: await signAvatar(data.avatar_url),
      member_since: data.created_at,
    };
  });

export const updateAccountProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { displayName: string; handle?: string | null; avatarPath?: string | null }) => ({
    displayName: cleanDisplayName(data.displayName),
    handle: cleanHandle(data.handle),
    avatarPath: data.avatarPath === undefined ? undefined : data.avatarPath,
  }))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      user_id: context.userId,
      display_name: data.displayName,
      handle: data.handle,
    };
    if (data.avatarPath !== undefined) patch["avatar_url"] = data.avatarPath;
    const { error } = await context.supabase.from("profiles").upsert(patch);
    if (error) {
      if (error.code === "23505") throw new Error("That handle is already taken.");
      throw new Error(error.message);
    }
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