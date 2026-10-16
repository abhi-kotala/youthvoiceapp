import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { suppressTally, parseCityKey, type CityStatus } from "@/lib/cities";

/** Public client: every read goes through RLS as the anon role. */
function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: key.startsWith("sb_")
      ? {
          fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        }
      : undefined,
  });
}

function isOpen(i: { status: string; closes_at: string | null }) {
  if (i.status === "closed") return false;
  return !i.closes_at || new Date(i.closes_at).getTime() > Date.now();
}

export type DirectoryCity = {
  id: string;
  slug: string;
  name: string;
  state_code: string;
  state_name: string;
  status: CityStatus;
  activePolls: number;
  categories: string[];
};

export const listCities = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ data: cities, error }, { data: states }, { data: issues }] = await Promise.all([
    sb.from("communities").select("id, slug, name, state_code, status, zip_codes").order("name"),
    sb.from("states").select("code, name").order("name"),
    sb.from("issues").select("community_id, category, status, closes_at"),
  ]);
  if (error) throw new Error("Could not load communities");
  const stateName = new Map((states ?? []).map((s) => [s.code, s.name]));
  const out = (cities ?? []).map((c) => {
    const mine = (issues ?? []).filter((i) => i.community_id === c.id && isOpen(i));
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      state_code: c.state_code,
      state_name: stateName.get(c.state_code) ?? c.state_code,
      status: c.status as CityStatus,
      zip_codes: c.zip_codes ?? [],
      activePolls: mine.length,
      categories: [...new Set(mine.map((i) => i.category))].sort(),
    };
  });
  return { cities: out, states: states ?? [] };
});

export const getCityPage = createServerFn({ method: "GET" })
  .inputValidator((d: { key: string }) => {
    if (!parseCityKey(d.key)) throw new Error("Invalid city");
    return d;
  })
  .handler(async ({ data }) => {
    const p = parseCityKey(data.key)!;
    const sb = publicClient();
    const { data: city } = await sb
      .from("communities")
      .select("id, slug, name, state_code, status, description, resources, min_votes_for_results, approved_at")
      .eq("slug", p.slug)
      .eq("state_code", p.state)
      .maybeSingle();
    if (!city) return { city: null };
    const [{ data: st }, { data: issues }] = await Promise.all([
      sb.from("states").select("name").eq("code", city.state_code).maybeSingle(),
      sb
        .from("issues")
        .select("id, title, description, category, status, closes_at, created_at")
        .eq("community_id", city.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    const ids = (issues ?? []).map((i) => i.id);
    const tallies = new Map<string, { agree: number; disagree: number; neutral: number }>();
    if (ids.length) {
      const { data: votes } = await sb.from("votes").select("issue_id, choice").in("issue_id", ids);
      for (const v of votes ?? []) {
        const t = tallies.get(v.issue_id) ?? { agree: 0, disagree: 0, neutral: 0 };
        if (v.choice === "agree" || v.choice === "disagree" || v.choice === "neutral") t[v.choice] += 1;
        tallies.set(v.issue_id, t);
      }
    }
    const min = city.min_votes_for_results ?? 10;
    const rows = (issues ?? []).map((i) => ({
      ...i,
      open: isOpen(i),
      result: suppressTally(tallies.get(i.id) ?? { agree: 0, disagree: 0, neutral: 0 }, min),
    }));
    const resources = Array.isArray(city.resources)
      ? (city.resources as { label: string; url: string }[]).filter(
          (r) => r && typeof r.url === "string" && /^https:\/\//.test(r.url),
        )
      : [];
    return {
      city: { ...city, status: city.status as CityStatus, state_name: st?.name ?? city.state_code, resources },
      active: rows.filter((r) => r.open),
      closed: rows.filter((r) => !r.open),
      minVotes: min,
    };
  });

/** Which of these topics has this device already voted on? Returns ids only. */
export const getMyVotedIssues = createServerFn({ method: "POST" })
  .inputValidator((d: { deviceId: string; issueIds: string[] }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.deviceId)) throw new Error("Invalid device");
    return { deviceId: d.deviceId, issueIds: d.issueIds.slice(0, 100) };
  })
  .handler(async ({ data }) => {
    if (!data.issueIds.length) return [] as string[];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("votes")
      .select("issue_id")
      .eq("device_id", data.deviceId)
      .in("issue_id", data.issueIds);
    return (rows ?? []).map((r) => r.issue_id);
  });

/** Signed-in managers of this city (or platform admins). RLS decides. */
export const canManageCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { communityId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("can_manage_community", {
      _user_id: context.userId,
      _community_id: data.communityId,
    });
    return { canManage: !!ok };
  });

export const updateCityInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { communityId: string; description: string; resources: { label: string; url: string }[] }) => {
      if (d.description.length > 600) throw new Error("Description too long");
      if (d.resources.length > 10) throw new Error("Too many links");
      for (const r of d.resources) {
        if (!/^https:\/\/[^\s]+$/.test(r.url) || !r.label.trim() || r.label.length > 80)
          throw new Error("Each link needs a label and an https:// address");
      }
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    // RLS: only managers of this community can update; column grants limit fields.
    const { data: rows, error } = await context.supabase
      .from("communities")
      .update({ description: data.description.trim(), resources: data.resources })
      .eq("id", data.communityId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error("You can't edit this city");
    return { ok: true };
  });
