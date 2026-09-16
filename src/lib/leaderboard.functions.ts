import { createServerFn } from "@tanstack/react-start";
import { streakFromTimestamps } from "./impact";

function validDevice(id: string) {
  return typeof id === "string" && id.length > 0 && id.length <= 128;
}

type EventRow = { device_id: string; points: number; created_at: string };

/**
 * Public leaderboard. Only accounts with a profile appear (anonymous device-only
 * participants stay out of the ranking). No device ids are ever returned.
 */
export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: links, error: linkError } = await supabaseAdmin
    .from("account_devices")
    .select("device_id, user_id");
  if (linkError) throw new Error(linkError.message);
  const deviceToUser = new Map<string, string>();
  for (const row of links ?? []) deviceToUser.set(row.device_id, row.user_id);
  if (deviceToUser.size === 0) return { entries: [] as LeaderboardEntry[] };

  const { data: events, error: eventError } = await supabaseAdmin
    .from("impact_events")
    .select("device_id, points, created_at")
    .in("device_id", [...deviceToUser.keys()]);
  if (eventError) throw new Error(eventError.message);

  const byUser = new Map<string, { points: number; days: string[] }>();
  for (const row of (events ?? []) as EventRow[]) {
    const userId = deviceToUser.get(row.device_id);
    if (!userId) continue;
    const entry = byUser.get(userId) ?? { points: 0, days: [] };
    entry.points += row.points;
    entry.days.push(row.created_at);
    byUser.set(userId, entry);
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("user_id, display_name, handle, avatar_url");
  if (profileError) throw new Error(profileError.message);

  const ranked = (profiles ?? [])
    .map((p) => {
      const agg = byUser.get(p.user_id) ?? { points: 0, days: [] };
      return {
        userId: p.user_id,
        displayName: p.display_name,
        handle: p.handle,
        avatarPath: p.avatar_url,
        points: agg.points,
        streak: streakFromTimestamps(agg.days),
      };
    })
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))
    .slice(0, 25);

  const paths = ranked.map((r) => r.avatarPath).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrls(paths, 60 * 60 * 24 * 7);
    for (const u of urls ?? []) {
      if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
  }

  return {
    entries: ranked.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      displayName: r.displayName,
      handle: r.handle,
      avatarUrl: r.avatarPath ? signed.get(r.avatarPath) ?? null : null,
      points: r.points,
      streak: r.streak,
    })) as LeaderboardEntry[],
  };
});

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  points: number;
  streak: number;
};

/** Streak for the current device (anonymous participants). */
export const getDeviceStreak = createServerFn({ method: "POST" })
  .inputValidator((d: { deviceId: string }) => {
    if (!validDevice(d.deviceId)) throw new Error("Invalid device id");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("impact_events")
      .select("created_at")
      .eq("device_id", data.deviceId);
    if (error) throw new Error(error.message);
    return { streak: streakFromTimestamps((rows ?? []).map((r) => r.created_at)) };
  });
