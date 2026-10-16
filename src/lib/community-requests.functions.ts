import { createServerFn } from "@tanstack/react-start";

export const STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;
const ROLES = new Set(["student", "teacher", "parent", "youth_org", "city_staff", "other"]);

export type CityRequestInput = {
  cityName: string;
  stateCode: string;
  requesterRole: string;
  organization?: string;
  contactEmail: string;
  message?: string;
};

export function validateCityRequest(d: CityRequestInput) {
  const cityName = (d.cityName ?? "").trim();
  if (cityName.length < 2 || cityName.length > 80) throw new Error("Enter a city name.");
  if (!(STATE_CODES as readonly string[]).includes(d.stateCode)) throw new Error("Pick a state.");
  if (!ROLES.has(d.requesterRole)) throw new Error("Pick who you are.");
  const contactEmail = (d.contactEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 200)
    throw new Error("Enter a valid email.");
  return {
    cityName,
    stateCode: d.stateCode,
    requesterRole: d.requesterRole,
    organization: (d.organization ?? "").trim().slice(0, 120) || null,
    contactEmail,
    message: (d.message ?? "").trim().slice(0, 1000) || null,
  };
}

export const submitCityRequest = createServerFn({ method: "POST" })
  .inputValidator(validateCityRequest)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await supabaseAdmin
      .from("community_requests")
      .select("id", { count: "exact", head: true })
      .eq("contact_email", data.contactEmail)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("You've sent several requests today — we'll review them soon.");
    if (data.message) {
      const { moderateText } = await import("@/lib/moderation.server");
      const check = await moderateText(data.message, "topic");
      if (!check.allowed) throw new Error(check.reason || "Please rephrase your message.");
    }
    const { error } = await supabaseAdmin.from("community_requests").insert({
      city_name: data.cityName,
      state_code: data.stateCode,
      requester_role: data.requesterRole,
      organization: data.organization,
      contact_email: data.contactEmail,
      message: data.message,
    });
    if (error) throw new Error("Couldn't send your request. Try again.");
    return { ok: true };
  });
