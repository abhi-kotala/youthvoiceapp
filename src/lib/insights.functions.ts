import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCategory, type Category } from "@/lib/categories";
import type { CityStatus } from "@/lib/cities";

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

export type PublishedResult =
  | { published: false }
  | { published: true; total: number; agree: number; disagree: number; neutral: number };

export type InsightQuestion = {
  id: string;
  title: string;
  category: Category;
  open: boolean;
  created_at: string;
  closes_at: string | null;
  community: { id: string; slug: string; name: string; state_code: string; status: CityStatus };
  result: PublishedResult;
};

/**
 * Aggregated, suppressed civic insights. Only questions in public communities (RLS)
 * are included, and vote counts are returned only for questions at or above the
 * city's minimum. Every total is a sum of already-published results, so no filter
 * can reveal a hidden count.
 */
export const getInsights = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ data: comms }, { data: states }, { data: issues }] = await Promise.all([
    sb.from("communities").select("id, slug, name, state_code, status, min_votes_for_results"),
    sb.from("states").select("code, name").order("name"),
    sb.from("issues").select("id, title, category, status, closes_at, created_at, community_id").not("community_id", "is", null).limit(2000),
  ]);
  const cmap = new Map((comms ?? []).map((c) => [c.id, c]));
  const ids = (issues ?? []).filter((i) => cmap.has(i.community_id!)).map((i) => i.id);
  const tallies = new Map<string, { agree: number; disagree: number; neutral: number }>();
  for (let k = 0; k < ids.length; k += 200) {
    const { data: votes } = await sb.from("votes").select("issue_id, choice").in("issue_id", ids.slice(k, k + 200)).limit(100000);
    for (const v of votes ?? []) {
      const t = tallies.get(v.issue_id) ?? { agree: 0, disagree: 0, neutral: 0 };
      if (v.choice === "agree" || v.choice === "disagree" || v.choice === "neutral") t[v.choice] += 1;
      tallies.set(v.issue_id, t);
    }
  }
  const now = Date.now();
  const questions: InsightQuestion[] = (issues ?? [])
    .filter((i) => cmap.has(i.community_id!))
    .map((i) => {
      const c = cmap.get(i.community_id!)!;
      const t = tallies.get(i.id) ?? { agree: 0, disagree: 0, neutral: 0 };
      const total = t.agree + t.disagree + t.neutral;
      const min = Math.max(1, c.min_votes_for_results ?? 10);
      const open = i.status !== "closed" && (!i.closes_at || new Date(i.closes_at).getTime() > now);
      return {
        id: i.id,
        title: i.title,
        category: normalizeCategory(i.category),
        open,
        created_at: i.created_at,
        closes_at: i.closes_at,
        community: { id: c.id, slug: c.slug, name: c.name, state_code: c.state_code, status: c.status as CityStatus },
        result: total >= min ? { published: true as const, total, ...t } : { published: false as const },
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const communities = (comms ?? []).map((c) => ({
    id: c.id, slug: c.slug, name: c.name, state_code: c.state_code, status: c.status as CityStatus,
  }));
  return { questions, communities, states: states ?? [], generatedAt: new Date().toISOString() };
});
